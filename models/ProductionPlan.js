const mongoose = require('mongoose');

const ProductionPlanSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true },
    clientName: String,
    clientType: String,
    wagonType: String,

    // keep month as YYYY-MM string for simplicity
    month: { type: String, required: true }, 

    monthlyTarget: { type: Number, default: 0 },

    // Stage-wise cumulative fields
    dm: { type: Number, default: 0 }, // DM count (can be filled later)
    
    // NEW: track PDI
    pdi: { type: Number, default: 0 },

    // NEW: track Ready for Pull Out (always same as PDI)
    readyForPullout: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductionPlan', ProductionPlanSchema);
