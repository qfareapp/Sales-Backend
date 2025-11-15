const express = require("express");
const {
  saveEquipmentMaster,
  getAllEquipments,
  getEquipmentByName,
  deleteEquipment,
} = require("../controllers/equipmentMaster.controller.js");

const router = express.Router();

router.post("/", saveEquipmentMaster);
router.get("/all", getAllEquipments);
router.get("/:name", getEquipmentByName);
router.delete("/:name", deleteEquipment);

module.exports = router;
