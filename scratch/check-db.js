const { getDb } = require('../server/database');

async function checkCategories() {
    try {
        const db = getDb();
        const [rows] = await db.execute('SELECT DISTINCT category FROM cms_faqs');
        console.log('Categories in DB:');
        rows.forEach(r => console.log(`- ${r.category}`));
        
        const [agencies] = await db.execute("SELECT id, question FROM cms_faqs WHERE category = 'For Agencies'");
        if (agencies.length > 0) {
            console.log('\nFAQs with "For Agencies" category:');
            agencies.forEach(f => console.log(`[${f.id}] ${f.question}`));
        } else {
            console.log('\nNo FAQs with "For Agencies" category found.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}

checkCategories();
