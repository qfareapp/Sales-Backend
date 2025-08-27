const express = require('express');
const router = express.Router();
const PartInventoryLog = require('../models/PartInventoryLog');
const Inventory = require('../models/Inventory');

// ✅ POST /api/inventory/add → log entry + update Inventory collection
router.post('/add', async (req, res) => {
  const { date, projectId, wagonType, partEntries = [] } = req.body;

  try {
    if (!date || !projectId || !wagonType) {
      return res.status(400).json({ status: 'Error', message: 'date, projectId, wagonType required' });
    }

    // 1. Log all parts in one go
    const logs = partEntries.map(({ name, quantity }) => ({
      date,
      projectId,
      wagonType,
      part: name,
      quantity
    }));
    if (logs.length > 0) await PartInventoryLog.insertMany(logs);

    // 2. Bulk update inventory
    const ops = partEntries.map(({ name, quantity }) => ({
      updateOne: {
        filter: { projectId, part: name },
        update: { $inc: { quantity } },
        upsert: true
      }
    }));
    if (ops.length > 0) await Inventory.bulkWrite(ops);

    res.status(201).json({ status: 'Success', message: 'Inventory logged & updated' });
  } catch (err) {
    console.error('❌ Inventory update error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ✅ GET /api/inventory/available/:projectId → live inventory totals
router.get('/available/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const items = await Inventory.find({ projectId }).lean();

    const formatted = {};
    items.forEach(it => {
      formatted[it.part] = {
        available: it.quantity,
        reserved: it.reserved || 0,
        minLevel: it.minLevel || 0,
        maxLevel: it.maxLevel || 0
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching inventory:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});


module.exports = router;
