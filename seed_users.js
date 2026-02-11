const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, './server/data.db');
const db = new Database(dbPath);

async function seed() {
    console.log('CaltransBizConnect Seed: Starting user seeding...');

    const users = [
        {
            email: 'ks@evobrand.net',
            password: 'Shadow01!',
            type: 'admin',
            business_name: 'Caltrans Admin'
        },
        {
            email: 'vendor@test.com',
            password: 'password123',
            type: 'vendor',
            business_name: 'Test Vendor Co.'
        },
        {
            email: 'agency@test.com',
            password: 'password123',
            type: 'agency',
            organization_name: 'Test Agency'
        }
    ];

    for (const user of users) {
        try {
            const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
            if (exists) {
                console.log(`CaltransBizConnect Seed: User ${user.email} already exists, skipping.`);
                continue;
            }

            const hash = await bcrypt.hash(user.password, 10);
            db.prepare(`
                INSERT INTO users (email, password_hash, type, business_name, organization_name, status) 
                VALUES (?, ?, ?, ?, ?, 'active')
            `).run(
                user.email,
                hash,
                user.type,
                user.business_name || null,
                user.organization_name || null
            );
            console.log(`CaltransBizConnect Seed: Created user ${user.email} (${user.type})`);
        } catch (e) {
            console.error(`CaltransBizConnect Seed Error for ${user.email}:`, e.message);
        }
    }

    console.log('CaltransBizConnect Seed: Seeding complete.');
    db.close();
}

seed();
