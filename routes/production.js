const express = require('express');
const router = express.Router();
const ProductionPlan = require('../models/ProductionPlan');
const Inventory = require('../models/Inventory');
const WagonConfig = require('../models/WagonConfig');
const DailyWagonLog = require('../models/DailyWagonLog'); // ✅ Log model

// ----------------------
// ✅ Monthly Planning
// ----------------------
router.post('/monthly-planning', async (req, res) => {
  try {
    const plan = new ProductionPlan(req.body);
    await plan.save();
    res.json({ status: 'Success' });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

router.get('/monthly-planning', async (req, res) => {
  try {
    const plans = await ProductionPlan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Daily Wagon Update (hardened)
// ----------------------
router.post('/daily-wagon-update', async (req, res) => {
  const {
    date,
    projectId,
    wagonType,
    partsProduced = {},
    stagesCompleted = {},
    wagonReadyCount = 0
  } = req.body;

  try {
    // 🔒 Validate inputs
    if (!date || !projectId || !wagonType) {
      return res.status(400).json({
        status: 'Error',
        message: 'date, projectId, and wagonType are required'
      });
    }

    // 1. 🔼 Update inventory with produced parts (Stock In)
    for (const part in partsProduced) {
      const qty = partsProduced[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: qty } },
        { upsert: true }
      );
    }

    // 2. 📦 Get BOM for the selected wagon type (from WagonConfig)
const bom = await WagonConfig.findOne({ wagonType }).lean();
if (!bom) {
  return res.status(400).json({
    status: 'Error',
    message: `No BOM found for wagonType ${wagonType}`
  });
}

    // 3. 🧮 Compute parts consumed across all completed stages (using stage.partUsage)
const totalPartsToConsume = {};
const stageMap = new Map((bom.stages || []).map(s => [String(s?.name || ''), s]));

for (const [stageName, doneRaw] of Object.entries(stagesCompleted || {})) {
  const done = Math.max(0, parseInt(doneRaw, 10) || 0);
  if (!done) continue;

  const stageDef = stageMap.get(String(stageName));
  const usageList = Array.isArray(stageDef?.partUsage) ? stageDef.partUsage : [];

  usageList.forEach(u => {
    const part = String(u?.name || '');
    const perWagon = Number(u?.used || 0);
    if (!part || perWagon <= 0) return;
    totalPartsToConsume[part] = (totalPartsToConsume[part] || 0) + perWagon * done;
  });
}

    // 4. 🔽 Deduct consumed parts (Stock Out)
    for (const part in totalPartsToConsume) {
      const qtyToDeduct = totalPartsToConsume[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: -qtyToDeduct } },
        { upsert: true }
      );
    }

    // 5. 📝 Log entry
    await DailyWagonLog.create({
      date,
      projectId,
      wagonType,
      partsProduced,
      stagesCompleted,
      partsConsumed: totalPartsToConsume,
      wagonReadyCount
    });

    res.json({
      status: 'Success',
      message: '✅ Daily update saved successfully'
    });
  } catch (err) {
    console.error('❌ Daily wagon update error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Get BOM (normalized for frontend)
// ----------------------
router.get('/bom/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({ wagonType: new RegExp(`^${safe}$`, 'i') }).lean();

    if (!doc) {
      return res.status(404).json({
        status: 'Error',
        message: `No BOM found for wagonType ${req.params.wagonType}`
      });
    }

    const parts = (doc.parts || []).map(p => ({
      name: String(p?.name || ''),
      total: Number(p?.total || 0)
    }));

    const stages = (doc.stages || []).map(s => ({
      name: String(s?.name || ''),
      partUsage: Array.isArray(s?.partUsage)
        ? s.partUsage.map(u => ({ name: String(u?.name || ''), used: Number(u?.used || 0) }))
        : []
    }));

    res.json({ wagonType: doc.wagonType, parts, stages });
  } catch (err) {
    console.error('❌ Error fetching BOM:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});
// ----------------------
// ✅ Get Inventory for a Project
// ----------------------
router.get('/parts/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Find all inventory docs for this project
    const items = await Inventory.find({ projectId });

    // Convert to { partName: qty } format
    const inventoryObj = {};
    items.forEach(item => {
      inventoryObj[item.part] = item.quantity;
    });

    res.json(inventoryObj);
  } catch (err) {
    console.error('❌ Error fetching project inventory:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
