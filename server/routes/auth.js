const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
    const { email, password, type, ...profileData } = req.body;
    console.log(`CaltransBizConnect Auth: Registration attempt for ${email} (${type})`);

    if (!email || !password || !type) {
        console.warn('CaltransBizConnect Auth: Registration failed - missing fields');
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, type, business_name, contact_name, phone, ein, certification_number, organization_name, address, city, zip, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            email,
            password_hash,
            type,
            profileData.businessName || null,
            profileData.contactName || null,
            profileData.phone || null,
            profileData.ein || null,
            profileData.certificationNumber || null,
            profileData.organizationName || null,
            profileData.address || profileData.businessAddress || null,
            profileData.city || null,
            profileData.zip || profileData.zipCode || null,
            profileData.website || null
        );

        console.log(`CaltransBizConnect Auth: Registration successful for ${email}, ID: ${result.lastInsertRowid}`);
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        const { password_hash: _, ...userWithoutPassword } = newUser;
        res.status(201).json(userWithoutPassword);
    } catch (error) {
        console.error(`CaltransBizConnect Auth Error during registration for ${email}:`, error);
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`CaltransBizConnect Auth: Login attempt for ${email}`);

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const match = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!user || !match) {
            console.warn(`CaltransBizConnect Auth Check: userFound=${!!user}, passwordMatch=${match} for ${email}`);
            return res.status(401).json({
                error: 'Invalid email or password',
                debug: { found: !!user, match: match } // Temporary debug info
            });
        }

        console.log(`CaltransBizConnect Auth: Login successful for ${email}`);
        const { password_hash, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error(`CaltransBizConnect Auth Error during login for ${email}:`, error);
        res.status(500).json({ error: error.message });
    }
});

// Update user profile
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const profileData = req.body;

    try {
        const stmt = db.prepare(`
            UPDATE users SET 
                business_name = COALESCE(?, business_name),
                contact_name = COALESCE(?, contact_name),
                phone = COALESCE(?, phone),
                ein = COALESCE(?, ein),
                certification_number = COALESCE(?, certification_number),
                organization_name = COALESCE(?, organization_name),
                districts = COALESCE(?, districts),
                categories = COALESCE(?, categories),
                saved_opportunities = COALESCE(?, saved_opportunities),
                capability_statement = COALESCE(?, capability_statement),
                address = COALESCE(?, address),
                city = COALESCE(?, city),
                zip = COALESCE(?, zip),
                website = COALESCE(?, website),
                years_in_business = COALESCE(?, years_in_business),
                business_description = COALESCE(?, business_description),
                certifications = COALESCE(?, certifications)
            WHERE id = ?
        `);

        stmt.run(
            profileData.businessName || profileData.business_name || null,
            profileData.contactName || profileData.contact_name || null,
            profileData.phone || null,
            profileData.ein || null,
            profileData.certificationNumber || profileData.certification_number || null,
            profileData.organizationName || null,
            (profileData.preferredDistricts || profileData.districts) ? JSON.stringify(profileData.preferredDistricts || profileData.districts) : null,
            (profileData.workCategories || profileData.categories) ? JSON.stringify(profileData.workCategories || profileData.categories) : null,
            profileData.savedOpportunities ? JSON.stringify(profileData.savedOpportunities) : null,
            profileData.capabilityStatement || profileData.capability_statement ? (profileData.capabilityStatement || profileData.capability_statement) : null,
            profileData.address || null,
            profileData.city || null,
            profileData.zip || profileData.zipCode || null,
            profileData.website || null,
            profileData.yearsInBusiness || profileData.years_in_business || null,
            profileData.businessDescription || profileData.business_description || null,
            profileData.certifications || null,
            id
        );

        const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        const { password_hash, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
