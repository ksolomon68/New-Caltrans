const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const router = express.Router();

// GET /api/small-businesses — search/list small businesses (type=vendor users)
// Supports query params: district, category, search
router.get('/', async (req, res) => {
    const { type, district, category, search } = req.query;

    try {
        let query = `SELECT id, email, type, business_name, organization_name, contact_name,
            phone, districts, categories, business_description, certifications,
            years_in_business, capability_statement, created_at
            FROM users WHERE type = 'vendor'`;
        const params = [];

        if (district) {
            query += " AND districts LIKE ?";
            params.push(`%${district}%`);
        }
        if (category) {
            query += " AND categories LIKE ?";
            params.push(`%${category}%`);
        }
        if (search) {
            query += " AND (business_name LIKE ? OR organization_name LIKE ? OR email LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += " ORDER BY created_at DESC LIMIT 100";

        const [rows] = await db.execute(query, params);

        const smallBusinesses = rows.map(user => {
            let districts = [], categories = [];
            try {
                districts  = user.districts  ? (typeof user.districts  === 'string' && user.districts.startsWith('[')  ? JSON.parse(user.districts)  : [user.districts])  : [];
                categories = user.categories ? (typeof user.categories === 'string' && user.categories.startsWith('[') ? JSON.parse(user.categories) : [user.categories]) : [];
            } catch {
                districts  = user.districts  ? [user.districts]  : [];
                categories = user.categories ? [user.categories] : [];
            }
            return { ...user, districts, categories };
        });

        res.json(smallBusinesses);
    } catch (error) {
        console.error('Error fetching small businesses:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/small-businesses/:id — fetch a single small business profile by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.execute(
            `SELECT id, email, type, business_name, organization_name, contact_name,
                phone, address, districts, categories, business_description, certifications,
                years_in_business, capability_statement, created_at, website
                FROM users WHERE id = ? AND type = 'vendor'`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Small Business not found' });
        }

        const user = rows[0];
        let districts = [], categories = [];
        try {
            districts  = user.districts  ? (typeof user.districts  === 'string' && user.districts.startsWith('[')  ? JSON.parse(user.districts)  : [user.districts])  : [];
            categories = user.categories ? (typeof user.categories === 'string' && user.categories.startsWith('[') ? JSON.parse(user.categories) : [user.categories]) : [];
        } catch {
            districts  = user.districts  ? [user.districts]  : [];
            categories = user.categories ? [user.categories] : [];
        }

        res.json({ ...user, districts, categories });
    } catch (error) {
        console.error('Error fetching small business profile:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/small-businesses/:id/capability-statement — serve the PDF
router.get('/:id/capability-statement', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT capability_statement FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Small Business not found' });

        const csPath = rows[0].capability_statement;
        if (!csPath || !csPath.startsWith('/uploads/')) {
            return res.status(404).json({ error: 'No capability statement on file' });
        }

        const filePath = path.join(__dirname, '../../', csPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="capability-statement.pdf"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error serving capability statement:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/small-businesses/:id/capability-statement — remove the record (and optionally the file)
router.delete('/:id/capability-statement', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT capability_statement FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Small Business not found' });

        const csPath = rows[0].capability_statement;

        // Clear the DB record
        await db.execute('UPDATE users SET capability_statement = NULL WHERE id = ?', [id]);

        // Delete the file from disk if it exists
        if (csPath && csPath.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '../../', csPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing capability statement:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
