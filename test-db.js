const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'u579331817_caltrans'
        });
        console.log('Successfully connected to local MySQL as root!');
        await connection.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

testConnection();
