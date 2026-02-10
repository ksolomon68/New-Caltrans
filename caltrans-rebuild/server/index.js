const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handler wrapper
try {
    // Middleware
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Serve static files from public directory
    app.use(express.static(path.join(__dirname, '../public')));

    // Serve uploads
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Initialize database
    const { initDatabase } = require('./database');
    initDatabase();

    // File upload configuration
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, path.join(__dirname, '../uploads'));
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'cs-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });

    // --- ROUTE HANDLERS ---

    // Health check handler (with crash protection)
    const healthHandler = (req, res) => {
        try {
            const { getDb, getDbPath, checkDbFile } = require('./database');
            let dbStatus = 'ok';
            let detail = null;
            let dbPath = 'unknown';
            let dbExists = false;

            try { getDb(); } catch (e) { dbStatus = 'error'; detail = e.message; }
            try { dbPath = getDbPath(); } catch (e) { dbPath = `Error: ${e.message}`; }
            try { dbExists = checkDbFile(); } catch (e) { dbExists = false; }

            // If JSON is requested (like from health API)
            if (req.path.includes('/api/health')) {
                return res.json({
                    status: 'ok',
                    version: '2.1.0',
                    database: {
                        status: dbStatus,
                        detail: detail,
                        path: dbPath,
                        exists: dbExists
                    },
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString(),
                    env: {
                        node: process.version,
                        passenger: !!(process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO)
                    }
                });
            }

            // Default HTML response
            res.send(`
                <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
                    <h1 style="color: #005A8C;">CaltransBizConnect Health (v2.1.0)</h1>
                    <p><strong>Status:</strong> Running</p>
                    <p><strong>URL Path:</strong> ${req.path}</p>
                    <p style="color: ${dbStatus === 'ok' ? 'green' : 'red'};"><strong>Database: ${dbStatus === 'ok' ? 'Connected' : 'Error: ' + detail}</strong></p>
                    <p><strong>Database Path:</strong> ${dbPath}</p>
                    <p><strong>Database File Exists:</strong> ${dbExists ? 'Yes' : 'No'}</p>
                    <hr>
                    <p>Time: ${new Date().toISOString()}</p>
                    <p><small>Debug Info: Running in ${process.env.NODE_ENV || 'production'} mode</small></p>
                </div>
            `);
        } catch (criticalError) {
            // Absolute failsafe - return basic HTML even if everything fails
            res.status(500).send(`
                <h1>CaltransBizConnect Health Check Failed</h1>
                <p>Critical Error: ${criticalError.message}</p>
                <p>The server is running but the health check encountered an unexpected error.</p>
            `);
        }
    };

    // --- APPLY ROUTES ---

    // Health Check (Dual-Route for Passenger compatibility)
    app.get('/api/health', healthHandler);
    app.get('/health', healthHandler);

    // Feature Routes (Dual-Route)
    const setupRoutes = (prefix = '') => {
        const p = prefix ? `/${prefix}` : '';
        app.use(`${p}/auth`, require('./routes/auth'));
        app.use(`${p}/opportunities`, require('./routes/opportunities'));
        app.use(`${p}/users`, require('./routes/users'));
        app.use(`${p}/vendors`, require('./routes/users'));
        app.use(`${p}/messages`, require('./routes/messages'));

        const safeRequire = (routePath) => {
            try { return require(routePath); }
            catch (e) { return null; }
        };

        const adminRoutes = safeRequire('./routes/admin');
        if (adminRoutes) app.use(`${p}/admin`, adminRoutes);

        const appOpsRoutes = safeRequire('./routes/applications');
        if (appOpsRoutes) app.use(`${p}/applications`, appOpsRoutes);
    };

    setupRoutes('api'); // Handles /api/*
    setupRoutes('');    // Handles /* (fallback if prefix stripped)

    // File Upload Route
    app.post('/api/upload-cs', upload.single('file'), (req, res) => {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const { userId } = req.body;
        if (userId) {
            try {
                const { getDb } = require('./database');
                const db = getDb();
                if (db) {
                    db.prepare('UPDATE users SET capability_statement = ? WHERE id = ?')
                        .run(`/uploads/${req.file.filename}`, userId);
                }
            } catch (e) {
                console.error('CaltransBizConnect: Error saving CS to DB:', e);
            }
        }
        res.json({
            fileName: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/${req.file.filename}`,
            size: req.file.size
        });
    });

    // Download CS
    app.get('/api/vendors/:vendorId/capability-statement', (req, res) => {
        const { vendorId } = req.params;
        try {
            const { getDb } = require('./database');
            const db = getDb();
            if (!db) throw new Error('Database not available');
            const user = db.prepare('SELECT capability_statement FROM users WHERE id = ?').get(vendorId);
            if (!user || !user.capability_statement) return res.status(404).json({ error: 'No capability statement found' });
            res.download(path.join(__dirname, '../', user.capability_statement));
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    console.log('CaltransBizConnect: All components initialized successfully.');

    // GLOBAL API ERROR HANDLER - Ensures all /api requests return JSON
    app.use('/api', (err, req, res, next) => {
        console.error('CaltransBizConnect: Unhandled API Error:', err);
        res.status(err.status || 500).json({
            success: false,
            error: 'Server Error',
            message: err.message || 'An unexpected error occurred',
            debug: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    });

    // Final port binding logic for shared hosting environment
    if (process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO) {
        console.log('CaltransBizConnect: Running under Phusion Passenger');
        app.listen('passenger');
    } else {
        app.listen(PORT, () => {
            console.log(`CaltransBizConnect: Server running on http://localhost:${PORT}`);
        });
    }

} catch (globalError) {
    console.error('CaltransBizConnect CRITICAL STARTUP ERROR:', globalError);
    // On Passenger, the app should still try to listen or it will result in 503
    try { app.listen(PORT); } catch (e) { }
}
