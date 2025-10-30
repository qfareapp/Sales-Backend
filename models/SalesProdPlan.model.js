import mongoose from "mongoose";

const salesProdPlanSchema = new mongoose.Schema({
  fy: { type: String, required: true },       // e.g. "2025-26"
  month: { type: String, required: true },    // e.g. "Apr'25"
  segment: { type: String, enum: ["IR", "Pvt"], required: true },
  plan: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("SalesProdPlan", salesProdPlanSchema);
