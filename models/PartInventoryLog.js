const mongoose = require('mongoose');

const PartInventoryLogSchema = new mongoose.Schema({
  date: { type: String, required: true },
  projectId: { type: String, required: true },
  wagonType: { type: String, required: true },
  part: { type: String, required: true },
  quantity: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PartInventoryLog', PartInventoryLogSchema);
