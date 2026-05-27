const express = require('express');
const { db } = require('../database');
const router = express.Router();

/**
 * GET /api/filters/districts
 * Returns all districts from the database
 */
router.get('/districts', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name, region FROM districts ORDER BY id ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/filters/work-categories
 * Returns all work categories from the database
 */
router.get('/work-categories', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, name FROM work_categories ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching work categories:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
