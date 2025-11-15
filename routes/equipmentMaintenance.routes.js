const express = require("express");
const {
  upsertMaintenanceLog,
  getMaintenanceLogs,
  getMaintenanceSummary,
  getEquipmentAnalytics, 
} = require("../controllers/equipmentMaintenance.controller.js");

const router = express.Router();

// POST → Create or Update maintenance log
router.post("/equipment", upsertMaintenanceLog);

// GET → Fetch logs (by date / date range / equipment)
router.get("/equipment", getMaintenanceLogs);

// GET → Summary (uptime %, working slots, failure count)
router.get("/equipment/summary", getMaintenanceSummary);

// ✅ NEW → Equipment-wise analytics popup API
router.get("/equipment/analytics", getEquipmentAnalytics);

module.exports = router;
