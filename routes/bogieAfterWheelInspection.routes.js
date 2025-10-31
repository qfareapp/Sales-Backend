const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  createAfterWheelInspection,
  checkBeforeWheelStatus,
  getPendingBogieNumbers,
} = require("../controllers/bogieAfterWheelInspection.controller");
const BogieAfterWheelInspection = require("../models/BogieAfterWheelInspection");

const router = express.Router();

/* ==========================================================
   🗂️ Multer Configuration for Signature Upload
   ========================================================== */
const uploadDir = path.join(__dirname, "../uploads/bogie-inspections");

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created upload directory:", uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit: 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed for signature upload."));
  },
});

/* ==========================================================
   ✅ Routes
   ========================================================== */

// ✅ Save new After-Wheeling inspection (with signature upload)
router.post("/after-wheeling", upload.single("inspectorSignature"), createAfterWheelInspection);

// ✅ Check if Before-Wheeling inspection completed
router.get("/before-wheeling/status", checkBeforeWheelStatus);

// ✅ Get bogies pending After-Wheeling inspection
router.get("/pending-after-wheeling", getPendingBogieNumbers);

// ✅ Fetch After-Wheeling report for a given bogie
router.get("/after-wheeling/:bogieNo", async (req, res) => {
  try {
    const { bogieNo } = req.params;
    if (!bogieNo) {
      return res
        .status(400)
        .json({ success: false, message: "Missing bogieNo parameter." });
    }

    const record = await BogieAfterWheelInspection.findOne({
      bogieNo: bogieNo.trim(),
    }).lean();

    if (!record) {
      return res
        .status(404)
        .json({
          success: false,
          message: "No after-wheeling record found for this bogie.",
        });
    }

    res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error("❌ Error fetching after-wheeling report:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
