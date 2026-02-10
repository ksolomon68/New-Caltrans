const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Root admin endpoint
router.get('/', (req, res) => {
    res.json({ message: 'Admin API is working' });
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    // For now, we'll use a simple header-based auth
    // In production, you'd use JWT tokens or sessions
    const adminEmail = req.headers['x-admin-email'];
    console.log(`Admin middleware: ${req.method} ${req.originalUrl}`);
    console.log(`Headers:`, req.headers);
    console.log(`Admin Email: ${adminEmail}`);

    const isAdminEmail = adminEmail && (adminEmail.includes('admin') || adminEmail === 'ks@evobrand.net');

    if (!isAdminEmail) {
        console.log('Admin access denied');
        return res.status(403).json({ error: 'Admin access required' });
    }
    console.log('Admin access granted');
    next();
};

// Get admin dashboard data
router.get('/dashboard', requireAdmin, (req, res) => {
    try {
        // Get stats
        const totalVendors = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'vendor'").get().count;
        const totalAgencies = db.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'agency'").get().count;
        const pendingApprovals = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE status = 'pending'").get().count;

        // Get pending opportunities
        const pendingOpportunities = db.prepare(`
            SELECT o.*, u.business_name as posted_by_name, u.email as posted_by_email
            FROM opportunities o
            LEFT JOIN users u ON o.posted_by = u.id
            WHERE o.status = 'pending'
            ORDER BY o.posted_date DESC
        `).all();

        // Get recent activity (simplified)
        const recentUsers = db.prepare(`
            SELECT email, type, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 5
        `).all();

        const recentActivity = recentUsers.map(user => ({
            type: user.type === 'vendor' ? 'user_reg' : 'agency_reg',
            user: user.email,
            time: formatRelativeTime(user.created_at)
        }));

        const data = {
            stats: {
                totalVendors,
                totalAgencies,
                pendingApprovals,
                siteUptime: '99.9%'
            },
            pendingOpportunities,
            recentActivity
        };

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users for management
router.get('/users', requireAdmin, (req, res) => {
    try {
        const users = db.prepare(`
            SELECT id, email, type, business_name, organization_name, contact_name, 
                   phone, ein, created_at
            FROM users
            ORDER BY created_at DESC
        `).all();

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user status (Legacy, keeping for compatibility but will be superseded by PUT /users/:id)
router.put('/users/:id/status', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
        const result = stmt.run(status, id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ id, status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new user
const bcrypt = require('bcryptjs');
router.post('/users', requireAdmin, async (req, res) => {
    const { email, password, type, business_name, organization_name, status } = req.body;

    if (!email || !password || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);
        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, type, business_name, organization_name, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(email, password_hash, type, business_name || null, organization_name || null, status || 'active');

        res.status(201).json({ id: result.lastInsertRowid, email, type });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

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
        // Build dynamic update query
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
        const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
        const result = stmt.run(...params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    try {
        const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        if (result.changes === 0) {
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
