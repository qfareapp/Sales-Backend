const mongoose = require('mongoose');

const dailyWagonLogSchema = new mongoose.Schema({
  date: String,
  projectId: String,
  wagonType: String,
  partsProduced: Object,       // { Roof: 10, Wheel: 20, ... }
  stagesCompleted: Object,     // { Boxing: 3, BMP: 2, ... }
  partsConsumed: Object,       // { Body Side: 6, Roof: 3, ... }
  wagonReadyCount: {           // ✅ New field for DM-ready wagons
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyWagonLog', dailyWagonLogSchema);
