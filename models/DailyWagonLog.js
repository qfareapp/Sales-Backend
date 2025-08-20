const mongoose = require('mongoose');

const dailyWagonLogSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },     // log date
    projectId: { type: String, required: true, trim: true },
    wagonType: { type: String, required: true, trim: true },

    // Stage-wise records (key = stageName, value = count of sets completed that day)
    stagesCompleted: { type: Map, of: Number, default: {} },

    // Parts flow
    partsProduced: { type: Map, of: Number, default: {} },
    partsConsumed: { type: Map, of: Number, default: {} },

    // ✅ Final stage (PDI = Ready for Pullout)
    pdiCount: { type: Number, default: 0 },

    // ✅ Always mirrors pdiCount (kept for clarity)
    readyForPullout: { type: Number, default: 0 },

    // ✅ NEW: total wagons actually pulled out
    pulloutDone: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyWagonLog', dailyWagonLogSchema);
