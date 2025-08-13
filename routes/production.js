const express = require('express');
const router = express.Router();
const ProductionPlan = require('../models/ProductionPlan');
const Inventory = require('../models/Inventory');
const WagonBOM = require('../models/WagonBOM');
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
// ✅ Daily Wagon Update
// ----------------------

router.post('/daily-wagon-update', async (req, res) => {
  const {
    date,
    projectId,
    wagonType,
    partsProduced = {},
    stagesCompleted = {},
    wagonReadyCount = 0 // ✅ NEW
  } = req.body;

  try {
    // 1. 🔼 Update inventory with produced parts (Stock In)
    for (const part in partsProduced) {
      const qty = partsProduced[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: qty } },
        { upsert: true }
      );
    }

    // 2. 📦 Get BOM for the selected wagon type
    const bom = await WagonBOM.findOne({ wagonType });
    if (!bom) throw new Error(`No BOM found for wagonType ${wagonType}`);

    // 3. 🧮 Compute parts consumed across all completed stages
    const totalPartsToConsume = {};
    for (const stage in stagesCompleted) {
      const wagonsCompleted = stagesCompleted[stage];
      for (const part in bom.parts) {
        const qty = bom.parts[part] * wagonsCompleted;
        totalPartsToConsume[part] = (totalPartsToConsume[part] || 0) + qty;
      }
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
      wagonReadyCount // ✅ log DM-ready wagons
    });

    res.json({ status: 'Success', message: 'Daily update saved successfully' });
  } catch (err) {
    console.error('❌ Daily wagon update error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
