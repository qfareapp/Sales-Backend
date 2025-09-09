const mongoose = require('mongoose');

const MilestoneSchema = new mongoose.Schema(
  {
    date:    { type: Date, default: null },
    notes:   { type: String, default: '' },
    // store RELATIVE path in DB; make absolute only in responses
    fileUrl: { type: String, default: null },
    fileName:{ type: String, default: null },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    orderId:        { type: String, required: true, unique: true },
    enquiryDate:    { type: Date },
    owner:          { type: String, trim: true },
    source:         { type: String, trim: true },
    clientType:     { type: String, trim: true },
    clientName:     { type: String, trim: true },
    product:        { type: String, trim: true },
    wagonType:      { type: String, trim: true },

    noOfRakes:      { type: Number, min: 0, default: 0 },
    wagonsPerRake:  { type: Number, min: 0, default: 0 },
    pricePerWagon:  { type: Number, min: 0, default: 0 },
    estimatedAmount:{ type: Number, min: 0, default: 0 },
    quotedPrice:    { type: Number, min: 0, default: 0 },

    // GST
    gstPercent:     { type: Number, min: 0, max: 100, default: 0 },
    gstAmount:      { type: Number, min: 0, default: 0 },

    deliveryStart:  { type: Date },
    deliveryEnd:    { type: Date },
    remark:         { type: String },

    stage: {
      type: String,
      enum: ['Enquiry', 'Quoted', 'Cancelled', 'Confirmed', 'Lost'],
      default: 'Enquiry'
    },

    // Multiple attachments
    attachment: {
      type: [{
        name: { type: String },
        url:  { type: String }
      }],
      _id: false,
      default: []
    },

    // Comments
    comments: [{
      text: { type: String },
      date: { type: Date, default: Date.now }
    }],

    // Milestones as Map<MilestoneSchema>
    milestones: {
      type: Map,
      of: MilestoneSchema,
      default: () => new Map(),   // ✅ real Map default
    },

    // Project ID (only if confirmed)
    projectId: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
