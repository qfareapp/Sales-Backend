const mongoose = require("mongoose");

const PRESET_REASONS = [
  "Power failure",
  "Mechanical fault",
  "Hydraulic leak",
  "Operator unavailable",
  "Material unavailable",
  "Preventive maintenance",
  "Emergency breakdown",
  "Software/PLC failure",
  "Safety lockout",
  "Others",
];

const slotSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["working", "notWorking", "na"],
      default: "na",
    },
    reason: {
      type: String,
      enum: [...PRESET_REASONS, ""],
      default: "",
    },
  },
  { _id: false }
);

const EquipmentMaintenanceLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    equipmentName: { type: String, required: true, trim: true },

    slots: {
      "6_7": { type: slotSchema, default: () => ({}) },
      "7_8": { type: slotSchema, default: () => ({}) },
      "8_9": { type: slotSchema, default: () => ({}) },
      "10_11": { type: slotSchema, default: () => ({}) },
      "11_12": { type: slotSchema, default: () => ({}) },
      "12_1": { type: slotSchema, default: () => ({}) },
    },

    createdBy: { type: String },
  },
  { timestamps: true }
);

// Unique per date + equipment
EquipmentMaintenanceLogSchema.index(
  { date: 1, equipmentName: 1 },
  { unique: true }
);

const EquipmentMaintenanceLog = mongoose.model(
  "EquipmentMaintenanceLog",
  EquipmentMaintenanceLogSchema
);

module.exports = {
  PRESET_REASONS,
  EquipmentMaintenanceLog,
};
