const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importData() {
    console.log('Importing data to MySQL...\n');

    // Read exported data
    const dataPath = path.join(__dirname, '../data-export.json');
    if (!fs.existsSync(dataPath)) {
        console.error('✗ Export file not found at:', dataPath);
        process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Connect to MySQL
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    console.log('✓ Connected to MySQL\n');

    // Import users
    if (data.users && data.users.length > 0) {
        console.log(`Importing ${data.users.length} users...`);
        for (const user of data.users) {
            await connection.execute(
                `INSERT INTO users (id, email, password_hash, type, business_name, contact_name, 
                 phone, ein, certification_number, business_description, organization_name, 
                 districts, categories, status, created_at, saved_opportunities, 
                 capability_statement, website, address, city, state, zip, 
                 years_in_business, certifications) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id, user.email, user.password_hash, user.type, user.business_name,
                    user.contact_name, user.phone, user.ein, user.certification_number,
                    user.business_description, user.organization_name, user.districts,
                    user.categories, user.status, user.created_at, user.saved_opportunities,
                    user.capability_statement, user.website, user.address, user.city,
                    user.state, user.zip, user.years_in_business, user.certifications
                ]
            );
        }
        console.log('✓ Users imported\n');
    }

    // Import opportunities
    if (data.opportunities && data.opportunities.length > 0) {
        console.log(`Importing ${data.opportunities.length} opportunities...`);
        for (const opp of data.opportunities) {
            await connection.execute(
                `INSERT INTO opportunities (id, title, scope_summary, district, district_name, 
                 category, category_name, subcategory, estimated_value, due_date, due_time, 
                 submission_method, status, posted_date, posted_by, attachments, duration, 
                 requirements, certifications, experience) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    opp.id, opp.title, opp.scope_summary, opp.district, opp.district_name,
                    opp.category, opp.category_name, opp.subcategory, opp.estimated_value,
                    opp.due_date, opp.due_time, opp.submission_method, opp.status,
                    opp.posted_date, opp.posted_by, opp.attachments, opp.duration,
                    opp.requirements, opp.certifications, opp.experience
                ]
            );
        }
        console.log('✓ Opportunities imported\n');
    }

    // Import saved_opportunities
    if (data.saved_opportunities && data.saved_opportunities.length > 0) {
        console.log(`Importing ${data.saved_opportunities.length} saved opportunities...`);
        for (const saved of data.saved_opportunities) {
            await connection.execute(
                `INSERT INTO saved_opportunities (id, small_business_id, opportunity_id, saved_at) 
                 VALUES (?, ?, ?, ?)`,
                [saved.id, saved.small_business_id, saved.opportunity_id, saved.saved_at]
            );
        }
        console.log('✓ Saved opportunities imported\n');
    }

    // Import messages
    if (data.messages && data.messages.length > 0) {
        console.log(`Importing ${data.messages.length} messages...`);
        for (const msg of data.messages) {
            await connection.execute(
                `INSERT INTO messages (id, sender_id, receiver_id, opportunity_id, subject, 
                 body, is_read, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    msg.id, msg.sender_id, msg.receiver_id, msg.opportunity_id,
                    msg.subject, msg.body, msg.is_read, msg.created_at
                ]
            );
        }
        console.log('✓ Messages imported\n');
    }

    await connection.end();
    console.log('\n✓ Import complete!');
}

importData().catch(err => {
    console.error('Import error:', err);
    process.exit(1);
});
