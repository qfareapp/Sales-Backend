// equipmentInventory.controller.js

const EquipmentMaster = require("../models/equipmentMaster.model.js");

/* ============================================================
   GET LOW STOCK COMPONENTS (Used in Dashboard Ticker)
   Scans all equipment and returns components where available ≤ 4
=============================================================== */
exports.getLowStockComponents = async (req, res) => {
  try {
    const equipments = await EquipmentMaster.find().select("equipmentName parts");

    const lowStockItems = [];

    equipments.forEach(eq => {
      eq.parts.forEach(part => {
        if (part.available <= 4) {
          lowStockItems.push({
            equipmentName: eq.equipmentName,
            componentName: part.name,
            available: part.available,
            required: part.required
          });
        }
      });
    });

    return res.json({
      success: true,
      data: lowStockItems
    });

  } catch (err) {
    console.error("Low Stock Fetch Error:", err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
