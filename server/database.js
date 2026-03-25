const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// First try to load the default .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// If on a live server, conditionally load .env.production overrides (if it exists)
const isLive = !!(process.env.PHUSION_PASSENGER || process.env.PASSENGER_NODE_CONTROL_REPO || process.env.NODE_ENV === 'production');
if (isLive) {
    dotenv.config({ path: path.join(__dirname, '../.env.production'), override: true });
}

console.log('CaltransBizConnect DB: Initializing MySQL Connection Pool...');

let pool;

function getDb() {
    if (!pool) {
        try {
            const dbHost = process.env.DB_HOST || 'localhost';
            pool = mysql.createPool({
                host: dbHost,
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
                small_business_id INT NOT NULL,
                prime_contractor_id INT,
                status VARCHAR(50) NOT NULL DEFAULT 'pending',
                applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                UNIQUE(opportunity_id, small_business_id),
                INDEX (opportunity_id),
                INDEX (small_business_id),
                FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
                FOREIGN KEY (small_business_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 4. Saved Opportunities Table
        console.log('CaltransBizConnect DB: Ensuring "saved_opportunities" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS saved_opportunities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                small_business_id INT NOT NULL,
                opportunity_id VARCHAR(100) NOT NULL,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(small_business_id, opportunity_id),
                INDEX (opportunity_id),
                INDEX (small_business_id),
                FOREIGN KEY (small_business_id) REFERENCES users(id) ON DELETE CASCADE,
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
                sender_business_name VARCHAR(255),
                receiver_business_name VARCHAR(255),
                opportunity_id VARCHAR(100),
                message_type ENUM('invite', 'application', 'reply') DEFAULT 'reply',
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

        // 6. Districts Table
        console.log('CaltransBizConnect DB: Ensuring "districts" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS districts (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                region VARCHAR(100)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 7. Work Categories Table
        console.log('CaltransBizConnect DB: Ensuring "work_categories" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS work_categories (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(100) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 8. Notifications Table
        console.log('CaltransBizConnect DB: Ensuring "notifications" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message_id INT,
                is_read TINYINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 9. CMS FAQs Table
        console.log('CaltransBizConnect DB: Ensuring "cms_faqs" table exists...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS cms_faqs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(100) NOT NULL DEFAULT 'General',
                question TEXT NOT NULL,
                answer LONGTEXT NOT NULL,
                sort_order INT DEFAULT 0,
                status ENUM('active', 'inactive') DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_faq_category (category),
                INDEX idx_faq_status (status),
                INDEX idx_faq_sort (sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Seed default FAQs if the table is empty
        const [[{ faqCount }]] = await db.execute('SELECT COUNT(*) AS faqCount FROM cms_faqs');
        if (faqCount === 0) {
            console.log('CaltransBizConnect DB: Seeding default FAQs...');
            const defaultFaqs = [
                ['General Questions', 0, 'Do I need to be Small Business certified to use the platform?', '<p>No, you don\'t need Small Business certification to create an account and browse opportunities. However, some opportunities may require Small Business certification. Check the requirements for each opportunity listing.</p><p><strong>How do I get Small Business certified?</strong> Visit our <a href="eligibility.html">Eligibility page</a> to learn about the Small Business certification process, requirements, and how to apply.</p>'],
                ['General Questions', 1, 'What is a capability statement?', '<p>A capability statement is a one-page document that showcases your business qualifications, past performance, and capabilities. It\'s like a resume for your business.</p><p>You can download our template from the <a href="resources.html">Resources page</a>. Capability statements must be uploaded as PDF files with a maximum size of 10MB.</p>'],
                ['General Questions', 2, 'How do I apply for an opportunity?', '<p>Each opportunity listing includes contact information for the posting agency. You\'ll need to contact them directly using the information provided and follow their specific application process.</p>'],
                ['General Questions', 3, 'Can I select multiple work categories?', '<p>Yes, you can select all work categories that apply to your business capabilities. This helps agencies find you when searching for small businesses in those categories.</p>'],
                ['For Small Businesses', 0, 'How often are new opportunities posted?', '<p>Opportunities are posted regularly as agencies have new projects. We recommend checking the platform frequently or enabling email notifications for new opportunities in your selected categories.</p>'],
                ['For Small Businesses', 1, 'How long does it take for an opportunity to be posted?', '<p>Opportunities that meet our quality standards are typically posted within 1–2 business days after submission for review.</p>'],
                ['For Small Businesses', 2, 'Can I edit an opportunity after it\'s posted?', '<p>Yes, you can edit your posted opportunities through your agency dashboard. Updates will be reflected immediately on the platform.</p>'],
                ['For Small Businesses', 3, 'How do I search for qualified small businesses?', '<p>Use the small business search feature in your dashboard to filter by work category, district, and certification status. You can review small business profiles and capability statements to find qualified partners.</p>'],
                ['For Agencies', 0, 'Who can post opportunities?', '<p>Caltrans districts, other government agencies, and agencies working on Caltrans projects can post opportunities on the platform.</p>'],
                ['For Agencies', 1, 'What information is required to post an opportunity?', '<p>You\'ll need to provide project title, description, location (district), work category, timeline, budget range, requirements, and contact information. All fields are required to ensure small businesses receive complete information.</p>'],
                ['For Agencies', 2, 'How long does it take for an opportunity to be posted?', '<p>Opportunities that meet our quality standards are typically posted within 1–2 business days after submission for review.</p>'],
                ['For Agencies', 3, 'Can I edit an opportunity after it\'s posted?', '<p>Yes, you can edit your posted opportunities through your agency dashboard. Updates will be reflected immediately on the platform.</p>'],
                ['For Agencies', 4, 'How do I search for qualified small businesses?', '<p>Use the small business search feature in your dashboard to filter by work category, district, and certification status. You can review small business profiles and capability statements to find qualified partners.</p>'],
                ['For Agencies', 5, 'What are the quality standards for opportunity postings?', '<p>All postings must include complete project information, clear requirements, realistic timelines, and accurate contact details. This ensures small businesses can make informed decisions about applying.</p>'],
                ['Technical Questions', 0, 'What browsers are supported?', '<p>CaltransBizConnect works best on the latest versions of Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.</p>'],
                ['Technical Questions', 1, 'Is the platform mobile-friendly?', '<p>Yes, CaltransBizConnect is fully responsive and works on smartphones, tablets, and desktop computers.</p>'],
                ['Technical Questions', 2, 'Is my information secure?', '<p>Yes, we use industry-standard security measures to protect your data. Your personal information is never shared without your consent.</p>'],
                ['Technical Questions', 3, 'I forgot my password. How do I reset it?', '<p>Click the "Forgot Password" link on the login page and follow the instructions to reset your password via email.</p>'],
            ];
            for (const [category, sort_order, question, answer] of defaultFaqs) {
                await db.execute(
                    `INSERT INTO cms_faqs (category, sort_order, question, answer, status) VALUES (?, ?, ?, ?, 'active')`,
                    [category, sort_order, question, answer]
                );
            }
            console.log(`CaltransBizConnect DB: Seeded ${defaultFaqs.length} default FAQs.`);
        }

        // Terminlogy Migrations for existing live databases
        console.log('CaltransBizConnect DB: Running terminology data migrations...');
        try {
            // Update user types
            await db.execute("UPDATE users SET type = 'small_business' WHERE type = 'vendor' OR type = 'small business'");
            await db.execute("UPDATE users SET type = 'agency' WHERE type = 'prime_contractor' OR type = 'prime contractor'");
            
            // Rename legacy columns
            const [appCols] = await db.execute("SHOW COLUMNS FROM applications LIKE 'vendor_id'");
            if (appCols && appCols.length > 0) {
                await db.execute("ALTER TABLE applications CHANGE vendor_id small_business_id INT NOT NULL");
            }
            const [appColsAgency] = await db.execute("SHOW COLUMNS FROM applications LIKE 'agency_id'");
            if (appColsAgency && appColsAgency.length > 0) {
                await db.execute("ALTER TABLE applications CHANGE agency_id prime_contractor_id INT");
            }
            
            const [savedCols] = await db.execute("SHOW COLUMNS FROM saved_opportunities LIKE 'vendor_id'");
            if (savedCols && savedCols.length > 0) {
                await db.execute("ALTER TABLE saved_opportunities CHANGE vendor_id small_business_id INT NOT NULL");
            }
        } catch (migErr) {
            console.warn('CaltransBizConnect DB: Terminology migration warning:', migErr.message);
        }

        // Safe migrations — add columns that may be missing from existing tables
        console.log('CaltransBizConnect DB: Running safe column migrations...');
        const migrations = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS capability_statement TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(50)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS zip VARCHAR(20)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS years_in_business VARCHAR(50)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_opportunities TEXT`,
            `ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_business_name VARCHAR(255)`,
            `ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_business_name VARCHAR(255)`,
            `ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type ENUM('invite', 'application', 'reply') DEFAULT 'reply'`,
            `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS description TEXT`,
            `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tags TEXT`,
            `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS posted_by_name VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS naics_codes TEXT`,
            `ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS naics_codes TEXT`
        ];
        for (const sql of migrations) {
            await db.execute(sql).catch(() => {}); // Ignore if column already exists
        }
        console.log('CaltransBizConnect DB: Migrations complete.');

        // Password Reset Tokens Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('CaltransBizConnect DB: All MySQL tables initialized successfully.');

        // Cleanup expired tokens every hour
        setInterval(async () => {
            try {
                const db = getDb();
                const [result] = await db.execute(
                    'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE'
                );
                if (result.affectedRows > 0) {
                    console.log(`CaltransBizConnect DB: Cleaned up ${result.affectedRows} expired/used reset tokens.`);
                }
            } catch (e) {
                console.error('CaltransBizConnect DB: Token cleanup error:', e.message);
            }
        }, 60 * 60 * 1000);
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
