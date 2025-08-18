const express = require('express');
const router = express.Router();
const WagonConfig = require('../models/WagonConfig');

// CREATE/UPDATE a wagon config
router.post('/', async (req, res) => {
  try {
    let { wagonType, parts, stages } = req.body;

    if (!wagonType) {
      return res.status(400).json({ error: 'wagonType is required' });
    }

    wagonType = String(wagonType).trim();

    // Normalize parts
    parts = Array.isArray(parts)
      ? parts.map(p => ({
          name: String(p?.name || '').trim(),
          total: Number(p?.total || 0)
        })).filter(p => p.name)
      : [];

    // Normalize stages (with partUsage)
    stages = Array.isArray(stages)
      ? stages.map(s => ({
          name: String(s?.name || '').trim(),
          partUsage: Array.isArray(s?.partUsage)
            ? s.partUsage.map(u => ({
                name: String(u?.name || '').trim(),
                used: Number(u?.used || 0)
              })).filter(u => u.name)
            : []
        })).filter(s => s.name)
      : [];

    const saved = await WagonConfig.findOneAndUpdate(
      { wagonType },                        // match on wagonType
      { wagonType, parts, stages },         // ensure wagonType is stored too
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(saved);
  } catch (err) {
    console.error('❌ Error saving wagon config:', err);
    res.status(500).json({ error: 'Failed to save wagon config' });
  }
});

// GET all configs
router.get('/', async (_req, res) => {
  try {
    const configs = await WagonConfig.find().sort({ wagonType: 1 }).lean();
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

// GET normalized BOM for a type (case-insensitive)
router.get('/bom/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({ wagonType: new RegExp(`^${safe}$`, 'i') }).lean();
    if (!doc) return res.status(404).json({ error: `No BOM found for wagonType ${req.params.wagonType}` });

    const parts = (doc.parts || []).map(p => ({ name: p.name, total: Number(p.total || 0) }));
    const stages = (doc.stages || []).map(s => ({
      name: s.name,
      partUsage: (s.partUsage || []).map(u => ({ name: u.name, used: Number(u.used || 0) }))
    }));

    res.json({ wagonType: doc.wagonType, parts, stages });
  } catch (err) {
    console.error('❌ Error fetching BOM:', err);
    res.status(500).json({ error: 'Failed to fetch BOM' });
  }
});

// GET a single wagon config by wagonType (case-insensitive)
router.get('/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({ wagonType: new RegExp(`^${safe}$`, 'i') }).lean();

    if (!doc) {
      return res.status(404).json({ error: `No config found for wagonType ${req.params.wagonType}` });
    }

    res.json(doc); // return raw config (with parts + stages arrays)
  } catch (err) {
    console.error('❌ Error fetching wagon config:', err);
    res.status(500).json({ error: 'Failed to fetch wagon config' });
  }
});

module.exports = router;
