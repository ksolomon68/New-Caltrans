const express = require('express');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const router = express.Router();

// GET /api/vendors/:id/capability-statement — serve the PDF
router.get('/:id/capability-statement', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT capability_statement FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

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

// DELETE /api/vendors/:id/capability-statement — remove the record (and optionally the file)
router.delete('/:id/capability-statement', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT capability_statement FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

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
