const mysql = require('mysql2/promise');

async function testConnection() {
    try {
        const connection = await mysql.createConnection({
            host: 'caltransbizconnect.org',
            user: 'u579331817_caltrans',
            password: ',_>!5V\\VEYP]Nl[W^Fv)',
            database: 'u579331817_caltrans'
        });
        console.log('Successfully connected to local MySQL as root!');
        await connection.end();
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
}

testConnection();
