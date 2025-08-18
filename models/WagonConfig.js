const mongoose = require('mongoose');

const WagonConfigSchema = new mongoose.Schema({
  wagonType: { type: String, required: true, unique: true },
  parts: [
    {
      name: String,
      total: Number
    }
  ],
  stages: [
    {
      name: String,
      partUsage: [
        {
          name: String,
          used: Number
        }
      ]
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('WagonConfig', WagonConfigSchema);
