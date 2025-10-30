const express = require("express");
const { savePlan, saveAchievement, getAnalytics } = require("../controllers/SalesProd.controller");

const router = express.Router();

router.post("/plan", savePlan);
router.post("/achievement", saveAchievement);
router.get("/analytics", getAnalytics);

module.exports = router;
