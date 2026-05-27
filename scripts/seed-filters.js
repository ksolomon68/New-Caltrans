const fs = require('fs');
const path = require('path');
const { initDatabase, getDb } = require('../server/database');

async function seedFilters() {
    console.log('Starting filter seeding...');
    
    try {
        await initDatabase();
        const db = getDb();
        
        // Seed Districts
        const districtsPath = path.join(__dirname, '../data/districts.json');
        if (fs.existsSync(districtsPath)) {
            const districtsData = JSON.parse(fs.readFileSync(districtsPath, 'utf8'));
            console.log(`Seeding ${districtsData.districts.length} districts...`);
            
            for (const district of districtsData.districts) {
                await db.execute(
                    'INSERT IGNORE INTO districts (id, name, region) VALUES (?, ?, ?)',
                    [district.id, district.name, district.region || null]
                );
            }
        }
        
        // Seed Work Categories
        const categoriesPath = path.join(__dirname, '../data/work-categories.json');
        if (fs.existsSync(categoriesPath)) {
            const categoriesData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
            console.log(`Seeding ${categoriesData.categories.length} categories...`);
            
            for (const category of categoriesData.categories) {
                await db.execute(
                    'INSERT IGNORE INTO work_categories (id, name) VALUES (?, ?)',
                    [category.id, category.name]
                );
            }
        }
        
        console.log('Filter seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding filters:', error);
        process.exit(1);
    }
}

seedFilters();
