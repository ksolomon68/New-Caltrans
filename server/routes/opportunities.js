const express = require('express');
const { db } = require('../database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Get all opportunities
router.get('/', async (req, res) => {
    try {
        console.log('CaltransBizConnect API: Fetching all opportunities');
        let query = 'SELECT * FROM opportunities WHERE 1=1';
        const params = [];
        
        const { district, category } = req.query;
        // Filter by district (handle "all" districts)
        if (district && district !== 'all') {
            query += ' AND (district = ? OR district = "all")';
            params.push(district);
        }
        
        // Filter by category
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        query += ' ORDER BY posted_date DESC';
        
        const [rows] = await db.execute(query, params);
        console.log(`CaltransBizConnect API: Found ${rows.length} opportunities`);
        
        // Parse tags from JSON
        rows.forEach(opp => {
            try {
                opp.tags = opp.tags ? JSON.parse(opp.tags) : [];
            } catch(e) { opp.tags = []; }
        });
        
        res.json(rows);
    } catch (error) {
        console.error('CaltransBizConnect API Error fetching opportunities:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get opportunities by prime contractor ID
router.get('/prime-contractor/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT * FROM opportunities WHERE posted_by = ? ORDER BY posted_date DESC', [id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get prime contractor's opportunities with application status for a specific small business
router.get('/prime/:primeId/for-sb/:smallBusinessId', async (req, res) => {
    const { primeId, smallBusinessId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT 
                o.id, o.title, o.status,
                IF(a.id IS NOT NULL, 1, 0) as has_applied
            FROM opportunities o
            LEFT JOIN applications a ON a.opportunity_id = o.id AND a.small_business_id = ?
            WHERE o.posted_by = ?
            ORDER BY o.posted_date DESC
        `, [smallBusinessId, primeId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching prime opportunities for SB:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single opportunity by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    if (id === 'prime_contractor' || id === 'saved' || id === 'save' || id === 'unsave') return res.status(404).json({ error: 'Not found' });

    try {
        const [rows] = await db.execute('SELECT * FROM opportunities WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post new opportunity
router.post('/', requireRole('prime_contractor'), async (req, res) => {
    let {
        id, title, scopeSummary, district, districtName,
        category, categoryName, subcategory, estimatedValue,
        dueDate, dueTime, submissionMethod, postedBy, status, attachments,
        duration, requirements, certifications, experience, description, tags
    } = req.body;

    const oppId = id || `OPP-${Date.now()}`;
    const desc = description || scopeSummary || '';
    
    // Determine status based on due date if not explicitly published
    let calcStatus = status || 'published';
    if (dueDate && calcStatus !== 'published') {
        const due = new Date(dueDate);
        const now = new Date();
        calcStatus = due < now ? 'closed' : 'open';
    }

    if (!title || !district || !category || !estimatedValue || !dueDate || !desc) {
         return res.status(400).json({ error: 'All required fields must be filled' });
    }

    try {
        const uId = postedBy || req.user.id;
        // Validate postedBy user exists
        const [userRows] = await db.execute('SELECT id, business_name, organization_name FROM users WHERE id = ?', [uId]);
        if (userRows.length === 0) {
            return res.status(400).json({ error: 'Invalid postedBy User ID' });
        }
        
        const postedByName = userRows[0].business_name || userRows[0].organization_name || 'Prime Contractor';
        
        // Clean tags - only include non-empty tags
        const cleanTags = tags ? tags.filter(tag => tag && tag.trim()) : [];

        const sql = `
            INSERT INTO opportunities (
                id, title, scope_summary, district, district_name, 
                category, category_name, subcategory, estimated_value, 
                due_date, due_time, submission_method, status, posted_by, attachments,
                duration, requirements, certifications, experience, description, tags, posted_by_name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await db.execute(sql, [
            oppId, title, desc, district, districtName || district,
            category, categoryName || category, subcategory || null, estimatedValue || null,
            dueDate || null, dueTime || null, submissionMethod || null,
            calcStatus, uId, attachments ? JSON.stringify(attachments) : null,
            duration || null, requirements || null, certifications || null, experience || null,
            desc, JSON.stringify(cleanTags), postedByName
        ]);

        res.status(201).json({ id: oppId, success: true, opportunityId: oppId, title, status: calcStatus });
    } catch (error) {
        console.error('Error creating opportunity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Approve opportunity (Admin only)
router.post('/:id/approve', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute('UPDATE opportunities SET status = ? WHERE id = ?', ['published', id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        res.json({ id, status: 'published' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update opportunity
router.put('/:id', requireRole('prime_contractor'), async (req, res) => {
    const { id } = req.params;
    const {
        title, scopeSummary, district, districtName,
        category, categoryName, subcategory, estimatedValue,
        dueDate, dueTime, submissionMethod, status, attachments,
        duration, requirements, certifications, experience
    } = req.body;

    try {
        const sql = `
            UPDATE opportunities SET 
                title = ?, scope_summary = ?, district = ?, district_name = ?, 
                category = ?, category_name = ?, subcategory = ?, estimated_value = ?, 
                due_date = ?, due_time = ?, submission_method = ?, status = ?, attachments = ?,
                duration = ?, requirements = ?, certifications = ?, experience = ?
            WHERE id = ?
        `;

        const [result] = await db.execute(sql, [
            title, scopeSummary, district, districtName,
            category, categoryName, subcategory || null, estimatedValue || null,
            dueDate || null, dueTime || null, submissionMethod || null,
            status || 'published', attachments ? JSON.stringify(attachments) : null,
            duration || null, requirements || null, certifications || null, experience || null,
            id
        ]);

        res.json({ id, title, status: status || 'published' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete opportunity
router.delete('/:id', requireRole('prime_contractor'), async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.execute('DELETE FROM opportunities WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        res.json({ message: 'Opportunity deleted successfully', id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Saved Opportunities Endpoints ---

// Get saved opportunities for a small business
router.get('/saved/:smallBusinessId', async (req, res) => {
    const { smallBusinessId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT o.* FROM opportunities o
            JOIN saved_opportunities s ON o.id = s.opportunity_id
            WHERE s.small_business_id = ?
            ORDER BY s.saved_at DESC
        `, [smallBusinessId]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save an opportunity
router.post('/save', requireRole('small_business'), async (req, res) => {
    const { smallBusinessId, opportunityId } = req.body;
    if (!smallBusinessId || !opportunityId) {
        return res.status(400).json({ error: 'Small Business ID and Opportunity ID are required' });
    }
    try {
        const sql = `
            INSERT IGNORE INTO saved_opportunities (small_business_id, opportunity_id)
            VALUES (?, ?)
        `;
        await db.execute(sql, [smallBusinessId, opportunityId]);
        res.status(201).json({ message: 'Opportunity saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unsave an opportunity
router.post('/unsave', requireRole('small_business'), async (req, res) => {
    const { smallBusinessId, opportunityId } = req.body;
    if (!smallBusinessId || !opportunityId) {
        return res.status(400).json({ error: 'Small Business ID and Opportunity ID are required' });
    }
    try {
        const [result] = await db.execute(`
            DELETE FROM saved_opportunities 
            WHERE small_business_id = ? AND opportunity_id = ?
        `, [smallBusinessId, opportunityId]);
        res.status(200).json({ message: 'Opportunity unsaved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unsave an opportunity (DELETE method)
router.delete('/unsave/:smallBusinessId/:opportunityId', requireRole('small_business'), async (req, res) => {
    const { smallBusinessId, opportunityId } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM saved_opportunities WHERE small_business_id = ? AND opportunity_id = ?', [smallBusinessId, opportunityId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Saved opportunity not found' });
        }
        res.json({ message: 'Opportunity removed from saved list' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Invite Small Business to Apply
router.post('/:id/invite', requireRole('prime_contractor'), async (req, res) => {
    const { id: opportunityId } = req.params;
    const { smallBusinessId, note } = req.body;
    const senderId = req.user.id;
    const senderBusinessName = req.user.business_name || req.user.organization_name || 'Prime Contractor';

    if (!smallBusinessId) {
        return res.status(400).json({ error: 'Small Business ID is required' });
    }

    try {
        // Fetch receiver's business name
        const [sbRows] = await db.execute('SELECT business_name FROM users WHERE id = ? AND type = "small_business"', [smallBusinessId]);
        if (sbRows.length === 0) return res.status(404).json({ error: 'Small Business not found' });
        const receiverBusinessName = sbRows[0].business_name;

        // Fetch opportunity details
        const [oppRows] = await db.execute('SELECT title FROM opportunities WHERE id = ?', [opportunityId]);
        if (oppRows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
        const oppTitle = oppRows[0].title;

        // Check for existing invitation
        const [existingInvites] = await db.execute(
            'SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ? AND opportunity_id = ? AND message_type = "invite"',
            [senderId, smallBusinessId, opportunityId]
        );
        if (existingInvites.length > 0) {
            return res.status(400).json({ error: 'You have already invited this Small Business to this opportunity.' });
        }

        const appUrl = process.env.PUBLIC_URL || 'http://localhost:3001';
        let body = `You've been invited to apply for this opportunity.\n\nOpportunity: ${oppTitle}\n\nPlease review the details and submit your application if it aligns with your interests, or reply to this message if you'd like to discuss further.`;
        
        if (note) {
            body = `${note}\n\n---\n${body}`;
        }
        
        // Insert Message
        const [msgResult] = await db.execute(`
            INSERT INTO messages (sender_id, receiver_id, sender_business_name, receiver_business_name, opportunity_id, message_type, subject, body)
            VALUES (?, ?, ?, ?, ?, 'invite', ?, ?)
        `, [senderId, smallBusinessId, senderBusinessName, receiverBusinessName, opportunityId, `Invitation to Apply: ${oppTitle}`, body]);

        // Insert Notification
        await db.execute(`
            INSERT INTO notifications (user_id, message_id)
            VALUES (?, ?)
        `, [smallBusinessId, msgResult.insertId]);

        res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
