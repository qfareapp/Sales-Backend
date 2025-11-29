const express = require("express");
const router = express.Router();

const { getLowStockComponents } = require("../controllers/equipmentInventory.controller.js");

// NEW: Low Stock API for Dashboard
router.get("/components/low-stock", getLowStockComponents);

module.exports = router;
