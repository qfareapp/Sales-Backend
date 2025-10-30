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
    { name: "inspectorSignature" },
  ]),
  async (req, res) => {
    try {
      const b = req.body;
      const f = req.files || {};

      // 🔧 Parse visuals safely
      const parseJSON = (v) => {
        try {
          return v ? JSON.parse(v) : {};
        } catch {
          return {};
        }
      };

      const record = new BogieInspection({
        date: b.date,
        wagonType: b.wagonType,
        bogieNo: b.bogieNo,
        bogieMake: b.bogieMake,
        bogieType: b.bogieType,

        wheelBase: {
          check: Number(b.wheelBaseCheck) || 0,
          photo: f.wheelBasePhoto?.[0]?.filename || "",
          visual: parseJSON(b.wheelBaseVisual),
        },
        bogieDiagonal: {
          check: Number(b.bogieDiagonalCheck) || 0,
          photo: f.bogieDiagonalPhoto?.[0]?.filename || "",
          visual: parseJSON(b.bogieDiagonalVisual),
        },
        bogieJournalCentre: {
          check: Number(b.journalCentreCheck) || 0,
          photo: f.bogieJournalCentrePhoto?.[0]?.filename || "",
          visual: parseJSON(b.bogieJournalCentreVisual),
        },
        sideFrameJaw: {
          check: Number(b.sideFrameJawCheck) || 0,
          photo: f.sideFrameJawPhoto?.[0]?.filename || "",
          visual: parseJSON(b.sideFrameJawVisual),
        },
        brakeBeamPocket: {
          value: b.brakeBeamPocket || "",
          photo: f.brakeBeamPhoto?.[0]?.filename || "",
          visual: parseJSON(b.brakeBeamPocketVisual),
        },
        sideBearerCentre: {
          value: b.sideBearer || "",
          ref: b.sideBearerRef || "",
          photo: f.sideBearerPhoto?.[0]?.filename || "",
          visual: parseJSON(b.sideBearerVisual),
        },
        pushRodCheck: {
          check: Number(b.pushRodCheck) || 0,
          photo: f.pushRodPhoto?.[0]?.filename || "",
          visual: parseJSON(b.pushRodVisual),
        },
        endPullRodCheck: {
          check: Number(b.endPullRodCheck) || 0,
          photo: f.endPullRodPhoto?.[0]?.filename || "",
          visual: parseJSON(b.endPullRodVisual),
        },
        brakeShoeType: b.brakeShoeType,
        brakeShoeCheck: {
          check: Number(b.brakeShoeCheck) || 0,
          photo: f.brakeShoePhoto?.[0]?.filename || "",
          visual: parseJSON(b.brakeShoeVisual),
        },
        springVisualCheck: {
          check: Number(b.springVisualCheck) || 0,
          photo: f.springPhoto?.[0]?.filename || "",
        },
        adopterType: b.adopterType,
        remarks: b.remarks || "",
        inspectorSignature: f.inspectorSignature?.[0]?.filename || "",
      });

      await record.save();
      console.log("✅ Saved Inspection:", record._id);
      res.json({ success: true, message: "Inspection saved successfully", data: record });
    } catch (err) {
      console.error("❌ Error saving inspection:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* -------------------- GET: List / Filter -------------------- */
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
