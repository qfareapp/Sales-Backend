const mongoose = require('mongoose');

const dailyUpdateSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  date: { type: Date, required: true },     // ✅ store as Date
  wagonSold: { type: Number, required: true },
  source: { type: String, default: 'manual' }
}, { timestamps: true });

module.exports = mongoose.model('DailyUpdate', dailyUpdateSchema);
