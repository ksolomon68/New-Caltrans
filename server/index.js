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
            res.json({
                status: 'ok',
                version: VERSION,
                database: { status: dbStatus, error: dbError },
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
