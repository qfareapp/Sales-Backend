const mongoose = require('mongoose');

const DashboardUploadSchema = new mongoose.Schema(
  {
    siteId: { type: String, required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['production', 'dispatch', 'stage'],
      index: true,
    },
    originalName: String,
    mimeType: String,
    size: Number,
    data: Buffer,
  },
  { timestamps: true }
);

module.exports = mongoose.model('DashboardUpload', DashboardUploadSchema);
