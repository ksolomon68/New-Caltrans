const { db } = require('../database');

/**
 * Middleware to require a specific role.
 * Extracts user ID from headers (x-user-id), or body/query (userId, senderId)
 */
function requireRole(allowedRole) {
    return async (req, res, next) => {
        // Find user ID from various possible locations in request
        const userId = req.headers['x-user-id'] || 
                       req.body.userId || 
                       req.body.senderId || 
                       req.query.userId || 
                       req.params.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized: User ID not provided' });
        }

        try {
            const [rows] = await db.execute('SELECT id, type, business_name FROM users WHERE id = ?', [userId]);
            const user = rows[0];

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized: Invalid user' });
            }

            if (user.type !== allowedRole && allowedRole !== 'any') {
                return res.status(403).json({ 
                    error: `Forbidden: Requires ${allowedRole} role` 
                });
            }

            // Attach user to request for downstream use
            req.user = user;
            next();
        } catch (error) {
            console.error('Role validation error:', error);
            res.status(500).json({ error: 'Internal server error during role validation' });
        }
    };
}

module.exports = {
    requireRole
};
