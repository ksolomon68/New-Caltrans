/**
 * One-time script to write the correct database.js to disk.
 * Run: node scripts/write_db.js
 */
const fs = require('fs');
const path = require('path');

const content = `/**
 * CaltransBizConnect - Database Module (MySQL via mysql2)
 * Replaces better-sqlite3. Uses mysql2 connection pool for async/await.
 */

const mysql = require('mysql2/promise');
const path  = require('path');

// Load production credentials first, then local .env for any missing vars
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let pool;

function getDb() {
    if (!pool) throw new Error('Database not initialized. Call initDatabase() first.');
    return pool;
}

async function initDatabase() {
    console.log('CaltransBizConnect DB: Connecting to MySQL...');
    console.log('CaltransBizConnect DB: host=' + process.env.DB_HOST + ' user=' + process.env.DB_USER + ' db=' + process.env.DB_NAME);

    pool = mysql.createPool({
        host:               process.env.DB_HOST     || 'localhost',
        user:               process.env.DB_USER     || 'root',
        password:           process.env.DB_PASSWORD || '',
        database:           process.env.DB_NAME     || 'u579331817_caltrans',
        port:               parseInt(process.env.DB_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit:    10,
        queueLimit:         0,
        charset:            'utf8mb4'
    });

    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('CaltransBizConnect DB: MySQL connection verified successfully.');

    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    await pool.execute('CREATE TABLE IF NOT EXISTS \`users\` (' +
        '\`id\` INT NOT NULL AUTO_INCREMENT,' +
        '\`email\` VARCHAR(255) NOT NULL,' +
        '\`password_hash\` VARCHAR(255) NOT NULL,' +
        '\`type\` VARCHAR(50) NOT NULL,' +
        '\`business_name\` VARCHAR(255) DEFAULT NULL,' +
        '\`contact_name\` VARCHAR(255) DEFAULT NULL,' +
        '\`phone\` VARCHAR(50) DEFAULT NULL,' +
        '\`ein\` VARCHAR(50) DEFAULT NULL,' +
        '\`certification_number\` VARCHAR(100) DEFAULT NULL,' +
        '\`business_description\` TEXT DEFAULT NULL,' +
        '\`organization_name\` VARCHAR(255) DEFAULT NULL,' +
        '\`districts\` TEXT DEFAULT NULL,' +
        '\`categories\` TEXT DEFAULT NULL,' +
        '\`status\` VARCHAR(50) NOT NULL DEFAULT \\'active\\',' +
        '\`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '\`saved_opportunities\` TEXT DEFAULT NULL,' +
        '\`capability_statement\` TEXT DEFAULT NULL,' +
        '\`website\` VARCHAR(500) DEFAULT NULL,' +
        '\`address\` VARCHAR(500) DEFAULT NULL,' +
        '\`city\` VARCHAR(100) DEFAULT NULL,' +
        '\`state\` VARCHAR(50) DEFAULT NULL,' +
        '\`zip\` VARCHAR(20) DEFAULT NULL,' +
        '\`years_in_business\` VARCHAR(50) DEFAULT NULL,' +
        '\`certifications\` TEXT DEFAULT NULL,' +
        'PRIMARY KEY (\`id\`),' +
        'UNIQUE KEY \`uq_users_email\` (\`email\`)' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    await pool.execute('CREATE TABLE IF NOT EXISTS \`opportunities\` (' +
        '\`id\` VARCHAR(100) NOT NULL,' +
        '\`title\` VARCHAR(500) NOT NULL,' +
        '\`scope_summary\` TEXT NOT NULL,' +
        '\`district\` VARCHAR(20) NOT NULL,' +
        '\`district_name\` VARCHAR(255) NOT NULL,' +
        '\`category\` VARCHAR(100) NOT NULL,' +
        '\`category_name\` VARCHAR(255) NOT NULL,' +
        '\`subcategory\` VARCHAR(255) DEFAULT NULL,' +
        '\`estimated_value\` VARCHAR(100) DEFAULT NULL,' +
        '\`due_date\` VARCHAR(50) DEFAULT NULL,' +
        '\`due_time\` VARCHAR(50) DEFAULT NULL,' +
        '\`submission_method\` VARCHAR(255) DEFAULT NULL,' +
        '\`status\` VARCHAR(50) NOT NULL DEFAULT \\'published\\',' +
        '\`posted_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '\`posted_by\` INT DEFAULT NULL,' +
        '\`attachments\` TEXT DEFAULT NULL,' +
        '\`duration\` VARCHAR(255) DEFAULT NULL,' +
        '\`requirements\` TEXT DEFAULT NULL,' +
        '\`certifications\` TEXT DEFAULT NULL,' +
        '\`experience\` TEXT DEFAULT NULL,' +
        'PRIMARY KEY (\`id\`),' +
        'CONSTRAINT \`fk_opps_posted_by\` FOREIGN KEY (\`posted_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    await pool.execute('CREATE TABLE IF NOT EXISTS \`applications\` (' +
        '\`id\` INT NOT NULL AUTO_INCREMENT,' +
        '\`opportunity_id\` VARCHAR(100) NOT NULL,' +
        '\`small_business_id\` INT NOT NULL,' +
        '\`prime_contractor_id\` INT DEFAULT NULL,' +
        '\`status\` VARCHAR(50) NOT NULL DEFAULT \\'pending\\',' +
        '\`applied_date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        '\`notes\` TEXT DEFAULT NULL,' +
        'PRIMARY KEY (\`id\`),' +
        'CONSTRAINT \`fk_apps_opportunity\` FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\` (\`id\`) ON DELETE CASCADE,' +
        'CONSTRAINT \`fk_apps_vendor\` FOREIGN KEY (\`small_business_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    await pool.execute('CREATE TABLE IF NOT EXISTS \`saved_opportunities\` (' +
        '\`id\` INT NOT NULL AUTO_INCREMENT,' +
        '\`small_business_id\` INT NOT NULL,' +
        '\`opportunity_id\` VARCHAR(100) NOT NULL,' +
        '\`saved_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        'PRIMARY KEY (\`id\`),' +
        'UNIQUE KEY \`uq_saved\` (\`small_business_id\`, \`opportunity_id\`),' +
        'CONSTRAINT \`fk_saved_vendor\` FOREIGN KEY (\`small_business_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,' +
        'CONSTRAINT \`fk_saved_opportunity\` FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\` (\`id\`) ON DELETE CASCADE' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    await pool.execute('CREATE TABLE IF NOT EXISTS \`messages\` (' +
        '\`id\` INT NOT NULL AUTO_INCREMENT,' +
        '\`sender_id\` INT NOT NULL,' +
        '\`receiver_id\` INT NOT NULL,' +
        '\`opportunity_id\` VARCHAR(100) DEFAULT NULL,' +
        '\`subject\` VARCHAR(500) DEFAULT NULL,' +
        '\`body\` TEXT NOT NULL,' +
        '\`is_read\` TINYINT(1) NOT NULL DEFAULT 0,' +
        '\`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,' +
        'PRIMARY KEY (\`id\`),' +
        'CONSTRAINT \`fk_msg_sender\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,' +
        'CONSTRAINT \`fk_msg_receiver\` FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,' +
        'CONSTRAINT \`fk_msg_opportunity\` FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\` (\`id\`) ON DELETE SET NULL' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('CaltransBizConnect DB: All tables verified/created.');
}

// Proxy allows \`const { db } = require('../database')\` to work after initDatabase()
module.exports = {
    db: new Proxy({}, {
        get(_, prop) {
            const p = getDb();
            if (typeof p[prop] === 'function') return p[prop].bind(p);
            return p[prop];
        }
    }),
    getDb,
    initDatabase
};
`;

const target = path.join(__dirname, '../server/database.js');
fs.writeFileSync(target, content, 'utf8');
console.log('SUCCESS: database.js written. Bytes:', fs.statSync(target).size);
console.log('First line:', fs.readFileSync(target, 'utf8').split('\n')[0]);
