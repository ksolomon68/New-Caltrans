const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

console.log('CaltransBizConnect: Starting server initialization...');

const app = express();
// Priority: Phusion Passenger (PASSENGER_NODE_CONTROL_REPO), process.env.PORT, default 3000
const PORT = process.env.PORT || 3001;

try {
    // Middleware
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:3001',
        'https://caltransbizconnect.org',
        'https://www.caltransbizconnect.org',
        'http://caltransbizconnect.org',
        'http://www.caltransbizconnect.org'
    ];

    app.use(cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                return callback(null, true);
            } else {
                console.warn(`CaltransBizConnect CORS: Blocked for origin: ${origin}`);
                return callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
    }));

    app.use(express.json());

    // API Logging Middleware - For robust production debugging
    app.use('/api', (req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        if (req.body && Object.keys(req.body).length > 0) {
            const safeBody = { ...req.body };
            if (safeBody.password) safeBody.password = '***';
            console.log('API Request Body:', safeBody);
        }
        next();
    });

    // DB Health Check Middleware - Stop crashes before they reach routes
    app.use('/api', (req, res, next) => {
        try {
            const { getDb } = require('./database');
            getDb(); // This will throw if DB is not available
            next();
        } catch (err) {
            console.error('CaltransBizConnect: API Request failed - DB Unavailable:', err.message);
            res.status(503).json({
                error: 'Database Connection Error',
                details: err.message,
                hint: 'The server is running but cannot connect to its data storage. This is often due to missing native dependencies in the production environment.'
            });
        }
    });

    // Clean Routing for Opportunities (Details Page)
    app.get('/opportunities/:id', (req, res) => {
        if (req.params.id.includes('.')) {
            return res.sendFile(path.join(__dirname, '../', req.params.id));
        }
        res.sendFile(path.join(__dirname, '../opportunity-details.html'));
    });

    // Serve Static Files
    app.use(express.static(path.join(__dirname, '../')));

    // Initialize Database (Wrapped in try/catch in database.js)
    console.log('CaltransBizConnect: Initializing database...');
    initDatabase();

    // File Upload Setup
    const multer = require('multer');
    const fs = require('fs');
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
        try {
            fs.mkdirSync(uploadDir, { recursive: true });
            console.log('CaltransBizConnect: Created uploads directory');
        } catch (e) {
            console.error('CaltransBizConnect: Failed to create uploads directory:', e);
        }
    }

    const storage = multer.diskStorage({
        destination: function (req, file, cb) { cb(null, uploadDir); },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, 'cs-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
    const upload = multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });

    // --- ROUTE HANDLERS ---

    // 1. Health check handler
    const healthHandler = (req, res) => {
        const { getDb, getDbPath, checkDbFile } = require('./database');
        let dbStatus = 'ok';
        let detail = null;
        try { getDb(); } catch (e) { dbStatus = 'error'; detail = e.message; }

        // If JSON is requested (like from health API)
        if (req.path.includes('/api/health')) {
            return res.json({
                status: 'ok',
                database: {
                    status: dbStatus,
                    detail: detail,
                    path: getDbPath(),
                    exists: checkDbFile()
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
                <h1 style="color: #005A8C;">CaltransBizConnect Health (v2.0.6)</h1>
                <p><strong>Status:</strong> Running</p>
                <p><strong>URL Path:</strong> ${req.path}</p>
                <p style="color: ${dbStatus === 'ok' ? 'green' : 'red'};"><strong>Database: ${dbStatus === 'ok' ? 'Connected' : 'Error: ' + detail}</strong></p>
                <p><strong>Database Path:</strong> ${getDbPath()}</p>
                <p><strong>Database File Exists:</strong> ${checkDbFile() ? 'Yes' : 'No'}</p>
                <hr>
                <p>Time: ${new Date().toISOString()}</p>
                <p><small>Debug Info: Running in ${process.env.NODE_ENV || 'production'} mode</small></p>
            </div>
        `);
    };

    // 2. Emergency Sync Handler
    const syncHandler = async (req, res) => {
        try {
            const { db } = require('./database');
            const bcrypt = require('bcryptjs');
            const path = require('path');
            const dbFilePath = path.resolve(__dirname, 'data.db');

            const users = [
                { email: 'ks@evobrand.net', password: 'Shadow01!', type: 'admin', name: 'Caltrans Admin' },
                { email: 'ksolomon68@gmail.com', password: 'Shadow01!', type: 'agency', name: 'K Solomon' }
            ];

            const results = [];
            for (const u of users) {
                const email = u.email.toLowerCase().trim();
                const hash = await bcrypt.hash(u.password, 10);
                const exists = db ? db.prepare('SELECT id FROM users WHERE email = ?').get(email) : null;

                if (exists) {
                    db.prepare('UPDATE users SET password_hash = ?, type = ?, status = ? WHERE email = ?')
                        .run(hash, u.type, 'active', email);
                    results.push(`Updated: ${email} (ID: ${exists.id})`);
                } else if (db) {
                    db.prepare('INSERT INTO users (email, password_hash, type, business_name, organization_name, status) VALUES (?, ?, ?, ?, ?, ?)')
                        .run(email, hash, u.type, u.type === 'vendor' ? u.name : null, u.type === 'agency' ? u.name : null, 'active');
                    results.push(`Created: ${email}`);
                }
            }

            const count = db ? db.prepare('SELECT COUNT(*) as count FROM users').get().count : 'N/A';
            const allEmails = db ? db.prepare('SELECT email FROM users LIMIT 10').all().map(u => u.email).join(', ') : 'None';

            res.send(`
                <div style="font-family: sans-serif; padding: 20px;">
                    <h1 style="color: #005A8C;">Emergency Sync Tool v3 (Fresh Start)</h1>
                    <p><strong>Database Path:</strong> ${dbFilePath}</p>
                    <p><strong>Operations performed:</strong></p>
                    <ul>${results.map(r => `<li>${r}</li>`).join('')}</ul>
                    <hr>
                    <p><strong>System Status:</strong></p>
                    <ul>
                        <li>Total Users in DB: ${count}</li>
                        <li>Sample Emails Found: ${allEmails}</li>
                    </ul>
                    <p style="color: #D32F2F;"><strong>Security Note:</strong> Please remove this code from server/index.js after verification.</p>
                    <p><a href="/login.html" style="background: #005A8C; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Return to Login</a></p>
                </div>
            `);
        } catch (error) {
            res.status(500).send(`<h1>Emergency sync failed</h1><p>${error.message}</p>`);
        }
    };

    // --- APPLY ROUTES ---

    // 1. Health Check (Dual-Route)
    app.get('/api/health', healthHandler);
    app.get('/health', healthHandler);

    // 2. Emergency Sync (Dual-Route)
    app.get('/api/emergency-seed-sync', syncHandler);
    app.get('/emergency-seed-sync', syncHandler);

    // 3. Feature Routes (Dual-Route)
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
                const { db } = require('./database');
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
            const { db } = require('./database');
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
    // On Passenger, the app MUST listen on 'passenger' or it will result in a generic web server 503.
    // By listening, we might be able to serve the /api/health endpoint or error JSON.
    if (process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO) {
        try {
            console.log('CaltransBizConnect: Attempting emergency listen on "passenger"...');
            app.listen('passenger');
        } catch (e) {
            console.error('CaltransBizConnect: Emergency listen failed:', e.message);
        }
    } else {
        try { app.listen(PORT); } catch (e) { }
    }
}
