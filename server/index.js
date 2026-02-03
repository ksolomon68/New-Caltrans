const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

console.log('CaltransBizConnect: Starting server initialization...');

const app = express();
// Priority: Phusion Passenger (PASSENGER_NODE_CONTROL_REPO), process.env.PORT, default 3000
const PORT = process.env.PORT || 3000;

try {
    // Middleware
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
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
        if (Object.keys(req.body).length > 0) {
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

    // Health Checks
    app.get('/api/health', (req, res) => {
        const { getDb, lastError } = require('./database');
        let dbStatus = 'ok';
        let detail = null;
        try { getDb(); } catch (e) { dbStatus = 'error'; detail = e.message; }

        res.json({
            status: 'ok',
            database: { status: dbStatus, detail: detail },
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            env: {
                node: process.version,
                platform: process.platform,
                arch: process.arch,
                passenger: !!(process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO)
            }
        });
    });

    app.get('/health', (req, res) => {
        const { getDb } = require('./database');
        let dbInfo = 'Database: Connected';
        try { getDb(); } catch (e) { dbInfo = `Database Error: ${e.message}`; }

        res.send(`
            <h1>CaltransBizConnect Health</h1>
            <p><strong>Status:</strong> Running</p>
            <p><strong>${dbInfo}</strong></p>
            <hr>
            <p>Time: ${new Date().toISOString()}</p>
        `);
    });

    // Auth & Core Routes
    console.log('CaltransBizConnect: Loading routes...');
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/opportunities', require('./routes/opportunities'));

    // Specific Feature Routes
    const safeRequire = (routePath) => {
        try { return require(routePath); }
        catch (e) { console.warn(`CaltransBizConnect: Optional route ${routePath} not found.`); return null; }
    };

    const adminRoutes = safeRequire('./routes/admin');
    if (adminRoutes) app.use('/api/admin', adminRoutes);

    const appRoutes = safeRequire('./routes/applications');
    if (appRoutes) app.use('/api/applications', appRoutes);

    app.use('/api/users', require('./routes/users'));
    app.use('/api/vendors', require('./routes/users'));
    app.use('/api/messages', require('./routes/messages'));

    // EMERGENCY SEED ENDPOINT - Allows user to fix production DB without terminal access
    // This can be triggered by visiting https://caltransbizconnect.org/api/emergency-seed-sync
    app.get('/api/emergency-seed-sync', async (req, res) => {
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
            `);
        } catch (error) {
            res.status(500).send(`<h1>Emergency sync failed</h1><p>${error.message}</p>`);
        }
    });

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
    // On Passenger, the app should still try to listen or it will result in 503
    try { app.listen(PORT); } catch (e) { }
}
