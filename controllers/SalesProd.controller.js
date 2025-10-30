import SalesProdPlan from "../models/SalesProdPlan.model.js";
import SalesProdAchievement from "../models/SalesProdAchievement.model.js";

/* ===========================================================
   1️⃣ Data Entry APIs
=========================================================== */
export const savePlan = async (req, res) => {
  try {
    const { fy, month, segment, plan } = req.body;
    const existing = await SalesProdPlan.findOne({ fy, month, segment });
    if (existing) {
      existing.plan = plan;
      await existing.save();
    } else {
      await SalesProdPlan.create({ fy, month, segment, plan });
    }
    res.json({ success: true, message: "Plan saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const saveAchievement = async (req, res) => {
  try {
    const { fy, month, segment, achieved } = req.body;
    const existing = await SalesProdAchievement.findOne({ fy, month, segment });
    if (existing) {
      existing.achieved = achieved;
      await existing.save();
    } else {
      await SalesProdAchievement.create({ fy, month, segment, achieved });
    }
    res.json({ success: true, message: "Achievement saved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/* ===========================================================
   2️⃣ Analytics API – KPIs, Trends, Comparisons
=========================================================== */
export const getAnalytics = async (req, res) => {
  try {
    const { fy = "2025-26", compareFy = "2024-25" } = req.query;

    /* -------------------- Fetch Data -------------------- */
    const plans = await SalesProdPlan.find({ fy });
    const achs = await SalesProdAchievement.find({ fy });
    const plansPrev = await SalesProdPlan.find({ fy: compareFy });
    const achsPrev = await SalesProdAchievement.find({ fy: compareFy });

    /* -------------------- Merge Helper -------------------- */
    const mergeData = (plans, achs) => {
      const map = {};
      for (const p of plans)
        map[`${p.month}_${p.segment}`] = { ...p._doc, achieved: 0 };
      for (const a of achs) {
        const key = `${a.month}_${a.segment}`;
        map[key] = {
          ...(map[key] || {}),
          achieved: a.achieved,
          fy: a.fy,
          month: a.month,
          segment: a.segment,
        };
      }
      return Object.values(map).map((x) => ({
        fy: x.fy,
        month: x.month,
        segment: x.segment,
        plan: x.plan || 0,
        achieved: x.achieved || 0,
        percent: x.plan ? ((x.achieved / x.plan) * 100).toFixed(1) : 0,
      }));
    };

    /* ===========================================================
       ✅ FY-specific month mapping & zero-fill
    ============================================================ */
    const monthLabels = {
      "2023-24": [
        "Apr'23","May'23","Jun'23","Jul'23","Aug'23","Sep'23",
        "Oct'23","Nov'23","Dec'23","Jan'24","Feb'24","Mar'24"
      ],
      "2024-25": [
        "Apr'24","May'24","Jun'24","Jul'24","Aug'24","Sep'24",
        "Oct'24","Nov'24","Dec'24","Jan'25","Feb'25","Mar'25"
      ],
      "2025-26": [
        "Apr'25","May'25","Jun'25","Jul'25","Aug'25","Sep'25",
        "Oct'25","Nov'25","Dec'25","Jan'26","Feb'26","Mar'26"
      ],
    };

    const segments = ["IR", "Pvt"];

    const fillMissingMonths = (records, fy) => {
  const base = monthLabels[fy] || monthLabels["2025-26"];
  const filled = [];

  for (const month of base) {
    for (const seg of segments) {
      // find matching record ignoring the year suffix
      const found = records.find(
        (r) =>
          r.segment === seg &&
          month.slice(0, 3) === r.month.slice(0, 3) // match by month name only (Apr, May, etc.)
      );

      filled.push({
        fy,
        month, // ✅ force correct FY label (e.g., Apr'24)
        segment: seg,
        plan: found ? found.plan || 0 : 0,
        achieved: found ? found.achieved || 0 : 0,
        percent: found && found.plan ? ((found.achieved / found.plan) * 100).toFixed(1) : 0,
      });
    }
  }

  return filled;
};

    const current = fillMissingMonths(mergeData(plans, achs), fy);
    const previous = fillMissingMonths(mergeData(plansPrev, achsPrev), compareFy);

    /* -------------------- Aggregations -------------------- */
    const sum = (arr, key) => arr.reduce((a, b) => a + (b[key] || 0), 0);

    const curPlan = sum(current, "plan");
    const curAch = sum(current, "achieved");
    const prevPlan = sum(previous, "plan");
    const prevAch = sum(previous, "achieved");

    // Segment splits
    const irPlan = sum(current.filter((x) => x.segment === "IR"), "plan");
    const irAch = sum(current.filter((x) => x.segment === "IR"), "achieved");
    const pvtPlan = sum(current.filter((x) => x.segment === "Pvt"), "plan");
    const pvtAch = sum(current.filter((x) => x.segment === "Pvt"), "achieved");

    /* ===========================================================
       ✅ Quarterly Summary (Q1–Q4 fixed)
    ============================================================ */
    const quarters = {
      Q1: ["Apr", "May", "Jun"],
      Q2: ["Jul", "Aug", "Sep"],
      Q3: ["Oct", "Nov", "Dec"],
      Q4: ["Jan", "Feb", "Mar"],
    };

    const quarterData = Object.entries(quarters).map(([q, months]) => {
      const subset = current.filter((x) =>
        months.some((m) => x.month.startsWith(m))
      );
      const plan = sum(subset, "plan");
      const achieved = sum(subset, "achieved");
      return {
        quarter: q,
        plan,
        achieved,
        percent: plan ? ((achieved / plan) * 100).toFixed(1) : 0,
      };
    });

    /* ===========================================================
       ✅ KPI Calculation
    ============================================================ */
    const safePct = (num) => (isFinite(num) ? num.toFixed(1) : "0.0");

    const KPIs = {
      fy,
      totalPlan: curPlan,
      totalAchieved: curAch,
      achievementPercent: safePct((curAch / curPlan) * 100),
      irPercent: safePct((irAch / curAch) * 100),
      pvtPercent: safePct((pvtAch / curAch) * 100),
      yoyPlanGrowth: safePct(((curPlan - prevPlan) / prevPlan) * 100),
      yoyAchGrowth: safePct(((curAch - prevAch) / prevAch) * 100),
      irYoYGrowth: safePct(
        ((irAch -
          sum(previous.filter((x) => x.segment === "IR"), "achieved")) /
          sum(previous.filter((x) => x.segment === "IR"), "achieved")) * 100
      ),
      pvtYoYGrowth: safePct(
        ((pvtAch -
          sum(previous.filter((x) => x.segment === "Pvt"), "achieved")) /
          sum(previous.filter((x) => x.segment === "Pvt"), "achieved")) * 100
      ),
      gapAbsolute: curPlan - curAch,
      gapPercent: safePct(((curPlan - curAch) / curPlan) * 100),
    };

    /* -------------------- Response -------------------- */
    res.json({
      KPIs,
      monthly: current,      // always Apr–Mar aligned
      quarterly: quarterData,
      compare: { fyPrev: compareFy, planPrev: prevPlan, achPrev: prevAch },
    });
  } catch (err) {
    console.error("Analytics Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
