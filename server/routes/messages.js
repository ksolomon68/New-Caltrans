const express = require('express');
const { db } = require('../database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Send a message (Contact Form)
router.post('/contact', async (req, res) => {
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

// Send internal message
router.post('/', requireRole('any'), async (req, res) => {
    const { receiverId, opportunityId, subject, body, messageType } = req.body;
    const senderId = req.user.id;
    const senderBusinessName = req.user.business_name || req.user.organization_name || 'User ' + senderId;

    if (!receiverId || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Fetch receiver's business name
        const [receiverRows] = await db.execute('SELECT business_name, organization_name FROM users WHERE id = ?', [receiverId]);
        if (receiverRows.length === 0) return res.status(404).json({ error: 'Receiver not found' });

        const receiverBusinessName = receiverRows[0].business_name || receiverRows[0].organization_name || 'User ' + receiverId;

        // Validate opportunityId — set to null if it doesn't exist in the opportunities table
        let validOpportunityId = null;
        if (opportunityId) {
            const [oppRows] = await db.execute('SELECT id FROM opportunities WHERE id = ?', [opportunityId]);
            if (oppRows.length > 0) validOpportunityId = opportunityId;
        }

        const sql = `
            INSERT INTO messages (sender_id, receiver_id, sender_business_name, receiver_business_name, opportunity_id, message_type, subject, body)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(sql, [
            senderId,
            receiverId,
            senderBusinessName,
            receiverBusinessName,
            validOpportunityId,
            messageType || 'reply',
            subject || null,
            body
        ]);

        // Insert notification
        await db.execute(`
            INSERT INTO notifications (user_id, message_id)
            VALUES (?, ?)
        `, [receiverId, result.insertId]);

        res.status(201).json({ id: result.insertId, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a user (Inbox/Sent)
router.get('/user/:userId', requireRole('any'), async (req, res) => {
    // Ensure user can only fetch their own messages
    if (req.user.id != req.params.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { userId } = req.params;
    const { type } = req.query; // 'inbox' or 'sent'

    try {
        let query = `
            SELECT m.*, o.title as opportunity_title
            FROM messages m
            LEFT JOIN opportunities o ON m.opportunity_id = o.id
            WHERE 
        `;

        if (type === 'sent') {
            query += ' m.sender_id = ?';
        } else {
            query += ' m.receiver_id = ?';
        }

        query += ' ORDER BY m.created_at DESC';

        const [rows] = await db.execute(query, [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark message as read
router.put('/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('UPDATE messages SET is_read = 1 WHERE id = ?', [id]);
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
