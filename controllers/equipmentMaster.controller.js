const EquipmentMaster = require("../models/equipmentMaster.model.js");

/* =====================================================
   CREATE or UPDATE EQUIPMENT MASTER
===================================================== */
const saveEquipmentMaster = async (req, res) => {
  try {
    const { equipments } = req.body;

    if (!equipments || !Array.isArray(equipments)) {
      return res.status(400).json({
        success: false,
        error: "equipments array is required",
      });
    }

    const results = [];

    for (const eq of equipments) {
      if (!eq.equipmentName || !eq.parts || eq.matchingSets === undefined) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields (equipmentName, parts, matchingSets)",
        });
      }

      const updated = await EquipmentMaster.findOneAndUpdate(
        { equipmentName: eq.equipmentName },
        {
          equipmentName: eq.equipmentName,
          parts: eq.parts,
          matchingSets: eq.matchingSets,
          createdBy: req.user?.name || "system",
        },
        { upsert: true, new: true }
      );

      results.push(updated);
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("Equipment Master Save Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
   GET ALL EQUIPMENTS
===================================================== */
const getAllEquipments = async (_req, res) => {
  try {
    const list = await EquipmentMaster.find().sort({ equipmentName: 1 });
    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("Fetch Equipment Master Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
   GET ONE EQUIPMENT BY NAME
===================================================== */
const getEquipmentByName = async (req, res) => {
  try {
    const { name } = req.params;

    const eq = await EquipmentMaster.findOne({ equipmentName: name });

    if (!eq) {
      return res.status(404).json({
        success: false,
        error: "Equipment not found",
      });
    }

    return res.json({ success: true, data: eq });
  } catch (err) {
    console.error("Fetch Equipment Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/* =====================================================
   DELETE EQUIPMENT
===================================================== */
const deleteEquipment = async (req, res) => {
  try {
    const { name } = req.params;

    await EquipmentMaster.findOneAndDelete({ equipmentName: name });

    return res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Delete Equipment Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  saveEquipmentMaster,
  getAllEquipments,
  getEquipmentByName,
  deleteEquipment,
};
