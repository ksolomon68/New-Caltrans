const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Adjusted path to server/data.db
const dbPath = path.join(__dirname, '../server/data.db');
const db = new Database(dbPath, { readonly: true });

console.log(`Exporting SQLite data from ${dbPath} to JSON...\n`);

// Export tables
const tables = ['users', 'opportunities', 'applications', 'saved_opportunities', 'messages'];
const exportData = {};

tables.forEach(tableName => {
    try {
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        exportData[tableName] = rows;
        console.log(`✓ Exported ${rows.length} rows from ${tableName}`);
    } catch (err) {
        console.error(`✗ Error exporting ${tableName}:`, err.message);
        exportData[tableName] = [];
    }
});

// Save to JSON file
const outputPath = path.join(__dirname, '../data-export.json');
fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
console.log(`\n✓ Data exported to: ${outputPath}`);

db.close();
