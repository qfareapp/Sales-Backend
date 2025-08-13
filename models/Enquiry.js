const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    enquiryDate: { type: Date },
    owner: { type: String, trim: true },
    source: { type: String, trim: true },
    clientType: { type: String, trim: true },
    clientName: { type: String, trim: true },
    product: { type: String, trim: true },
    wagonType: { type: String, trim: true },

    noOfRakes: { type: Number, min: 0, default: 0 },
    wagonsPerRake: { type: Number, min: 0, default: 0 },
    pricePerWagon: { type: Number, min: 0, default: 0 },
    estimatedAmount: { type: Number, min: 0, default: 0 },
    quotedPrice: { type: Number, min: 0, default: 0 },

    // ✅ New GST Fields
    gstPercent: { type: Number, min: 0, max: 100, default: 0 },
    gstAmount: { type: Number, min: 0, default: 0 },

    deliveryStart: { type: Date },
    deliveryEnd: { type: Date },
    remark: { type: String },

    stage: {
      type: String,
      enum: ['Enquiry', 'Quoted', 'Cancelled', 'Confirmed', 'Lost'],
      default: 'Enquiry'
    },

    // ✅ Multiple Attachments with default: []
    attachment: {
      type: [
        {
          name: { type: String },
          url: { type: String }
        }
      ],
      default: []
    },

    // ✅ Communication Comments with Auto Timestamp
    comments: [
      {
        text: { type: String },
        date: { type: Date, default: Date.now }
      }
    ],

    // ✅ Project ID (only if confirmed)
    projectId: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Enquiry', enquirySchema);
