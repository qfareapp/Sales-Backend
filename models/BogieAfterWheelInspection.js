const mongoose = require("mongoose");

const checkboxArray = {
  type: [String],
  default: [],
};

const BogieAfterWheelInspectionSchema = new mongoose.Schema(
  {
    inspectionType: { type: String, default: "after-wheeling" },
    date: { type: Date, required: true },
    bogieNo: { type: String, required: true, index: true },
    inspectorName: String,
    inspectorSignature: String, // path or URL to uploaded signature

    /* ==========================
       Inspection sections
       ========================== */
    sections: {
      adapterFitment: checkboxArray,
      springCondition: checkboxArray,
      springSeating: checkboxArray,
      stopperCondition: checkboxArray,
      adopterType: String,
      adopterVisual: checkboxArray,
      emPad: checkboxArray,
      brakeBlock: checkboxArray,
      wheelAdjustment: checkboxArray,
      sideFramePocketLiners: checkboxArray,
      sideFrameCondition: checkboxArray,
      bogieBolster: checkboxArray,
      centerPivotType: String,
      sideBearersType: String,
      sideBearers: checkboxArray,
      frictionWedges: checkboxArray,
      springPlankCondition: checkboxArray,
      hangerBrackets: checkboxArray,
      brakeBeam: checkboxArray,
      sideFrameKeys: checkboxArray,
      adapterRetainerBolts: checkboxArray,
    },

    remarks: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "BogieAfterWheelInspection",
  BogieAfterWheelInspectionSchema
);
