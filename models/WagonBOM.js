const mongoose = require('mongoose');

const wagonBOMSchema = new mongoose.Schema({
  wagonType: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  parts: [
    {
      name: { type: String, required: true },
      total: { type: Number, required: true }
    }
  ],
  stages: [
    { type: String }
  ]
}, { timestamps: true });

module.exports = mongoose.model('WagonBOM', wagonBOMSchema);
