const mongoose = require("mongoose");

const QuizCandidateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    quiz: {
      answers: [{ type: Number }],
      score: { type: Number },
      passed: { type: Boolean },
      submittedAt: { type: Date },
    },
    resume: {
      url: { type: String },
      publicId: { type: String },
      originalName: { type: String },
      bytes: { type: Number },
      format: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizCandidate", QuizCandidateSchema);
