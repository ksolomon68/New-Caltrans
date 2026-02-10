const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get all opportunities
router.get('/', (req, res) => {
    try {
        console.log('CaltransBizConnect API: Fetching all opportunities');
        const opportunities = db.prepare('SELECT * FROM opportunities ORDER BY posted_date DESC').all();
        console.log(`CaltransBizConnect API: Found ${opportunities.length} opportunities`);
        res.json(opportunities);
    } catch (error) {
        console.error('CaltransBizConnect API Error fetching opportunities:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get opportunities by agency ID
router.get('/agency/:id', (req, res) => {
    const { id } = req.params;
    try {
        const opportunities = db.prepare('SELECT * FROM opportunities WHERE posted_by = ? ORDER BY posted_date DESC').all(id);
        res.json(opportunities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single opportunity by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'agency' || id === 'saved' || id === 'save' || id === 'unsave') return res.status(404).json({ error: 'Not found' });

    try {
        const opportunity = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(id);
        if (!opportunity) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }
        res.json(opportunity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post new opportunity
router.post('/', (req, res) => {
    const {
        id, title, scopeSummary, district, districtName,
        category, categoryName, subcategory, estimatedValue,
        dueDate, dueTime, submissionMethod, postedBy, status, attachments,
        duration, requirements, certifications, experience
    } = req.body;

    if (!id || !title || !scopeSummary || !postedBy) {
        return res.status(400).json({ error: 'Missing required fields: id, title, scopeSummary, and postedBy are mandatory.' });
    }

    // Validate postedBy user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(postedBy);
    if (!user) {
        return res.status(400).json({ error: 'Invalid postedBy User ID' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO opportunities (
                id, title, scope_summary, district, district_name, 
                category, category_name, subcategory, estimated_value, 
                due_date, due_time, submission_method, status, posted_by, attachments,
                duration, requirements, certifications, experience
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id, title, scopeSummary, district, districtName,
            category, categoryName, subcategory || null, estimatedValue || null,
            dueDate || null, dueTime || null, submissionMethod || null,
            status || 'published', postedBy || null, attachments ? JSON.stringify(attachments) : null,
            duration || null, requirements || null, certifications || null, experience || null
        );

        const actualStatus = status || 'published';
        res.status(201).json({ id, title, status: actualStatus });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Approve opportunity (Admin only)
router.post('/:id/approve', (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare('UPDATE opportunities SET status = ? WHERE id = ?');
        const result = stmt.run('published', id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        res.json({ id, status: 'published' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update opportunity
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        title, scopeSummary, district, districtName,
        category, categoryName, subcategory, estimatedValue,
        dueDate, dueTime, submissionMethod, status, attachments,
        duration, requirements, certifications, experience
    } = req.body;

    try {
        const stmt = db.prepare(`
            UPDATE opportunities SET 
                title = ?, scope_summary = ?, district = ?, district_name = ?, 
                category = ?, category_name = ?, subcategory = ?, estimated_value = ?, 
                due_date = ?, due_time = ?, submission_method = ?, status = ?, attachments = ?,
                duration = ?, requirements = ?, certifications = ?, experience = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            title, scopeSummary, district, districtName,
            category, categoryName, subcategory || null, estimatedValue || null,
            dueDate || null, dueTime || null, submissionMethod || null,
            status || 'published', attachments ? JSON.stringify(attachments) : null,
            duration || null, requirements || null, certifications || null, experience || null,
            id
        );

        res.json({ id, title, status: status || 'published' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete opportunity
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    try {
        const stmt = db.prepare('DELETE FROM opportunities WHERE id = ?');
        const result = stmt.run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Opportunity not found' });
        }

        res.json({ message: 'Opportunity deleted successfully', id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Saved Opportunities Endpoints ---

// Get saved opportunities for a vendor
router.get('/saved/:vendorId', (req, res) => {
    const { vendorId } = req.params;
    try {
        const saved = db.prepare(`
            SELECT o.* FROM opportunities o
            JOIN saved_opportunities s ON o.id = s.opportunity_id
            WHERE s.vendor_id = ?
            ORDER BY s.saved_at DESC
        `).all(vendorId);
        res.json(saved);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save an opportunity
router.post('/save', (req, res) => {
    const { vendorId, opportunityId } = req.body;
    if (!vendorId || !opportunityId) {
        return res.status(400).json({ error: 'Vendor ID and Opportunity ID are required' });
    }
    try {
        const stmt = db.prepare(`
            INSERT OR IGNORE INTO saved_opportunities (vendor_id, opportunity_id)
            VALUES (?, ?)
        `);
        stmt.run(vendorId, opportunityId);
        res.status(201).json({ message: 'Opportunity saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unsave an opportunity
router.post('/unsave', (req, res) => {
    const { vendorId, opportunityId } = req.body;
    if (!vendorId || !opportunityId) {
        return res.status(400).json({ error: 'Vendor ID and Opportunity ID are required' });
    }
    try {
        const stmt = db.prepare(`
            DELETE FROM saved_opportunities 
            WHERE vendor_id = ? AND opportunity_id = ?
        `);
        stmt.run(vendorId, opportunityId);
        res.status(200).json({ message: 'Opportunity unsaved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Unsave an opportunity
router.delete('/unsave/:vendorId/:opportunityId', (req, res) => {
    const { vendorId, opportunityId } = req.params;
    try {
        const stmt = db.prepare('DELETE FROM saved_opportunities WHERE vendor_id = ? AND opportunity_id = ?');
        const result = stmt.run(vendorId, opportunityId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Saved opportunity not found' });
        }
        res.json({ message: 'Opportunity removed from saved list' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
