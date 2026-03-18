const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get application by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.*, o.title as opportunity_title, o.category, o.district as district_id, o.category_name as project_type,
                   u.organization_name as agency_name, v.business_name as vendor_name, v.email as vendor_email
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            JOIN users v ON a.vendor_id = v.id
            WHERE a.id = ?
        `, [id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Application not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get applications (filtered by vendor or agency)
router.get('/', async (req, res) => {
    const { vendorId, agencyId } = req.query;

    try {
        let query = `
            SELECT a.*, o.title as project_title, o.district_name, u.organization_name as agency_name, v.business_name as vendor_name
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            JOIN users v ON a.vendor_id = v.id
            WHERE 1=1
        `;
        const params = [];

        if (vendorId) {
            query += " AND a.vendor_id = ?";
            params.push(vendorId);
        }

        if (agencyId) {
            query += " AND a.agency_id = ?";
            params.push(agencyId);
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
    const { opportunityId, vendorId, notes } = req.body;

    if (!opportunityId || !vendorId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Find agency ID from opportunity
        const [oppRows] = await db.execute('SELECT posted_by FROM opportunities WHERE id = ?', [opportunityId]);
        if (oppRows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });

        const opp = oppRows[0];

        const sql = `
            INSERT INTO applications (opportunity_id, vendor_id, agency_id, notes)
            VALUES (?, ?, ?, ?)
        `;

        await db.execute(sql, [opportunityId, vendorId, opp.posted_by, notes || null]);
        res.status(201).json({ message: 'Interest submitted successfully' });
    } catch (error) {
        console.error('Error submitting application:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Already applied' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get applications for a specific opportunity (Agency view)
router.get('/opportunity/:opportunityId', async (req, res) => {
    const { opportunityId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.id as application_id, a.applied_date, a.status, a.notes,
                   u.id as vendor_id, u.business_name, u.email, u.phone, u.contact_name,
                   u.districts, u.categories, u.capability_statement
            FROM applications a
            JOIN users u ON a.vendor_id = u.id
            WHERE a.opportunity_id = ?
            ORDER BY a.applied_date DESC
        `, [opportunityId]);

        // Parse JSON fields for vendors
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

// Get applications for a specific vendor
router.get('/vendor/:vendorId', async (req, res) => {
    const { vendorId } = req.params;
    try {
        const [rows] = await db.execute(`
            SELECT a.*, o.title as project_title, o.district_name, u.organization_name as agency_name
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            WHERE a.vendor_id = ?
            ORDER BY a.applied_date DESC
        `, [vendorId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching applications for vendor:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
