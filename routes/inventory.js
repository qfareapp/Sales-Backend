const express = require('express');
const router = express.Router();
const PartInventoryLog = require('../models/PartInventoryLog');
const Inventory = require('../models/Inventory');

// ✅ POST /api/inventory/add → log entry + update Inventory collection
router.post('/add', async (req, res) => {
  const { date, projectId, wagonType, partEntries } = req.body;

  try {
    for (const entry of partEntries) {
      const { name, quantity } = entry;

      // 1. Log the daily entry
      await PartInventoryLog.create({
        date,
        projectId,
        wagonType,
        part: name,
        quantity
      });

      // 2. Update running inventory (upsert)
      await Inventory.updateOne(
        { projectId, part: name },
        { $inc: { quantity } },
        { upsert: true }
      );
    }

    res.status(201).json({ status: 'Success', message: 'Inventory logged & updated' });
  } catch (err) {
    console.error('❌ Inventory update error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ✅ GET /api/inventory/available/:projectId → live inventory totals
router.get('/available/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    const data = await Inventory.find({ projectId });

    const formatted = {};
    data.forEach(item => {
      formatted[item.part] = item.quantity;
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
