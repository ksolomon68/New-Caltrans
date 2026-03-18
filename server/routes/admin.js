const express = require('express');
const { db } = require('../database');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Root admin endpoint
router.get('/', (req, res) => {
    res.json({ message: 'Admin API is working' });
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    const adminEmail = req.headers['x-admin-email'];
    console.log(`Admin middleware: ${req.method} ${req.originalUrl}`);

    const isAdminEmail = adminEmail && (adminEmail.toLowerCase().includes('admin') || adminEmail === 'ks@evobrand.net');

    if (!isAdminEmail) {
        console.log('Admin access denied');
        return res.status(403).json({ error: 'Admin access required' });
    }
    console.log('Admin access granted');
    next();
};

// Get admin dashboard data
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        // Get stats
        const [[vendorCount]] = await db.execute("SELECT COUNT(*) as count FROM users WHERE type = 'vendor'");
        const [[agencyCount]] = await db.execute("SELECT COUNT(*) as count FROM users WHERE type = 'agency'");
        const [[pendingCount]] = await db.execute("SELECT COUNT(*) as count FROM opportunities WHERE status = 'pending'");

        // Get pending opportunities
        const [pendingOpportunities] = await db.execute(`
            SELECT o.*, u.business_name as posted_by_name, u.email as posted_by_email
            FROM opportunities o
            LEFT JOIN users u ON o.posted_by = u.id
            WHERE o.status = 'pending'
            ORDER BY o.posted_date DESC
        `);

        // Get recent activity (recent registrations)
        const [recentUsers] = await db.execute(`
            SELECT email, type, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const recentActivity = recentUsers.map(user => ({
            type: user.type === 'vendor' ? 'user_reg' : 'agency_reg',
            user: user.email,
            time: formatRelativeTime(user.created_at)
        }));

        const data = {
            stats: {
                totalVendors: vendorCount.count,
                totalAgencies: agencyCount.count,
                pendingApprovals: pendingCount.count,
                siteUptime: '99.9%'
            },
            pendingOpportunities,
            recentActivity
        };

        res.json(data);
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all users for management
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(`
            SELECT id, email, type, business_name, organization_name, contact_name, 
                   phone, ein, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json(users);
    } catch (error) {
        console.error('Admin fetch users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user status
router.put('/users/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const [result] = await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ id, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new user
router.post('/users', requireAdmin, async (req, res) => {
    const { email, password, type, business_name, organization_name, status } = req.body;

    if (!email || !password || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);
        const sql = `
            INSERT INTO users (email, password_hash, type, business_name, organization_name, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.execute(sql, [
            email,
            password_hash,
            type,
            business_name || null,
            organization_name || null,
            status || 'active'
        ]);

        res.status(201).json({ id: result.insertId, email, type });
    } catch (error) {
        console.error('Admin create user error:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const user = rows[0];
        const { password_hash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user (Universal)
router.put('/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const data = req.body;

    try {
        const allowedFields = ['business_name', 'organization_name', 'contact_name', 'phone', 'ein', 'status', 'type'];
        const updates = [];
        const params = [];

        allowedFields.forEach(field => {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(data[field]);
            }
        });

        if (data.password) {
            const password_hash = await bcrypt.hash(data.password, 10);
            updates.push('password_hash = ?');
            params.push(password_hash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(id);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        const [result] = await db.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to format relative time
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

module.exports = router;
