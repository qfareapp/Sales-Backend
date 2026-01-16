const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const QuizCandidate = require("../models/QuizCandidate");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "quiz-resumes",
    resource_type: "raw",
    allowedFormats: ["pdf", "doc", "docx"],
  },
});

const upload = multer({ storage });

router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, course, department, year } = req.body;
    if (!name || !phone || !email || !course || !department || !year) {
      return res.status(400).json({ status: "Error", message: "All fields are required." });
    }

    const existing = await QuizCandidate.findOne({
      $or: [
        { email: email.trim().toLowerCase() },
        { phone: phone.trim() },
      ],
    });
    if (existing) {
      return res.status(409).json({
        status: "Error",
        message: "This email or phone number has already been used.",
      });
    }

    const candidate = new QuizCandidate({
      name,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      course,
      department,
      year,
    });
    await candidate.save();

    return res.json({ status: "Success", candidateId: candidate._id });
  } catch (err) {
    console.error("Quiz register error:", err.message);
    return res.status(500).json({ status: "Error", message: err.message });
  }
});

router.post("/submit/:candidateId", upload.single("resume"), async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { answers, score, passed } = req.body;

    const candidate = await QuizCandidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ status: "Error", message: "Candidate not found." });
    }

    let parsedAnswers = answers;
    if (typeof answers === "string") {
      try {
        parsedAnswers = JSON.parse(answers);
      } catch (err) {
        parsedAnswers = [];
      }
    }

    candidate.quiz = {
      answers: Array.isArray(parsedAnswers) ? parsedAnswers : [],
      score: Number(score) || 0,
      passed: String(passed).toLowerCase() === "true",
      submittedAt: new Date(),
    };

    if (req.file) {
      candidate.resume = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        bytes: req.file.size,
        format: req.file.mimetype,
      };
    }

    await candidate.save();
    return res.json({
      status: "Success",
      candidateId: candidate._id,
      resumeUrl: candidate.resume?.url || null,
    });
  } catch (err) {
    console.error("Quiz submit error:", err.message);
    return res.status(500).json({ status: "Error", message: err.message });
  }
});

router.get("/:candidateId", async (req, res) => {
  try {
    const candidate = await QuizCandidate.findById(req.params.candidateId);
    if (!candidate) {
      return res.status(404).json({ status: "Error", message: "Candidate not found." });
    }
    return res.json({ status: "Success", data: candidate });
  } catch (err) {
    console.error("Quiz get error:", err.message);
    return res.status(500).json({ status: "Error", message: err.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const candidates = await QuizCandidate.find().sort({ createdAt: -1 });
    return res.json({ status: "Success", data: candidates });
  } catch (err) {
    console.error("Quiz list error:", err.message);
    return res.status(500).json({ status: "Error", message: err.message });
  }
});

module.exports = router;
