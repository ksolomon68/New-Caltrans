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
    app.get('/api/health', (req, res) => res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'production'
    }));

    app.get('/health', (req, res) => res.send('OK - CaltransBizConnect is running'));

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
