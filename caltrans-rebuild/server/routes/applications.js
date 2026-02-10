const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get application by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    try {
        const application = db.prepare(`
            SELECT a.*, o.title as opportunity_title, o.category, o.district_id, o.type as project_type,
                   u.organization_name as agency_name, v.business_name as vendor_name, v.email as vendor_email
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            JOIN users v ON a.vendor_id = v.id
            WHERE a.id = ?
        `).get(id);

        if (!application) return res.status(404).json({ error: 'Application not found' });
        res.json(application);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications (filtered by vendor or agency)
router.get('/', (req, res) => {
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

        const applications = db.prepare(query).all(params);
        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Submit new application / interest
router.post('/', (req, res) => {
    const { opportunityId, vendorId, notes } = req.body;

    if (!opportunityId || !vendorId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Find agency ID from opportunity
        const opp = db.prepare('SELECT posted_by FROM opportunities WHERE id = ?').get(opportunityId);
        if (!opp) return res.status(404).json({ error: 'Opportunity not found' });

        const stmt = db.prepare(`
            INSERT INTO applications (opportunity_id, vendor_id, agency_id, notes)
            VALUES (?, ?, ?, ?)
        `);

        stmt.run(opportunityId, vendorId, opp.posted_by, notes || null);
        res.status(201).json({ message: 'Interest submitted successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Already applied' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get applications for a specific opportunity (Agency view)
router.get('/opportunity/:opportunityId', (req, res) => {
    const { opportunityId } = req.params;
    try {
        const applications = db.prepare(`
            SELECT a.id as application_id, a.applied_date, a.status, a.notes,
                   u.id as vendor_id, u.business_name, u.email, u.phone, u.contact_name,
                   u.districts, u.categories, u.capability_statement
            FROM applications a
            JOIN users u ON a.vendor_id = u.id
            WHERE a.opportunity_id = ?
            ORDER BY a.applied_date DESC
        `).all(opportunityId);

        // Parse JSON fields for vendors
        const processed = applications.map(app => ({
            ...app,
            districts: app.districts ? (typeof app.districts === 'string' && app.districts.startsWith('[') ? JSON.parse(app.districts) : [app.districts]) : [],
            categories: app.categories ? (typeof app.categories === 'string' && app.categories.startsWith('[') ? JSON.parse(app.categories) : [app.categories]) : []
        }));

        res.json(processed);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications for a specific vendor
router.get('/vendor/:vendorId', (req, res) => {
    const { vendorId } = req.params;
    try {
        const applications = db.prepare(`
            SELECT a.*, o.title as project_title, o.district_name, u.organization_name as agency_name
            FROM applications a
            JOIN opportunities o ON a.opportunity_id = o.id
            JOIN users u ON o.posted_by = u.id
            WHERE a.vendor_id = ?
            ORDER BY a.applied_date DESC
        `).all(vendorId);
        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
