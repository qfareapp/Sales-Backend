const mongoose = require('mongoose');

const wagonBOMSchema = new mongoose.Schema({
  wagonType: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  parts: {
    Underframe: { type: Number, required: true },
    BodySide: { type: Number, required: true },
    BodyEnd: { type: Number, required: true },
    Roof: { type: Number, required: true },
    Wheel: { type: Number, required: true },
    Bogie: { type: Number, required: true },
    Coupler: { type: Number, required: true },
    Barrel: { type: Number, required: false },
    BrakeSystem: { type: Number, required: true },
    Door: { type: Number, required: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('WagonBOM', wagonBOMSchema);
