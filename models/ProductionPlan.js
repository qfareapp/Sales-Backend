const mongoose = require('mongoose');

const ProductionPlanSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true },
    clientName: String,
    clientType: String,
    wagonType: String,

    // Store month in multiple formats for queries
    month: { type: String, required: true },      // "2025-09"
    monthNum: { type: Number, required: true },   // 1–12
    year: { type: Number, required: true },       // e.g. 2025

    monthlyTarget: { type: Number, default: 0 },
    dm: { type: Number, default: 0 },
    pdi: { type: Number, default: 0 },
    readyForPullout: { type: Number, default: 0 },
    pulloutDone: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// 🔑 Ensure one plan per (projectId, year, monthNum)
ProductionPlanSchema.index({ projectId: 1, year: 1, monthNum: 1 }, { unique: true });

// 🔄 Auto-fill monthNum + year from month string if missing
ProductionPlanSchema.pre('validate', function (next) {
  if (this.month && (!this.year || !this.monthNum)) {
    const [y, m] = this.month.split('-');
    this.year = Number(y);
    this.monthNum = Number(m);
  }
  next();
});

module.exports = mongoose.model('ProductionPlan', ProductionPlanSchema);
