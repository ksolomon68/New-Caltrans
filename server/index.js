const path = require('path');
const dotenv = require('dotenv');

// First try to load the default .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// If on a live server, conditionally load .env.production overrides (if it exists)
const isLive = !!(process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO || process.env.NODE_ENV === 'production');
if (isLive) {
    dotenv.config({ path: path.join(__dirname, '../.env.production'), override: true });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const { initDatabase, getDb } = require('./database');

const VERSION = '2.1.1-mysql-ipv4-fix';
console.log(`CaltransBizConnect: Starting server initialization (v${VERSION})...`);

const app = express();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        // Security Headers
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc:     ["'self'"],
                    scriptSrc:      ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
                    styleSrc:       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                    fontSrc:        ["'self'", 'https://fonts.gstatic.com'],
                    imgSrc:         ["'self'", 'data:', 'blob:'],
                    connectSrc:     ["'self'"],
                    frameSrc:       ["'none'"],
                    objectSrc:      ["'none'"],
                    baseUri:        ["'self'"],
                    formAction:     ["'self'"],
                    upgradeInsecureRequests: isLive ? [] : null
                }
            },
            hsts: isLive ? {
                maxAge: 31536000,          // 1 year
                includeSubDomains: true,
                preload: true
            } : false,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            permissionsPolicy: false       // let helmet default handle this
        }));

        // Service Worker must be served with no-cache and correct scope header
        app.get('/sw.js', (req, res, next) => {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
            next();
        });

        // Manifest served with correct MIME type
        app.get('/manifest.json', (req, res, next) => {
            res.setHeader('Content-Type', 'application/manifest+json');
            res.setHeader('Cache-Control', 'no-cache');
            next();
        });

        // CORS — restrict to production domain and localhost
        const allowedOrigins = [
            'https://caltransbizconnect.org',
            'https://www.caltransbizconnect.org',
            'http://localhost:3001',
            'http://127.0.0.1:3001'
        ];
        app.use(cors({
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }));

        // Rate limiting on auth endpoints
        const authLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 20,                   // 20 attempts per window
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: 'Too many requests, please try again later.' }
        });

        // Stricter limiter for password reset to prevent email abuse
        const resetLimiter = rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5,
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: 'Too many password reset requests. Please try again in an hour.' }
        });

        app.use(express.json({ limit: '1mb' }));

        // Maintenance Mode Middleware
        const { JWT_SECRET: MAINT_JWT_SECRET } = require('./middleware/auth');
        const jwt = require('jsonwebtoken');
        app.use((req, res, next) => {
            // Bypass: localhost IP, or a valid signed admin JWT in the Authorization header
            const isAllowedIP = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);
            let hasBypassCookie = false;
            try {
                const raw = req.headers.cookie || '';
                const match = raw.match(/admin_bypass=([^;]+)/);
                if (match) {
                    const payload = jwt.verify(match[1], MAINT_JWT_SECRET);
                    hasBypassCookie = payload && (payload.type === 'admin' || payload.type === 'caltrans_admin');
                }
            } catch (_) { /* invalid token — no bypass */ }
            
            if (process.env.MAINTENANCE_MODE === 'true' && !hasBypassCookie && !isAllowedIP) {
                // Always allow static assets needed for the maintenance page
                if (req.path.startsWith('/css/maintenance.css') ||
                    req.path.startsWith('/images/') ||
                    req.path.startsWith('/assets/') ||
                    req.path.startsWith('/js/maintenance-animations.js')) {
                    return next();
                }

                // Always allow CMS admin routes (they require their own JWT auth)
                if (req.path.startsWith('/api/cms/')) {
                    return next();
                }

                // Return 503 JSON for all other API routes
                if (req.path.startsWith('/api/')) {
                    return res.status(503).json({ error: 'Service Unavailable', message: 'Platform upgrade in progress.' });
                }
                
                // Return the maintenance page for all other requests
                return res.status(503).sendFile(path.join(__dirname, '../maintenance.html'));
            }
            next();
        });

        // API Logging
        app.use('/api', (req, res, next) => {
            console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.path}`);
            next();
        });

        // Initialize Database
        console.log('CaltransBizConnect: Initializing database connection and schema...');
        await initDatabase();

        // Global development toggle to disable all caching
        const DISABLE_ALL_CACHE = process.env.DISABLE_ALL_CACHE === 'true';

        // 1. Disable caching for all HTML responses
        app.use((req, res, next) => {
            if (DISABLE_ALL_CACHE) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                return next();
            }

            // Only aggressively prevent caching on HTML or extensionless paths (likely endpoints or SPA routes)
            if (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
            next();
        });

        // 2. Fix static asset caching
        const publicPath = path.join(__dirname, '../');
        console.log('CaltransBizConnect: Serving static files from:', publicPath);
        app.use(express.static(publicPath, { 
            etag: false, 
            lastModified: false, 
            setHeaders: (res, filePath) => {
                if (DISABLE_ALL_CACHE) {
                    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    return;
                }

                // Only safely cache static assets if they are versioned (CSS/JS/Images)
                if (filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)) {
                    // For now, let's keep it at "no-cache" which means "revalidate every time"
                    // but allows the browser to re-use if ETag matches (though we disabled ETag above).
                    // This is the safest way to ensure "clear cache" works instantly without breaking CDN/caching later.
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
                }
            } 
        }));

        // Routes
        app.use('/api/auth', authLimiter, require('./routes/auth'));
        app.use('/api/cms/login', authLimiter);
        app.use('/api/password-reset', resetLimiter);
        app.use('/api/opportunities', require('./routes/opportunities'));
        app.use('/api/users', require('./routes/users'));
        app.use('/api/messages', require('./routes/messages'));
        app.use('/api/applications', require('./routes/applications'));
        app.use('/api/notifications', require('./routes/notifications'));
        app.use('/api/admin', require('./routes/admin'));
        app.use('/api/upload-cs', require('./routes/upload'));
        app.use('/api/small-businesses', require('./routes/small-businesses'));
        app.use('/api/cms', require('./routes/cms'));
        app.use('/api/filters', require('./routes/filters'));
        app.use('/api/password-reset', require('./routes/password-reset'));
        app.use('/api/contact', require('./routes/contact'));

        // Health Check
        app.get('/api/health', async (req, res) => {
            let dbStatus = 'ok';
            try {
                const db = getDb();
                await db.execute('SELECT 1');
            } catch (e) {
                dbStatus = 'error';
            }
            const uploadsDir = path.join(__dirname, '../uploads');
            let uploadsWritable = false;
            try {
                const testFile = path.join(uploadsDir, '.health-test');
                fs.writeFileSync(testFile, 'ok');
                fs.unlinkSync(testFile);
                uploadsWritable = true;
            } catch (e) {
                // not writable
            }
            res.json({
                status: dbStatus === 'ok' && uploadsWritable ? 'ok' : 'degraded',
                database: dbStatus,
                uploads: uploadsWritable ? 'ok' : 'error'
            });
        });

        // Explicit Root Route for HTML
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api')) return next();
            const indexPath = path.join(publicPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send('CaltransBizConnect: index.html not found');
            }
        });

        // Listen logic for Phusion Passenger or standalone
        if (process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO) {
            console.log('CaltransBizConnect: Listening on Phusion Passenger...');
            app.listen('passenger');
        } else {
            app.listen(PORT, () => console.log(`CaltransBizConnect: Running on http://localhost:${PORT}`));
        }

    } catch (err) {
        console.error('CaltransBizConnect CRITICAL STARTUP ERROR:', err);
    }
};

startServer();
