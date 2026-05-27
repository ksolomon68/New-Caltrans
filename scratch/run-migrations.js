const { initDatabase } = require('../server/database');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root (one level up from scratch/)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    console.log('Starting manual database initialization from workspace scratch/ folder...');
    try {
        await initDatabase();
        console.log('Database initialization and migrations completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Database initialization failed:', err);
        process.exit(1);
    }
}

run();
