const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const BogieInspection = require("../models/BogieInspection");

const router = express.Router();

/* -------------------- Ensure Upload Folder -------------------- */
const uploadDir = path.join(__dirname, "../uploads/bogie-inspections");
fs.mkdirSync(uploadDir, { recursive: true });

/* -------------------- Multer Storage -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/* -------------------- POST: Save Inspection -------------------- */
router.post(
  "/",
  upload.fields([
    { name: "wheelBasePhoto" },
    { name: "bogieDiagonalPhoto" },
    { name: "bogieJournalCentrePhoto" },
    { name: "sideFrameJawPhoto" },
    { name: "brakeBeamPhoto" },
    { name: "sideBearerPhoto" },
    { name: "pushRodPhoto" },
    { name: "endPullRodPhoto" },
    { name: "brakeShoePhoto" },
    { name: "springPhoto" },
  ]),
  async (req, res) => {
    try {
      const {
        date,
        wagonType,
        bogieNo,
        bogieMake,
        bogieType,
        wheelBaseCheck,
        bogieDiagonalCheck,
        journalCentreCheck,
        sideFrameJawCheck,
        brakeBeamPocket,
        sideBearer,
        pushRodCheck,
        endPullRodCheck,
        brakeShoeType,
        brakeShoeCheck,
        springVisualCheck,
        adopterType,
        remarks,
      } = req.body;

      const photos = req.files || {};

      const record = new BogieInspection({
        date,
        wagonType,
        bogieNo,
        bogieMake,
        bogieType,
        wheelBase: {
          check: Number(wheelBaseCheck) || 0,
          photo: photos.wheelBasePhoto?.[0]?.filename || null,
        },
        bogieDiagonal: {
          check: Number(bogieDiagonalCheck) || 0,
          photo: photos.bogieDiagonalPhoto?.[0]?.filename || null,
        },
        bogieJournalCentre: {
          check: Number(journalCentreCheck) || 0,
          photo: photos.bogieJournalCentrePhoto?.[0]?.filename || null,
        },
        sideFrameJaw: {
          check: Number(sideFrameJawCheck) || 0,
          photo: photos.sideFrameJawPhoto?.[0]?.filename || null,
        },
        brakeBeamPocket: {
          value: brakeBeamPocket || "",
          photo: photos.brakeBeamPhoto?.[0]?.filename || null,
        },
        sideBearerCentre: {
          value: sideBearer || "",
          photo: photos.sideBearerPhoto?.[0]?.filename || null,
        },
        pushRodCheck: {
          check: Number(pushRodCheck) || 0,
          photo: photos.pushRodPhoto?.[0]?.filename || null,
        },
        endPullRodCheck: {
          check: Number(endPullRodCheck) || 0,
          photo: photos.endPullRodPhoto?.[0]?.filename || null,
        },
        brakeShoeType,
        brakeShoeCheck: {
          check: Number(brakeShoeCheck) || 0,
          photo: photos.brakeShoePhoto?.[0]?.filename || null,
        },
        springVisualCheck: {
          check: Number(springVisualCheck) || 0,
          photo: photos.springPhoto?.[0]?.filename || null,
        },
        adopterType,
        remarks,
      });

      await record.save();
      res.json({ success: true, data: record });
    } catch (err) {
      console.error("❌ Error saving inspection:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* -------------------- GET: List all -------------------- */
router.get("/", async (_req, res) => {
  try {
    const data = await BogieInspection.find().sort({ date: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    }

    const data = await BogieInspection.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
