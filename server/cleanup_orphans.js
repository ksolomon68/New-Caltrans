const { getDb } = require('./database');

async function runCleanup() {
    const db = getDb();
    console.log('Running Orphan Opportunity Cleanup (Cascade) for MySQL...');

    try {
        // 1. Identify Orphan IDs
        const [orphans] = await db.execute(`
            SELECT id FROM opportunities 
            WHERE posted_by IS NULL 
               OR posted_by NOT IN (SELECT id FROM users)
        `);

        if (orphans.length === 0) {
            console.log('No orphans found.');
        } else {
            const ids = orphans.map(o => o.id);
            console.log(`Found ${ids.length} orphaned opportunities.`);

            // Using standard SQL DELETE with JOIN or IN
            // MySQL will handle foreign key constraints if set to CASCADE, 
            // but we'll do it manually to match original script logic or if constraints aren't set.

            for (const id of ids) {
                await db.execute('DELETE FROM applications WHERE opportunity_id = ?', [id]);
                await db.execute('DELETE FROM messages WHERE opportunity_id = ?', [id]);
                await db.execute('DELETE FROM saved_opportunities WHERE opportunity_id = ?', [id]);
                await db.execute('DELETE FROM opportunities WHERE id = ?', [id]);
            }

            console.log(`Deleted ${ids.length} orphaned opportunities and their dependents.`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    } finally {
        process.exit(0);
    }
}

runCleanup();
