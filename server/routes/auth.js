const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
    let { email, password, type, ...profileData } = req.body;

    // 1. Validation
    if (!email || !password || !type) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields (email, password, type)'
        });
    }

    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email format'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters'
        });
    }

    console.log(`CaltransBizConnect Auth: Registration attempt for ${email} (${type})`);

    try {
        const password_hash = await bcrypt.hash(password, 10);

        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, type, business_name, contact_name, phone, ein, certification_number, organization_name, address, city, zip, website, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `);

        const result = stmt.run(
            email,
            password_hash,
            type,
            profileData.businessName || profileData.business_name || null,
            profileData.contactName || profileData.contact_name || null,
            profileData.phone || null,
            profileData.ein || null,
            profileData.certificationNumber || profileData.certification_number || null,
            profileData.organizationName || profileData.organization_name || null,
            profileData.address || profileData.businessAddress || profileData.business_address || null,
            profileData.city || null,
            profileData.zip || profileData.zipCode || profileData.zip_code || null,
            profileData.website || null
        );

        console.log(`CaltransBizConnect Auth: Registration successful for ${email}, ID: ${result.lastInsertRowid}`);
        const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
        const { password_hash: _, ...userWithoutPassword } = newUser;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error(`CaltransBizConnect Auth Error during registration for ${email}:`, error);
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    console.log(`CaltransBizConnect Auth: Login attempt for ${email}`);

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const match = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!user || !match) {
            console.warn(`CaltransBizConnect Auth Check: userFound=${!!user}, passwordMatch=${match} for ${email}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                debug: { found: !!user, match: match } // Temporary debug info
            });
        }

        console.log(`CaltransBizConnect Auth: Login successful for ${email}`);
        const { password_hash, ...userWithoutPassword } = user;
        res.json({
            success: true,
            message: 'Login successful',
            user: userWithoutPassword
        });
    } catch (error) {
        console.error(`CaltransBizConnect Auth Error during login for ${email}:`, error);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
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
