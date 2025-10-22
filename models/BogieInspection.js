const mongoose = require("mongoose");

const inspectionSchema = new mongoose.Schema({
  date: String,
  wagonType: String,
  bogieNo: String,
  bogieMake: String,
  bogieType: String,

  // Composite fields (check + photo)
  wheelBase: { check: Number, photo: String },
  bogieDiagonal: { check: Number, photo: String },
  bogieJournalCentre: { check: Number, photo: String },
  sideFrameJaw: { check: Number, photo: String },
  brakeBeamPocket: { value: String, photo: String },
  sideBearerCentre: { value: String, photo: String },

  // ✅ Fix these — make them objects too
  pushRodCheck: { check: Number, photo: String },
  endPullRodCheck: { check: Number, photo: String },
  brakeShoeType: String,
  brakeShoeCheck: { check: Number, photo: String },
  springVisualCheck: { check: Number, photo: String },

  adopterType: String,
  remarks: String,
}, { timestamps: true });

module.exports = mongoose.model("BogieInspection", inspectionSchema);
