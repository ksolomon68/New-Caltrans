const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Send a message
router.post('/contact', (req, res) => {
    const { name, email, subject, message, issueType, pageUrl } = req.body;

    // Log to console to simulate email delivery
    console.log('--- [EMAIL_TO: k.solomon@live.com] ---');
    console.log('From:', name, `<${email}>`);
    console.log('Subject:', subject || `Issue Report: ${issueType}`);
    if (pageUrl) console.log('Page URL:', pageUrl);
    console.log('Body:', message);
    console.log('----------------------------------------');

    res.json({ message: 'Contact form submitted successfully' });
});

router.post('/', (req, res) => {
    const { senderId, receiverId, opportunityId, subject, body } = req.body;

    if (!senderId || !receiverId || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO messages (sender_id, receiver_id, opportunity_id, subject, body)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(senderId, receiverId, opportunityId || null, subject || null, body);
        res.status(201).json({ id: result.lastInsertRowid, message: 'Message sent successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a user (Inbox/Sent)
router.get('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const { type } = req.query; // 'inbox' or 'sent'

    try {
        let query = `
            SELECT m.*, s.business_name as sender_name, r.business_name as receiver_name, o.title as opportunity_title
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.receiver_id = r.id
            LEFT JOIN opportunities o ON m.opportunity_id = o.id
            WHERE 
        `;

        if (type === 'sent') {
            query += ' m.sender_id = ?';
        } else {
            query += ' m.receiver_id = ?';
        }

        query += ' ORDER BY m.created_at DESC';

        const messages = db.prepare(query).all(userId);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark message as read
router.put('/:id/read', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE messages SET is_read = 1 WHERE id = ?').run(id);
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
