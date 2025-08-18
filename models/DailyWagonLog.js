const mongoose = require('mongoose');

const dailyWagonLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },     // use Date for querying
  projectId: { type: String, required: true, trim: true },
  wagonType: { type: String, required: true, trim: true },
  partsProduced: { type: Map, of: Number, default: {} },
  stagesCompleted: { type: Map, of: Number, default: {} },
  partsConsumed: { type: Map, of: Number, default: {} },
  wagonReadyCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('DailyWagonLog', dailyWagonLogSchema);
