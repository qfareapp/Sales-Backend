const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  projectId: String,
  part: String,
  quantity: Number
});

module.exports = mongoose.model('Inventory', inventorySchema);
