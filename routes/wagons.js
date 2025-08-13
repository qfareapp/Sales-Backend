const express = require('express');
const router = express.Router();
const WagonConfig = require('../models/wagonConfig');
const WagonBOM = require('../models/WagonBOM'); // ✅ Import BOM model

// POST or update wagon config and sync BOM
router.post('/', async (req, res) => {
  try {
    const { wagonType, parts, stages } = req.body;

    // ✅ Save or update wagon configuration
    const saved = await WagonConfig.findOneAndUpdate(
      { wagonType },
      { parts, stages },
      { upsert: true, new: true }
    );

    // ✅ Sync BOM parts to WagonBOM collection
    const bomParts = {};
    parts.forEach(p => {
      const key = p.name.replace(/\s+/g, '');
      bomParts[key] = parseInt(p.total);
    });

    await WagonBOM.findOneAndUpdate(
      { wagonType },
      { wagonType, parts: bomParts },
      { upsert: true, new: true }
    );

    res.json(saved);
  } catch (err) {
    console.error('❌ Error saving wagon config and BOM:', err);
    res.status(500).json({ error: 'Failed to save wagon config' });
  }
});

// GET all wagon configurations
router.get('/', async (req, res) => {
  try {
    const configs = await WagonConfig.find();
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

module.exports = router;
