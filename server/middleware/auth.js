const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'caltrans-fallback-secret-change-in-production';

/**
 * Middleware to require authentication via JWT bearer token.
 * allowedRole: 'small_business' | 'agency' | 'admin' | 'caltrans_admin' | 'any'
 */
function requireRole(allowedRole) {
    return (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; // { id, email, type }

            if (allowedRole !== 'any') {
                const roles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
                // Treat caltrans_admin as admin in this context if admin is allowed
                if (roles.includes('admin') && decoded.type === 'caltrans_admin') {
                    // Allowed
                } else if (!roles.includes(decoded.type)) {
                    return res.status(403).json({ error: `Forbidden: Requires ${roles.join(' or ')} role` });
                }
            }

            next();
        } catch (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
        }
    };
}

/**
 * Middleware to require admin role via JWT.
 */
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'admin' && decoded.type !== 'caltrans_admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

module.exports = { requireRole, requireAdmin, JWT_SECRET };
