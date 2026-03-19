const express = require('express');
const { db } = require('../database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// Get unread notifications for a user
router.get('/user/:userId', requireRole('any'), async (req, res) => {
    // Ensure user can only fetch their own notifications
    if (req.user.id != req.params.userId) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const [rows] = await db.execute(`
            SELECT n.*, m.subject, m.message_type, m.sender_business_name
            FROM notifications n
            JOIN messages m ON n.message_id = m.id
            WHERE n.user_id = ? AND n.is_read = 0
            ORDER BY n.created_at DESC
        `, [req.params.userId]);
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
router.post('/:id/read', requireRole('any'), async (req, res) => {
    const { id } = req.params;
    
    try {
        // Optional: Ensure the user owns this notification
        const [notifRows] = await db.execute('SELECT user_id FROM notifications WHERE id = ?', [id]);
        if (notifRows.length === 0) return res.status(404).json({ error: 'Notification not found' });
        
        if (notifRows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await db.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
