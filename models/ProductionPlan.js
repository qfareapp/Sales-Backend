const mongoose = require('mongoose');

const ProductionPlanSchema = new mongoose.Schema({
  projectId: String,
  clientName: String,
  clientType: String,
  wagonType: String,
  month: String, // format: YYYY-MM
  monthlyTarget: Number,
  dm: { type: Number, default: 0 },         // To be updated later
  pullOut: { type: Number, default: 0 },    // To be updated later
}, { timestamps: true });

module.exports = mongoose.model('ProductionPlan', ProductionPlanSchema);
