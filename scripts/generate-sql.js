const fs = require('fs');
const path = require('path');

const dataExportPath = path.resolve(__dirname, '../data-export.json');
const sqlOutputPath = path.resolve(__dirname, '../caltrans-db.sql');

async function generateSQL() {
    console.log('Generating SQL dump from data-export.json...');

    if (!fs.existsSync(dataExportPath)) {
        console.error('Error: data-export.json not found. Cannot generate SQL dump.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataExportPath, 'utf-8'));
    let sql = `-- CaltransBizConnect MySQL Dump\n-- Generated on ${new Date().toISOString()}\n\n`;

    sql += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

    // 1. Drop Tables (Reverse Dependency Order)
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Drop tables\n`;
    sql += `-- --------------------------------------------------------\n\n`;
    sql += `
DROP TABLE IF EXISTS \`messages\`;
DROP TABLE IF EXISTS \`saved_opportunities\`;
DROP TABLE IF EXISTS \`applications\`;
DROP TABLE IF EXISTS \`opportunities\`;
DROP TABLE IF EXISTS \`users\`;
`;

    // 2. Create Tables (Forward Dependency Order)
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Table structures\n`;
    sql += `-- --------------------------------------------------------\n\n`;

    sql += `
CREATE TABLE \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`email\` VARCHAR(255) UNIQUE NOT NULL,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`type\` VARCHAR(50) NOT NULL,
    \`business_name\` VARCHAR(255),
    \`contact_name\` VARCHAR(255),
    \`phone\` VARCHAR(50),
    \`ein\` VARCHAR(50),
    \`certification_number\` VARCHAR(100),
    \`business_description\` TEXT,
    \`organization_name\` VARCHAR(255),
    \`districts\` TEXT,
    \`categories\` TEXT,
    \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`saved_opportunities\` TEXT,
    \`capability_statement\` TEXT,
    \`website\` VARCHAR(255),
    \`address\` VARCHAR(255),
    \`city\` VARCHAR(100),
    \`state\` VARCHAR(50),
    \`zip\` VARCHAR(20),
    \`years_in_business\` VARCHAR(50),
    \`certifications\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`opportunities\` (
    \`id\` VARCHAR(100) PRIMARY KEY,
    \`title\` VARCHAR(255) NOT NULL,
    \`scope_summary\` TEXT NOT NULL,
    \`district\` VARCHAR(50) NOT NULL,
    \`district_name\` VARCHAR(100) NOT NULL,
    \`category\` VARCHAR(100) NOT NULL,
    \`category_name\` VARCHAR(100) NOT NULL,
    \`subcategory\` VARCHAR(100),
    \`estimated_value\` VARCHAR(100),
    \`due_date\` VARCHAR(50),
    \`due_time\` VARCHAR(50),
    \`submission_method\` VARCHAR(255),
    \`status\` VARCHAR(50) NOT NULL DEFAULT 'published',
    \`posted_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`posted_by\` INT,
    \`attachments\` TEXT,
    \`duration\` VARCHAR(100),
    \`requirements\` TEXT,
    \`certifications\` TEXT,
    \`experience\` TEXT,
    INDEX (\`posted_by\`),
    FOREIGN KEY (\`posted_by\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`applications\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`opportunity_id\` VARCHAR(100) NOT NULL,
    \`small_business_id\` INT NOT NULL,
    \`prime_contractor_id\` INT,
    \`status\` VARCHAR(50) NOT NULL DEFAULT 'pending',
    \`applied_date\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`notes\` TEXT,
    UNIQUE(\`opportunity_id\`, \`small_business_id\`),
    INDEX (\`opportunity_id\`),
    INDEX (\`small_business_id\`),
    FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`small_business_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`saved_opportunities\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`small_business_id\` INT NOT NULL,
    \`opportunity_id\` VARCHAR(100) NOT NULL,
    \`saved_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(\`small_business_id\`, \`opportunity_id\`),
    INDEX (\`opportunity_id\`),
    INDEX (\`small_business_id\`),
    FOREIGN KEY (\`small_business_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE \`messages\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`sender_id\` INT NOT NULL,
    \`receiver_id\` INT NOT NULL,
    \`opportunity_id\` VARCHAR(100),
    \`subject\` VARCHAR(255),
    \`body\` TEXT NOT NULL,
    \`is_read\` TINYINT DEFAULT 0,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (\`sender_id\`),
    INDEX (\`receiver_id\`),
    FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`receiver_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
    FOREIGN KEY (\`opportunity_id\`) REFERENCES \`opportunities\`(\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`;

    // Helper to escape values
    const esc = (val) => {
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        let str = String(val);
        str = str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return `'${str}'`;
    };

    // 2. Data Inserts
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Dumping data\n`;
    sql += `-- --------------------------------------------------------\n\n`;

    // Users
    if (data.users && data.users.length > 0) {
        sql += `-- Dumping data for table \`users\`\n`;
        for (const u of data.users) {
            const cols = Object.keys(u);
            const vals = cols.map(c => esc(u[c]));
            sql += `INSERT IGNORE INTO \`users\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')});\n`;
        }
        sql += `\n`;
    }

    // Opportunities
    if (data.opportunities && data.opportunities.length > 0) {
        sql += `-- Dumping data for table \`opportunities\`\n`;
        for (const o of data.opportunities) {
            const cols = Object.keys(o);
            const vals = cols.map(c => esc(o[c]));
            sql += `INSERT IGNORE INTO \`opportunities\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')});\n`;
        }
        sql += `\n`;
    }

    // Applications
    if (data.applications && data.applications.length > 0) {
        sql += `-- Dumping data for table \`applications\`\n`;
        for (const a of data.applications) {
            const cols = Object.keys(a);
            const vals = cols.map(c => esc(a[c]));
            sql += `INSERT IGNORE INTO \`applications\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')});\n`;
        }
        sql += `\n`;
    }

    // Saved Opps
    if (data.saved_opportunities && data.saved_opportunities.length > 0) {
        sql += `-- Dumping data for table \`saved_opportunities\`\n`;
        for (const s of data.saved_opportunities) {
            const cols = Object.keys(s);
            const vals = cols.map(c => esc(s[c]));
            sql += `INSERT IGNORE INTO \`saved_opportunities\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')});\n`;
        }
        sql += `\n`;
    }

    // Messages
    if (data.messages && data.messages.length > 0) {
        sql += `-- Dumping data for table \`messages\`\n`;
        for (const m of data.messages) {
            const cols = Object.keys(m);
            const vals = cols.map(c => esc(m[c]));
            sql += `INSERT IGNORE INTO \`messages\` (\`${cols.join('`, `')}\`) VALUES (${vals.join(', ')});\n`;
        }
        sql += `\n`;
    }

    sql += `SET FOREIGN_KEY_CHECKS=1;\n`;

    fs.writeFileSync(sqlOutputPath, sql, 'utf8');
    console.log(`Successfully wrote SQL dump to ${sqlOutputPath}`);
}

generateSQL();
