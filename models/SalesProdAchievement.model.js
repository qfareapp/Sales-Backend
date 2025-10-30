import mongoose from "mongoose";

const salesProdAchievementSchema = new mongoose.Schema({
  fy: { type: String, required: true },
  month: { type: String, required: true },
  segment: { type: String, enum: ["IR", "Pvt"], required: true },
  achieved: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model("SalesProdAchievement", salesProdAchievementSchema);
