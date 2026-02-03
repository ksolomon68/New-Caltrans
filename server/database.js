const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../data.db');
let db;
let lastError = null;

try {
    console.log(`CaltransBizConnect DB: Attempting to open database at ${dbPath}`);
    db = new Database(dbPath, { timeout: 5000 });
    console.log('CaltransBizConnect DB: Successfully connected to SQLite');
} catch (err) {
    lastError = err;
    console.error('CaltransBizConnect DB FATAL ERROR: Failed to init Database.', err);
}

/**
 * Safely access the database instance.
 * Throws a descriptive error if the database is not available.
 */
function getDb() {
    if (db) return db;

    let errorMsg = 'Database connection is not available.';
    if (lastError) {
        errorMsg += ` Detail: ${lastError.message}`;
        if (lastError.code === 'MODULE_NOT_FOUND') {
            errorMsg += ' (The better-sqlite3 module may not be correctly installed in the production environment).';
        }
    }

    const error = new Error(errorMsg);
    error.status = 500;
    throw error;
}

// Initialize database schema
function initDatabase() {
    try {
        const database = getDb();
        console.log('CaltransBizConnect DB: Initializing schema...');

        // Users table
        database.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                type TEXT NOT NULL,
                business_name TEXT,
                contact_name TEXT,
                phone TEXT,
                ein TEXT,
                certification_number TEXT,
                business_description TEXT,
                organization_name TEXT,
                districts TEXT,
                categories TEXT,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Opportunities table
        database.exec(`
            CREATE TABLE IF NOT EXISTS opportunities (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                scope_summary TEXT NOT NULL,
                district TEXT NOT NULL,
                district_name TEXT NOT NULL,
                category TEXT NOT NULL,
                category_name TEXT NOT NULL,
                subcategory TEXT,
                estimated_value TEXT,
                due_date TEXT,
                due_time TEXT,
                submission_method TEXT,
                status TEXT DEFAULT 'published',
                posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                posted_by INTEGER,
                FOREIGN KEY (posted_by) REFERENCES users (id)
            )
        `);

        // Applications table
        database.exec(`
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                opportunity_id TEXT NOT NULL,
                vendor_id INTEGER NOT NULL,
                agency_id INTEGER,
                status TEXT DEFAULT 'pending',
                applied_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities (id),
                FOREIGN KEY (vendor_id) REFERENCES users (id)
            )
        `);

        // Seed data for initial deployment
        const count = database.prepare('SELECT COUNT(*) as count FROM opportunities').get().count;
        if (count === 0) {
            console.log('CaltransBizConnect DB: Seeding initial opportunities...');
            const seedStmt = database.prepare(`
                INSERT INTO opportunities (
                    id, title, scope_summary, district, district_name, 
                    category, category_name, subcategory, estimated_value, 
                    due_date, due_time, submission_method, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')
            `);

            const seeds = [
                [
                    'opp-001',
                    'District 4 Bridge Maintenance Support',
                    'Provide specialized technical assistance for ongoing bridge maintenance projects in the Bay Area.',
                    '04', 'D04 - Bay Area / Oakland',
                    'services', 'Support Services',
                    'Technical Assistance', '$150,000 - $300,000',
                    '2026-03-15', '14:00', 'Electronic Submission'
                ],
                [
                    'opp-002',
                    'Statewide SBE Supportive Services Program',
                    'Comprehensive supportive services including training workshops and technical assistance for certified SBEs.',
                    '74', 'D74 - Headquarters',
                    'services', 'Support Services',
                    'Training', '$500,000+',
                    '2026-04-01', '10:00', 'Caltrans Portal'
                ],
                [
                    'opp-003',
                    'District 7 Guardrail Repair Contract',
                    'Emergency and scheduled guardrail repair services across various locations in Los Angeles county.',
                    '07', 'D07 - Los Angeles',
                    'construction', 'Construction',
                    'Specialty Contracting', '$2,000,000',
                    '2026-02-28', '16:00', 'Hard Copy / In-Person'
                ]
            ];

            for (const seed of seeds) {
                seedStmt.run(...seed);
            }
            console.log('CaltransBizConnect DB: Seeded 3 sample opportunities.');
        }

        // Migration logic for new columns
        const addColumn = (table, col, def) => {
            const currentCols = database.prepare(`PRAGMA table_info(${table})`).all();
            if (!currentCols.some(c => c.name === col)) {
                console.log(`CaltransBizConnect DB Migration: Adding ${col} to ${table}...`);
                database.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
            }
        };

        // Users columns
        addColumn('users', 'status', "TEXT DEFAULT 'active'");
        addColumn('users', 'saved_opportunities', "TEXT");
        addColumn('users', 'capability_statement', "TEXT");
        addColumn('users', 'business_description', "TEXT");
        addColumn('users', 'website', "TEXT");
        addColumn('users', 'address', "TEXT");
        addColumn('users', 'city', "TEXT");
        addColumn('users', 'state', "TEXT");
        addColumn('users', 'zip', "TEXT");
        addColumn('users', 'years_in_business', "TEXT");
        addColumn('users', 'certifications', "TEXT");

        // Opportunities columns
        addColumn('opportunities', 'attachments', "TEXT");
        addColumn('opportunities', 'duration', "TEXT");
        addColumn('opportunities', 'requirements', "TEXT");
        addColumn('opportunities', 'certifications', "TEXT");
        addColumn('opportunities', 'experience', "TEXT");

        // Additional Tables
        database.exec(`
            CREATE TABLE IF NOT EXISTS saved_opportunities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor_id INTEGER NOT NULL,
                opportunity_id TEXT NOT NULL,
                saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vendor_id, opportunity_id),
                FOREIGN KEY (vendor_id) REFERENCES users (id),
                FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
            )
        `);

        database.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                opportunity_id TEXT,
                subject TEXT,
                body TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id),
                FOREIGN KEY (opportunity_id) REFERENCES opportunities (id)
            )
        `);

        console.log('CaltransBizConnect DB: Schema initialized and verified.');
    } catch (e) {
        console.error('CaltransBizConnect DB Error during schema initialization:', e);
    }
}

module.exports = {
    getDb,
    initDatabase,
    get lastError() { return lastError; },
    get db() { return db; } // Keep for backward compatibility where it might still be used
};
