const mongoose = require("mongoose");

const VisualConditionSchema = new mongoose.Schema(
  {
    crack: { type: Boolean, default: false },
    scratch: { type: Boolean, default: false },
    dents: { type: Boolean, default: false },
    bend: { type: Boolean, default: false },
    damaged: { type: Boolean, default: false },
  },
  { _id: false }
);

const CheckWithPhotoSchema = new mongoose.Schema(
  {
    check: { type: Number, default: 0 }, // -1 = Not OK, 0 = Pending, 1 = OK
    photo: { type: String, default: "" },
    visual: { type: VisualConditionSchema, default: {} },
  },
  { _id: false }
);

const ValueWithPhotoSchema = new mongoose.Schema(
  {
    value: { type: String, default: "" },
    photo: { type: String, default: "" },
    visual: { type: VisualConditionSchema, default: {} },
  },
  { _id: false }
);

const BogieInspectionSchema = new mongoose.Schema(
  {
    /* -------------------- Header Info -------------------- */
    date: { type: String, required: true },
    wagonType: { type: String, required: true },
    bogieNo: { type: String, required: true },
    bogieMake: { type: String, required: true },
    bogieType: { type: String, required: true },
    bogieModel: { type: String, required: true },
    inspectionType: { type: String, default: "before-wheeling" },

    /* -------------------- Dimensional Checks -------------------- */
    wheelBase: { type: CheckWithPhotoSchema, default: {} },
    bogieDiagonal: { type: CheckWithPhotoSchema, default: {} },
    bogieJournalCentre: { type: CheckWithPhotoSchema, default: {} },
    sideFrameJaw: { type: CheckWithPhotoSchema, default: {} },
    brakeBeamPocket: { type: ValueWithPhotoSchema, default: {} },
    sideBearerCentre: {
      ...ValueWithPhotoSchema.obj,
      ref: { type: String, default: "" }, // ✅ reference like “1474 ± 5 mm”
    },

    /* -------------------- Go / No-Go Checks -------------------- */
    pushRodCheck: { type: CheckWithPhotoSchema, default: {} },
    endPullRodCheck: { type: CheckWithPhotoSchema, default: {} },

    /* -------------------- Brake Shoe -------------------- */
    brakeShoeType: { type: String, default: "" },
    brakeShoeCheck: { type: CheckWithPhotoSchema, default: {} },

    /* -------------------- Spring Visual Check -------------------- */
    springVisualCheck: { type: CheckWithPhotoSchema, default: {} },

    /* -------------------- Adopter / Remarks / Signature -------------------- */
    adopterType: { type: String, default: "" },
    remarks: { type: String, default: "" },
    inspectorSignature: { type: String, default: "" },

    /* -------------------- Meta -------------------- */
    //createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BogieInspection", BogieInspectionSchema);
