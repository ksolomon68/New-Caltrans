const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables with override for production
dotenv.config({ path: path.resolve(__dirname, '../.env.production'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('CaltransBizConnect DB: Initializing MySQL Connection Pool...');
console.log('DB Host:', process.env.DB_HOST || 'localhost');
console.log('DB User:', process.env.DB_USER);
console.log('DB Name:', process.env.DB_NAME);

let pool;

function getDb() {
    if (!pool) {
        try {
            const dbHost = process.env.DB_HOST || '127.0.0.1';
            pool = mysql.createPool({
                host: dbHost === 'localhost' ? '127.0.0.1' : dbHost,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 10000
            });
            console.log('CaltransBizConnect DB: MySQL Pool Created.');
        } catch (err) {
            console.error('CaltransBizConnect DB Error: Failed to create pool:', err.message);
            throw err;
        }
    }
    return pool;
}

async function initDatabase() {
    console.log('CaltransBizConnect DB: Running initDatabase()...');
    const db = getDb();

    try {
        console.log('CaltransBizConnect DB: Verifying connection...');
        await db.execute('SELECT 1');
        console.log('CaltransBizConnect DB: Connection verified.');

        // 1. Users Table
        console.log('CaltransBizConnect DB: Ensuring "users" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                type VARCHAR(50) NOT NULL,
                business_name VARCHAR(255),
                contact_name VARCHAR(255),
                phone VARCHAR(50),
                ein VARCHAR(50),
                certification_number VARCHAR(100),
                business_description TEXT,
                organization_name VARCHAR(255),
                districts TEXT,
                categories TEXT,
                status VARCHAR(50) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                saved_opportunities TEXT,
                capability_statement TEXT,
                website VARCHAR(255),
                address VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(50),
                zip VARCHAR(20),
                years_in_business VARCHAR(50),
                certifications TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Opportunities Table
        console.log('CaltransBizConnect DB: Ensuring "opportunities" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS opportunities (
                id VARCHAR(100) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                scope_summary TEXT NOT NULL,
                district VARCHAR(50) NOT NULL,
                district_name VARCHAR(100) NOT NULL,
                category VARCHAR(100) NOT NULL,
                category_name VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                estimated_value VARCHAR(100),
                due_date VARCHAR(50),
                due_time VARCHAR(50),
                submission_method VARCHAR(255),
                status VARCHAR(50) NOT NULL DEFAULT 'published',
                posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                posted_by INT,
                attachments TEXT,
                duration VARCHAR(100),
                requirements TEXT,
                certifications TEXT,
                experience TEXT,
                INDEX (posted_by),
                FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Applications Table
        console.log('CaltransBizConnect DB: Ensuring "applications" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS applications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                opportunity_id VARCHAR(100) NOT NULL,
                vendor_id INT NOT NULL,
                agency_id INT,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE(opportunity_id, vendor_id),
                INDEX (opportunity_id),
                INDEX (vendor_id),
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Saved Opportunities Table
        console.log('CaltransBizConnect DB: Ensuring "saved_opportunities" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS saved_opportunities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                vendor_id INT NOT NULL,
                opportunity_id VARCHAR(100) NOT NULL,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(vendor_id, opportunity_id),
                INDEX (opportunity_id),
                INDEX (vendor_id),
                FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 5. Messages Table
        console.log('CaltransBizConnect DB: Ensuring "messages" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                opportunity_id VARCHAR(100),
                subject VARCHAR(255),
                body TEXT NOT NULL,
                is_read TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (sender_id),
                INDEX (receiver_id),
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('CaltransBizConnect DB: All MySQL tables initialized successfully.');
    } catch (err) {
        console.error('CaltransBizConnect DB CRITICAL ERROR: Database initialization failed.');
        console.error(err);
        // Do not rethrow here to prevent server crash during startup, 
        // but health check will reflect the error.
    }
}

module.exports = {
    db: getDb(),
    getDb,
    initDatabase
};
