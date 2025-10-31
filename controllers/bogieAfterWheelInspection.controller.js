const BogieAfterWheelInspection = require("../models/BogieAfterWheelInspection");
const BogieInspection = require("../models/BogieInspection");

/* ==========================================================
   ✅ Create a new "After Wheeling" inspection
   ========================================================== */
const createAfterWheelInspection = async (req, res) => {
  try {
    const {
      bogieNo,
      inspectionType = "after-wheeling",
      date,
      inspectorName,
      remarks,
    } = req.body;

    if (!bogieNo) {
      return res.status(400).json({ message: "Bogie number is required." });
    }

    const existing = await BogieAfterWheelInspection.findOne({ bogieNo });
    if (existing) {
      return res
        .status(409)
        .json({ message: "After-wheeling inspection already exists for this bogie." });
    }

    // Parse JSON safely
    let parsedSections = {};
    if (req.body.sections) {
      try {
        parsedSections =
          typeof req.body.sections === "string"
            ? JSON.parse(req.body.sections)
            : req.body.sections;
      } catch (err) {
        console.warn("⚠️ Invalid sections JSON:", err.message);
      }
    }

    // Normalize signature path
    const signaturePath = req.file
      ? req.file.path.replace(/\\/g, "/")
      : req.body.inspectorSignature || "";

    const record = new BogieAfterWheelInspection({
      bogieNo,
      inspectionType,
      date: date || new Date().toISOString().slice(0, 10),
      inspectorName,
      inspectorSignature: signaturePath,
      sections: parsedSections,
      remarks,
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: "✅ After-wheeling inspection saved successfully.",
      data: record,
    });
  } catch (error) {
    console.error("❌ Error saving after-wheeling inspection:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ==========================================================
   ✅ Check if "Before Wheeling" inspection exists
   ========================================================== */
const checkBeforeWheelStatus = async (req, res) => {
  try {
    const { bogieNo } = req.query;
    if (!bogieNo) {
      return res.status(400).json({ message: "Missing bogieNo parameter." });
    }

    const existing = await BogieInspection.findOne({
      bogieNo,
      inspectionType: "before-wheeling",
    });

    res.json({ completed: !!existing });
  } catch (error) {
    console.error("❌ Error checking before-wheeling status:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/* ==========================================================
   ✅ Get pending bogies (before done, after not done)
   ========================================================== */
const getPendingBogieNumbers = async (req, res) => {
  try {
    const beforeDone = await BogieInspection.find({
      inspectionType: "before-wheeling",
    }).select("bogieNo -_id");

    const afterDone = await BogieAfterWheelInspection.find({
      inspectionType: "after-wheeling",
    }).select("bogieNo -_id");

    const beforeSet = new Set(beforeDone.map((b) => b.bogieNo));
    const afterSet = new Set(afterDone.map((b) => b.bogieNo));

    const pending = [...beforeSet].filter((b) => !afterSet.has(b));

    res.json({ bogieNumbers: pending });
  } catch (err) {
    console.error("❌ Error fetching pending bogies:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/* ==========================================================
   ✅ Export all handlers
   ========================================================== */
module.exports = {
  createAfterWheelInspection,
  checkBeforeWheelStatus,
  getPendingBogieNumbers,
};
