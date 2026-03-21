// Load .env.production first (live credentials), then .env for any local overrides
require('dotenv').config({ path: require('path').join(__dirname, '../.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
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
            contentSecurityPolicy: false // disabled to allow inline scripts in HTML pages
        }));

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

        app.use(express.json({ limit: '1mb' }));

        // Maintenance Mode Middleware
        app.use((req, res, next) => {
            // Check bypass mechanisms (localhost only — no query param bypass)
            const hasBypassCookie = req.headers.cookie && req.headers.cookie.includes('admin_bypass=true');
            const isAllowedIP = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip);
            
            if (process.env.MAINTENANCE_MODE === 'true' && !hasBypassCookie && !isAllowedIP) {
                // Always allow static assets needed for the maintenance page
                if (req.path.startsWith('/css/maintenance.css') || 
                    req.path.startsWith('/images/') || 
                    req.path.startsWith('/assets/') ||
                    req.path.startsWith('/js/maintenance-animations.js')) {
                    return next();
                }
                
                // Revert APIs to 503 JSON
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

        // Serve Static Files
        const publicPath = path.join(__dirname, '../');
        console.log('CaltransBizConnect: Serving static files from:', publicPath);
        app.use(express.static(publicPath, { etag: false, lastModified: false, setHeaders(res) { res.setHeader('Cache-Control', 'no-cache'); } }));

        // Routes
        app.use('/api/auth', authLimiter, require('./routes/auth'));
        app.use('/api/cms/login', authLimiter);
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
