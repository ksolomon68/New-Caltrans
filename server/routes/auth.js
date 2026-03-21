const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { sendEmail, getWelcomeEmail } = require('../config/email');
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

        const sql = `
            INSERT INTO users (email, password_hash, type, business_name, contact_name, phone, ein, certification_number, organization_name, address, city, zip, website, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `;

        const [result] = await db.execute(sql, [
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
        ]);

        console.log(`CaltransBizConnect Auth: Registration successful for ${email}, ID: ${result.insertId}`);

        // Send welcome email (non-blocking)
        const userName = profileData.contactName || profileData.contact_name || profileData.businessName || profileData.business_name || 'there';
        const { html: welcomeHtml, text: welcomeText } = getWelcomeEmail(userName, type);
        sendEmail({ to: email, subject: 'Welcome to CaltransBizConnect!', html: welcomeHtml, text: welcomeText })
            .catch(err => console.error('CaltransBizConnect Auth: Welcome email failed:', err.message));
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
        const newUser = rows[0];
        const { password_hash: _, ...userWithoutPassword } = newUser;

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, type: newUser.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error(`CaltransBizConnect Auth Error during registration for ${email}:`, error);
        if (error.code === 'ER_DUP_ENTRY' || (error.message && error.message.includes('UNIQUE constraint failed'))) {
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
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        const match = user ? await bcrypt.compare(password, user.password_hash) : false;

        if (!user || !match) {
            console.warn(`CaltransBizConnect Auth Fail: [${email}] userFound=${!!user}, passwordMatch=${match}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        console.log(`CaltransBizConnect Auth: Login successful for ${email}`);
        const { password_hash, ...userWithoutPassword } = user;

        const token = jwt.sign(
            { id: user.id, email: user.email, type: user.type },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
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
        const sql = `
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
        `;

        await db.execute(sql, [
            profileData.businessName || profileData.business_name || null,
            profileData.contactName || profileData.contact_name || null,
            profileData.phone || null,
            profileData.ein || null,
            profileData.certificationNumber || profileData.certification_number || null,
            profileData.organizationName || null,
            (profileData.preferredDistricts || profileData.districts) ? JSON.stringify(profileData.preferredDistricts || profileData.districts) : null,
            (profileData.workCategories || profileData.categories) ? JSON.stringify(profileData.workCategories || profileData.categories) : null,
            profileData.savedOpportunities ? JSON.stringify(profileData.savedOpportunities) : null,
            profileData.capabilityStatement || profileData.capability_statement ? JSON.stringify(profileData.capabilityStatement || profileData.capability_statement) : null,
            profileData.address || null,
            profileData.city || null,
            profileData.zip || profileData.zipCode || null,
            profileData.website || null,
            profileData.yearsInBusiness || profileData.years_in_business || null,
            profileData.businessDescription || profileData.business_description || null,
            profileData.certifications || null,
            id
        ]);

        const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        const updatedUser = rows[0];

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password_hash, ...userWithoutPassword } = updatedUser;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    try {
        // In a session-based auth system, we would clear server-side sessions here
        // For now, client-side clears localStorage
        console.log('CaltransBizConnect Auth: User logged out');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
