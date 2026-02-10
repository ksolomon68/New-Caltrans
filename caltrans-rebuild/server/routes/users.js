const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Get public users list (filtered by type, district, category)
router.get('/', (req, res) => {
    const { type, district, category, search } = req.query;

    try {
        let query = "SELECT id, email, type, business_name, organization_name, contact_name, phone, districts, categories, business_description, certifications, years_in_business, capability_statement, created_at FROM users WHERE 1=1";
        const params = [];

        if (type) {
            query += " AND type = ?";
            params.push(type);
        }

        if (district) {
            // Check if districts JSON array contains the district
            // SQLite doesn't have great JSON support in older versions, so we might need to filter in JS or use LIKE
            // Assuming simpler implementation for now: plain text search in JSON string
            query += " AND districts LIKE ?";
            params.push(`%${district}%`);
        }

        if (category) {
            query += " AND categories LIKE ?";
            params.push(`%${category}%`);
        }

        if (search) {
            query += " AND (business_name LIKE ? OR organization_name LIKE ? OR email LIKE ?)";
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        query += " ORDER BY created_at DESC LIMIT 50";

        const users = db.prepare(query).all(params);

        // Parse JSON fields safely
        const processedUsers = users.map(user => {
            let districts = [];
            let categories = [];
            try {
                districts = user.districts ? (typeof user.districts === 'string' && user.districts.startsWith('[') ? JSON.parse(user.districts) : [user.districts]) : [];
                categories = user.categories ? (typeof user.categories === 'string' && user.categories.startsWith('[') ? JSON.parse(user.categories) : [user.categories]) : [];
            } catch (e) {
                console.warn(`Failed to parse fields for user ${user.id}`, e);
                districts = user.districts ? [user.districts] : [];
                categories = user.categories ? [user.categories] : [];
            }
            return { ...user, districts, categories };
        });

        res.json(processedUsers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get public user profile by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    console.log(`Fetching user profile for ID: ${id}`);

    try {
        const user = db.prepare(`
            SELECT id, email, type, business_name, organization_name, contact_name, 
                   phone, ein, certification_number, districts, categories, business_description, 
                   capability_statement, website, address, city, state, zip, years_in_business, certifications, created_at 
            FROM users WHERE id = ?
        `).get(id);

        if (!user) {
            console.warn(`User with ID ${id} not found in database.`);
            return res.status(404).json({ error: 'User not found' });
        }

        // Parse JSON fields safely
        try {
            user.districts = user.districts ? (typeof user.districts === 'string' && user.districts.startsWith('[') ? JSON.parse(user.districts) : [user.districts]) : [];
            user.categories = user.categories ? (typeof user.categories === 'string' && user.categories.startsWith('[') ? JSON.parse(user.categories) : [user.categories]) : [];
        } catch (e) {
            console.warn(`Failed to parse fields for user ${user.id}`, e);
            user.districts = user.districts ? [user.districts] : [];
            user.categories = user.categories ? [user.categories] : [];
        }

        res.json(user);
    } catch (error) {
        console.error(`Error fetching user profile for ID ${id}:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        business_name, organization_name, contact_name, phone,
        website, address, city, state, zip, description,
        certifications, years_in_business, districts, categories,
        email_notifications, weekly_reports, deadline_alerts
    } = req.body;

    // Use business_description or description
    const bizDesc = description || req.body.business_description;

    try {
        // Fetch existing user to prevent overwriting with nulls
        const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Merge existing data with new data (preserving existing if new is undefined/null)
        // For partial updates, we check if key exists in body. 
        // But body might be partial. using || existing might keep old value if we want to clear it?
        // Assuming we want to update only provided fields or use existing.
        // If the frontend explicitly sends null, we might want to clear it, but here we assume missing in payload means "keep existing".

        const safeVal = (newVal, oldVal) => (newVal !== undefined ? newVal : oldVal);

        const newBusinessName = safeVal(business_name, existingUser.business_name);
        const newOrgName = safeVal(organization_name, existingUser.organization_name);
        const newContactName = safeVal(contact_name, existingUser.contact_name);
        const newPhone = safeVal(phone, existingUser.phone);
        const newWebsite = safeVal(website, existingUser.website);
        const newAddress = safeVal(address, existingUser.address);
        const newCity = safeVal(city, existingUser.city);
        const newState = safeVal(state, existingUser.state);
        const newZip = safeVal(zip, existingUser.zip);
        const newDesc = safeVal(bizDesc, existingUser.business_description);
        const newCerts = safeVal(certifications, existingUser.certifications);
        const newYears = safeVal(years_in_business, existingUser.years_in_business);

        // Handle JSON arrays specially
        let newDistricts = existingUser.districts;
        if (districts !== undefined) {
            newDistricts = Array.isArray(districts) ? JSON.stringify(districts) : districts;
        }

        let newCategories = existingUser.categories;
        if (categories !== undefined) {
            newCategories = Array.isArray(categories) ? JSON.stringify(categories) : categories;
        }

        const stmt = db.prepare(`
            UPDATE users SET 
                business_name = ?, organization_name = ?, contact_name = ?, phone = ?,
                website = ?, address = ?, city = ?, state = ?, zip = ?,
                business_description = ?, certifications = ?, years_in_business = ?,
                districts = ?, categories = ?
            WHERE id = ?
        `);

        const result = stmt.run(
            newBusinessName, newOrgName, newContactName, newPhone,
            newWebsite, newAddress, newCity, newState, newZip,
            newDesc, newCerts, newYears,
            newDistricts, newCategories,
            id
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch updated user to return
        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        res.json(updatedUser);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
