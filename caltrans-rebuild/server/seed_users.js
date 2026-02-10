const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

async function seedAdminUser() {
    try {
        const db = getDb();

        // Check if admin already exists
        const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@caltransbizconnect.org');

        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash('Admin123!', 10);

        // Insert admin user
        const stmt = db.prepare(`
            INSERT INTO users (
                email, password_hash, type, contact_name, 
                business_name, organization_name, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `);

        const result = stmt.run(
            'admin@caltransbizconnect.org',
            hashedPassword,
            'admin',
            'System Administrator',
            'CaltransBizConnect',
            'CaltransBizConnect Administration'
        );

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@caltransbizconnect.org');
        console.log('🔑 Password: Admin123!');
        console.log('⚠️  IMPORTANT: Change this password after first login!');
        console.log(`User ID: ${result.lastInsertRowid}`);

    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
        process.exit(1);
    }
}

seedAdminUser();
