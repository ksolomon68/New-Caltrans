const { getDb } = require('./database');
const bcrypt = require('bcryptjs');

async function runFix() {
    const db = getDb();
    console.log('Running Data Attribution Fix for MySQL...');

    try {
        // 1. Ensure Test Agent Exists
        const testAgentEmail = 'agency@test.com';
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [testAgentEmail]);
        let agent = rows[0];

        if (!agent) {
            console.log('Test agent not found, creating...');
            const hash = await bcrypt.hash('Password123!', 10);
            const [info] = await db.execute(`
                INSERT INTO users (email, password_hash, type, organization_name, status)
                VALUES (?, ?, ?, ?, ?)
            `, [testAgentEmail, hash, 'agency', 'Test Agency Dept', 'active']);

            agent = { id: info.insertId };
            console.log(`Created test agent with ID: ${agent.id}`);
        } else {
            console.log(`Found test agent with ID: ${agent.id}`);
        }

        // 2. Update Opportunities
        const [result] = await db.execute(`
            UPDATE opportunities 
            SET posted_by = ? 
            WHERE posted_by IS NULL
        `, [agent.id]);

        console.log(`Attributed ${result.affectedRows} opportunities to agent ID ${agent.id}.`);
    } catch (error) {
        console.error('Fix attribution error:', error);
    } finally {
        process.exit(0);
    }
}

runFix();
