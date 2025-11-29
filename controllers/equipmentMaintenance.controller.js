const { EquipmentMaintenanceLog, PRESET_REASONS } = require("../models/EquipmentMaintenanceLog.js");

// Normalize date to midnight IST without Luxon
const normalizeDate = (inputDate) => {
  const d = new Date(inputDate);
  d.setHours(0, 0, 0, 0); 
  return d;
};

/* ======================================================
   CREATE or UPDATE MAINTENANCE LOG
====================================================== */
const upsertMaintenanceLog = async (req, res) => {
  try {
    const { date, equipmentName, slots } = req.body;

    if (!date || !equipmentName) {
      return res.status(400).json({
        success: false,
        error: "date and equipmentName are required",
      });
    }

    const normalizedDate = normalizeDate(date);

    const updated = await EquipmentMaintenanceLog.findOneAndUpdate(
      { date: normalizedDate, equipmentName },
      {
        date: normalizedDate,
        equipmentName,
        slots,
        createdBy: req.user?.name || "system",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Maintenance Log Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================
   GET LOGS
====================================================== */
const getMaintenanceLogs = async (req, res) => {
  try {
    const { date, from, to, equipmentName } = req.query;
    const filter = {};

    if (date) filter.date = normalizeDate(date);

    if (from && to) {
      filter.date = {
        $gte: normalizeDate(from),
        $lte: normalizeDate(to),
      };
    }

    if (equipmentName) filter.equipmentName = equipmentName;

    const logs = await EquipmentMaintenanceLog.find(filter).sort({ date: 1 });

    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error("Get Logs Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================
   SUMMARY
====================================================== */
const getMaintenanceSummary = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: "from and to dates are required",
      });
    }

    const fromDate = normalizeDate(from);
    const toDate = normalizeDate(to);

    const data = await EquipmentMaintenanceLog.aggregate([
      {
        $match: {
          date: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $project: {
          equipmentName: 1,
          slots: { $objectToArray: "$slots" }, // turns into k/v pairs
        },
      },
      { $unwind: "$slots" },
      {
        $group: {
          _id: "$equipmentName",
          total: { $sum: 1 },

          // ✔ FIXED: slots.v.status instead of slots.value.status
          working: {
            $sum: {
              $cond: [{ $eq: ["$slots.v.status", "working"] }, 1, 0],
            },
          },

          notWorking: {
            $sum: {
              $cond: [{ $eq: ["$slots.v.status", "notWorking"] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          uptime: {
            $multiply: [
              {
                $cond: [
                  { $eq: ["$total", 0] },
                  0,
                  { $divide: ["$working", "$total"] },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Summary Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================
   EQUIPMENT ANALYTICS (Popup)
====================================================== */
const getEquipmentAnalytics = async (req, res) => {
  try {
    const { equipmentName, from, to } = req.query;

    if (!equipmentName) {
      return res.status(400).json({
        success: false,
        error: "equipmentName is required",
      });
    }

    const fromDate = from ? normalizeDate(from) : null;
    const toDate = to ? normalizeDate(to) : null;

    const filter = { equipmentName };

    if (fromDate && toDate) {
      filter.date = { $gte: fromDate, $lte: toDate };
    }

    const logs = await EquipmentMaintenanceLog.find(filter).sort({ date: 1 });

    if (!logs.length) {
      return res.json({
        success: true,
        data: {
          equipmentName,
          uptimeTrend: [],
          downtimeTrend: [],
          totalOperationalHours: 0,
          totalDowntimeHours: 0,
          topReason: null,
          breakdownReasons: [],
        },
      });
    }

    let totalOperational = 0;
    let totalDowntime = 0;

    const trendMap = {};
    const reasonMap = {};

    logs.forEach((log) => {
      const dateKey = log.date.toISOString().slice(0, 10);

      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { up: 0, down: 0 };
      }

      Object.values(log.slots).forEach((slot) => {
        if (slot.status === "working") {
          totalOperational++;
          trendMap[dateKey].up++;
        } else if (slot.status === "notWorking") {
          totalDowntime++;
          trendMap[dateKey].down++;

          if (slot.reason) {
            reasonMap[slot.reason] =
              (reasonMap[slot.reason] || 0) + 1;
          }
        }
      });
    });

    return res.json({
      success: true,
      data: {
        equipmentName,
        uptimeTrend: Object.entries(trendMap).map(([date, v]) => ({
          date,
          hours: v.up,
        })),
        downtimeTrend: Object.entries(trendMap).map(([date, v]) => ({
          date,
          hours: v.down,
        })),
        totalOperationalHours: totalOperational,
        totalDowntimeHours: totalDowntime,
        topReason: Object.keys(reasonMap).length
          ? Object.entries(reasonMap).sort((a, b) => b[1] - a[1])[0][0]
          : null,
        breakdownReasons: Object.entries(reasonMap).map(
          ([name, value]) => ({ name, value })
        ),
      },
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* ======================================================
   EXPORT (CommonJS)
====================================================== */
module.exports = {
  upsertMaintenanceLog,
  getMaintenanceLogs,
  getMaintenanceSummary,
  getEquipmentAnalytics,
};
