const mongoose = require("mongoose");

const componentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    required: { type: Number, required: true }, // quantity required per set
    available: { type: Number, required: true }, // manually entered
  },
  { _id: false }
);

const equipmentMasterSchema = new mongoose.Schema(
  {
    equipmentName: {
      type: String,
      required: true,
      trim: true,
    },

    parts: [componentSchema],

    matchingSets: {
      type: Number,
      required: true, // auto-calculated on frontend
    },

    createdBy: {
      type: String,
      default: "system",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EquipmentMaster", equipmentMasterSchema);
