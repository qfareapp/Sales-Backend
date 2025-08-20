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
    const plans = await ProductionPlan.find().sort({ createdAt: -1 }).lean();

    // group PDI + Pullout counts from logs
    const logs = await DailyWagonLog.aggregate([
      {
        $group: {
          _id: '$projectId',
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const logMap = new Map(
      logs.map(l => [l._id, {
        totalPDI: l.totalPDI,
        totalPullout: l.totalPullout,
        readyForPullout: l.totalPDI - l.totalPullout
      }])
    );

    // attach PDI + Pullout info to each plan
    const enriched = plans.map(p => {
      const logStats = logMap.get(p.projectId) || { totalPDI: 0, totalPullout: 0, readyForPullout: 0 };
      return {
        ...p,
        pdi: logStats.totalPDI,
        readyForPullout: logStats.readyForPullout,
        pulloutDone: logStats.totalPullout
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Daily Wagon Update (store PDI as Ready for Pullout)
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
    if (!date || !projectId || !wagonType) {
      return res.status(400).json({
        status: 'Error',
        message: 'date, projectId, and wagonType are required'
      });
    }

    // 1. 🔼 Update inventory (Stock In)
    for (const part in partsProduced) {
      const qty = partsProduced[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: qty } },
        { upsert: true }
      );
    }

    // 2. 📦 Get BOM
    const bom = await WagonConfig.findOne({ wagonType }).lean();
    if (!bom) {
      return res.status(400).json({
        status: 'Error',
        message: `No BOM found for wagonType ${wagonType}`
      });
    }

    // 3. 🧮 Parts consumption
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
        totalPartsToConsume[part] =
          (totalPartsToConsume[part] || 0) + perWagon * done;
      });
    }

    // 4. 🔽 Deduct inventory (Stock Out)
    for (const part in totalPartsToConsume) {
      const qtyToDeduct = totalPartsToConsume[part];
      await Inventory.updateOne(
        { projectId, part },
        { $inc: { quantity: -qtyToDeduct } },
        { upsert: true }
      );
    }

    // 5. 📝 Log entry
    const pdiCount = Number(stagesCompleted?.PDI || 0);

    await DailyWagonLog.create({
      date,
      projectId,
      wagonType,
      partsProduced,
      stagesCompleted,
      partsConsumed: totalPartsToConsume,
      wagonReadyCount,
      pdiCount,                 // ✅ final stage
      readyForPullout: pdiCount,// ✅ mirror PDI
      pulloutDone: 0            // ✅ no pullout at creation
    });

    res.json({ status: 'Success', message: '✅ Daily update saved successfully' });
  } catch (err) {
    console.error('❌ Daily wagon update error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Update Pullout (cumulative by projectId)
// ----------------------
router.post('/pullout-update/:projectId', async (req, res) => {
  try {
    const { count } = req.body;
    const { projectId } = req.params;

    if (!count || count <= 0) {
      return res.status(400).json({ status: 'Error', message: 'Count must be greater than 0' });
    }

    // 1. Get totals from logs
    const totals = await DailyWagonLog.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalPDI: { $sum: '$pdiCount' },
          totalPullout: { $sum: '$pulloutDone' }
        }
      }
    ]);

    const stats = totals[0] || { totalPDI: 0, totalPullout: 0 };
    const readyForPullout = stats.totalPDI - stats.totalPullout;

    if (count > readyForPullout) {
      return res.status(400).json({
        status: 'Error',
        message: `Only ${readyForPullout} wagons available for pullout`
      });
    }

    // 2. Log the pullout as a new entry (history preserved)
    await DailyWagonLog.create({
      date: new Date(),
      projectId,
      wagonType: 'N/A', // optional, can fetch from plan
      partsProduced: {},
      stagesCompleted: {},
      partsConsumed: {},
      wagonReadyCount: 0,
      pdiCount: 0,                  // no new PDI
      readyForPullout: 0,           // no new ready wagons
      pulloutDone: count            // only pullout recorded
    });

    res.json({
      status: 'Success',
      message: `${count} wagons pulled out successfully`,
      newTotals: {
        totalPDI: stats.totalPDI,
        totalPullout: stats.totalPullout + count,
        readyForPullout: readyForPullout - count
      }
    });
  } catch (err) {
    console.error('❌ Pullout update error:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------
// ✅ Get BOM
// ----------------------
router.get('/bom/:wagonType', async (req, res) => {
  try {
    const safe = String(req.params.wagonType)
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await WagonConfig.findOne({
      wagonType: new RegExp(`^${safe}$`, 'i')
    }).lean();

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
        ? s.partUsage.map(u => ({
            name: String(u?.name || ''),
            used: Number(u?.used || 0)
          }))
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
    const items = await Inventory.find({ projectId });

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
