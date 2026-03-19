const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get application by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.*, o.title as opportunity_title, o.category, o.district as district_id, o.category_name as project_type,
                   u.organization_name as prime_contractor_name, v.business_name as business_name, v.email as small_business_email
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            JOIN users v ON a.small_business_id = v.id
            WHERE a.id = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Application not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get applications (filtered by small business or prime contractor)
router.get('/', async (req, res) => {
    const { smallBusinessId, primeContractorId } = req.query;

    try {
        let query = `
            SELECT a.*, o.title as project_title, o.district_name, u.organization_name as prime_contractor_name, v.business_name as business_name
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            JOIN users v ON a.small_business_id = v.id
            WHERE 1=1
        `;
        const params = [];

        if (smallBusinessId) {
            query += " AND a.small_business_id = ?";
            params.push(smallBusinessId);
        }

        if (primeContractorId) {
            query += " AND a.prime_contractor_id = ?";
            params.push(primeContractorId);
        }

        query += " ORDER BY a.applied_date DESC";

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit new application / interest
router.post('/', async (req, res) => {
    const { opportunityId, smallBusinessId, notes } = req.body;

    if (!opportunityId || !smallBusinessId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Find prime contractor ID from opportunity
        const [oppRows] = await db.execute('SELECT posted_by FROM opportunities WHERE id = ?', [opportunityId]);
        if (oppRows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });

        const opp = oppRows[0];

        const sql = `
            INSERT INTO applications (opportunity_id, small_business_id, prime_contractor_id, notes)
            VALUES (?, ?, ?, ?)
        `;

        await db.execute(sql, [opportunityId, smallBusinessId, opp.posted_by, notes || null]);
        res.status(201).json({ message: 'Interest submitted successfully' });
    } catch (error) {
        console.error('Error submitting application:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Already applied' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get applications for a specific opportunity (Prime Contractor view)
router.get('/opportunity/:opportunityId', async (req, res) => {
    const { opportunityId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.id as application_id, a.applied_date, a.status, a.notes,
                   u.id as small_business_id, u.business_name, u.email, u.phone, u.contact_name,
                   u.districts, u.categories, u.capability_statement
            FROM applications a
            JOIN users u ON a.small_business_id = u.id
            WHERE a.opportunity_id = ?
            ORDER BY a.applied_date DESC
        `, [opportunityId]);

        // Parse JSON fields for small businesses
        const processed = rows.map(app => ({
            ...app,
            districts: app.districts ? (typeof app.districts === 'string' && app.districts.startsWith('[') ? JSON.parse(app.districts) : (Array.isArray(app.districts) ? app.districts : [app.districts])) : [],
            categories: app.categories ? (typeof app.categories === 'string' && app.categories.startsWith('[') ? JSON.parse(app.categories) : (Array.isArray(app.categories) ? app.categories : [app.categories])) : []
        }));

        res.json(processed);
    } catch (error) {
        console.error('Error fetching applications for opportunity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get applications for a specific small business
router.get('/small-business/:smallBusinessId', async (req, res) => {
    const { smallBusinessId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.*, o.title as project_title, o.district_name, u.organization_name as prime_contractor_name
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            WHERE a.small_business_id = ?
            ORDER BY a.applied_date DESC
        `, [smallBusinessId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching applications for small business:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update application status (Prime Contractor: approve/decline; Admin: any status)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'under_review', 'approved', 'declined', 'awarded'];
    if (!status || !allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }
    try {
        const [result] = await db.execute(
            'UPDATE applications SET status = ? WHERE id = ?',
            [status, id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Application not found' });
        res.json({ success: true, status });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Withdraw (delete) an application — only allowed while status is 'pending'
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(
            "DELETE FROM applications WHERE id = ? AND status = 'pending'",
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found or cannot be withdrawn (only pending applications can be withdrawn)' });
        }
        res.json({ success: true, message: 'Application withdrawn successfully' });
    } catch (error) {
        console.error('Error withdrawing application:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
