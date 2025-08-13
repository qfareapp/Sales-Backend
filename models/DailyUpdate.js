const mongoose = require('mongoose');

const dailyUpdateSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Stored as YYYY-MM-DD string
    required: true,
  },
  wagonSold: {
    type: Number,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('DailyUpdate', dailyUpdateSchema);
