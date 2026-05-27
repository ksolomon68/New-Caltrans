/**
 * CaltransBizConnect — startup diagnostics
 * Run via cPanel Node.js Selector → "Run JS script" → diagnose.js
 */
const path = require('path');
const fs   = require('fs');

console.log('=== CaltransBizConnect Diagnostics ===');
console.log('Node.js version :', process.version);
console.log('NODE_ENV        :', process.env.NODE_ENV || '(not set)');
console.log('PORT            :', process.env.PORT     || '(not set — will default to 3001)');
console.log('CWD             :', process.cwd());
console.log('');

// --- .env.production ---
const envProd = path.join(__dirname, '.env.production');
console.log('.env.production exists:', fs.existsSync(envProd));
if (fs.existsSync(envProd)) {
    require('dotenv').config({ path: envProd });
    console.log('DB_HOST :', process.env.DB_HOST || '(not set)');
    console.log('DB_USER :', process.env.DB_USER || '(not set)');
    console.log('DB_NAME :', process.env.DB_NAME || '(not set)');
}
console.log('');

// --- Module checks ---
const modules = ['express', 'mysql2', 'jsonwebtoken', 'bcryptjs', 'helmet', 'multer', 'nodemailer', 'cors'];
console.log('--- Module load checks ---');
for (const m of modules) {
    try {
        require(m);
        console.log(`  ${m}: OK`);
    } catch (e) {
        console.log(`  ${m}: FAIL — ${e.message}`);
    }
}
console.log('');

// --- Route files ---
console.log('--- Route file checks ---');
const routes = ['auth','opportunities','users','messages','applications','notifications','admin','upload','small-businesses','cms','filters','password-reset','contact'];
for (const r of routes) {
    try {
        require(`./server/routes/${r}`);
        console.log(`  routes/${r}: OK`);
    } catch (e) {
        console.log(`  routes/${r}: FAIL — ${e.message}`);
    }
}
console.log('');

// --- DB connection test ---
console.log('--- Database connection test ---');
(async () => {
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host:     process.env.DB_HOST     || 'localhost',
            user:     process.env.DB_USER     || '',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME     || '',
            port:     parseInt(process.env.DB_PORT || '3306', 10),
            connectTimeout: 5000
        });
        await conn.execute('SELECT 1');
        await conn.end();
        console.log('  MySQL connection: OK');
    } catch (e) {
        console.log('  MySQL connection: FAIL —', e.message);
    }
    console.log('');
    console.log('=== End of diagnostics ===');
    process.exit(0);
})();
