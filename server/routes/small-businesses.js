const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const router = express.Router();

// GET /api/small-businesses — search/list small businesses (type=small business users)
// Supports query params: district, category, search
router.get('/', async (req, res) => {
    const { type, district, category, search } = req.query;

    try {
        let query = `SELECT id, email, type, business_name, organization_name, contact_name,
            phone, districts, categories, business_description, certifications,
            years_in_business, capability_statement, created_at
            FROM users WHERE type = 'small_business'`;
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
                FROM users WHERE id = ? AND type = 'small_business'`,
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

        let csPath = rows[0].capability_statement;
        // Handle JSON format (saved from capability-statement.html form)
        if (csPath && csPath.startsWith('{')) {
            try {
                const csData = JSON.parse(csPath);
                csPath = csData.filePath || csData.path || null;
            } catch { csPath = null; }
        }
        if (!csPath || !csPath.startsWith('/uploads/')) {
            return res.status(404).json({ error: 'No capability statement on file' });
        }

        // Robust path: extract filename only, join with known uploads dir
        const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
        const filename = path.basename(csPath);
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            console.error('Capability statement not found. Expected path:', filePath, '| DB path:', csPath);
            return res.status(404).json({ error: 'File not found on server', expected: filePath });
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

        let csPath = rows[0].capability_statement;
        if (csPath && csPath.startsWith('{')) {
            try { csPath = JSON.parse(csPath).filePath || JSON.parse(csPath).path || null; } catch { csPath = null; }
        }

        // Clear the DB record
        await db.execute('UPDATE users SET capability_statement = NULL WHERE id = ?', [id]);

        // Delete the file from disk if it exists
        if (csPath && csPath.startsWith('/uploads/')) {
            const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
            const filePath = path.join(uploadsDir, path.basename(csPath));
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
