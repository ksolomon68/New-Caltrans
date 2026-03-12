// Load .env.production first (live credentials), then .env for any local overrides
require('dotenv').config({ path: require('path').join(__dirname, '../.env.production') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, getDb } = require('./database');

const VERSION = '2.1.1-mysql-ipv4-fix';
console.log(`CaltransBizConnect: Starting server initialization (v${VERSION})...`);

const app = express();
const PORT = process.env.PORT || 3001;

const startServer = async () => {
    try {
        // Basic Middleware
        app.use(cors());
        app.use(express.json());

        // Maintenance Mode Middleware
        app.use((req, res, next) => {
            // Check for admin bypass query param
            if (req.query.admin === 'true') {
                res.cookie('admin_bypass', 'true', { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
                return res.redirect(req.path);
            }
            
            // Check bypass mechanisms
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
        app.use(express.static(publicPath));

        // Routes
        app.use('/api/auth', require('./routes/auth'));
        app.use('/api/opportunities', require('./routes/opportunities'));
        app.use('/api/users', require('./routes/users'));
        app.use('/api/messages', require('./routes/messages'));
        app.use('/api/applications', require('./routes/applications'));
        app.use('/api/admin', require('./routes/admin'));
        app.use('/api/upload-cs', require('./routes/upload'));
        app.use('/api/vendors', require('./routes/vendors'));

        // Health Check
        app.get('/api/health', async (req, res) => {
            let dbStatus = 'ok';
            let dbError = null;
            try {
                const db = getDb();
                await db.execute('SELECT 1');
            } catch (e) {
                dbStatus = 'error';
                dbError = e.message;
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
                status: 'ok',
                version: VERSION,
                database: { status: dbStatus, error: dbError },
                uploads: { path: uploadsDir, exists: fs.existsSync(uploadsDir), writable: uploadsWritable },
                env: process.env.NODE_ENV || 'production',
                passenger: !!(process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO)
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
