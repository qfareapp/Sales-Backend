const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const DailyUpdate = require('../models/DailyUpdate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ----------------------------
// 🔧 Helper: Generate Unique Order ID
// ----------------------------
async function generateNextOrderId() {
  // Find the latest enquiry by created date or orderId sequence
  const last = await Enquiry.findOne().sort({ createdAt: -1 }).lean();

  let nextNumber = 1;
  if (last && last.orderId) {
    const match = last.orderId.match(/ORD-(\d+)/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }

  return `ORD-${String(nextNumber).padStart(4, '0')}`;
}


// ---- Multer setup ----
const uploadDir = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

// ----------------------------
// CREATE ENQUIRY
// ----------------------------
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    if (!body.orderId || body.orderId.trim() === '') {
  body.orderId = await generateNextOrderId();
}
    if (body.stage === 'Confirmed' && (!body.projectId || body.projectId.trim() === '')) {
      body.projectId = `PRJ-${Date.now()}`;
    }

    const enquiry = new Enquiry(body);
    await enquiry.save();
    res.json({ status: 'Success', orderId: enquiry.orderId });
  } catch (err) {
    console.error('❌ POST Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------------
// LIST ENQUIRIES (with KPI)
// ----------------------------
router.get('/', async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    const updates = await DailyUpdate.find();

    const enriched = enquiries.map(enq => {
      const totalWagons = (enq.noOfRakes || 0) * (enq.wagonsPerRake || 0);
      const sold = updates
        .filter(u => u.projectId === enq.projectId)
        .reduce((sum, u) => sum + (u.wagonSold || 0), 0);
      const price = parseFloat(enq.pricePerWagon) || 0;
      const currentOrderInHand = (totalWagons - sold) * price;

      return {
        ...enq._doc,
        totalWagons,
        soldTillDate: sold,
        currentOrderInHand: currentOrderInHand.toFixed(2),
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('❌ GET Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------------
// CONFIRMED ORDERS (KPIs)
// ----------------------------
router.get('/orders', async (req, res) => {
  try {
    const confirmedOrders = await Enquiry.find({ stage: { $in: ['Confirmed', 'Order Confirmed'] } });
    const updates = await DailyUpdate.find();

    const deliveredMap = {};
    updates.forEach(update => {
      deliveredMap[update.projectId] = (deliveredMap[update.projectId] || 0) + (update.wagonSold || 0);
    });

    let totalOrderInHand = 0;
    let totalVUInHand = 0;
    let twrlAmount = 0, twrlVU = 0;
    let trelAmount = 0, trelVU = 0;

    const enrichedOrders = confirmedOrders.map(order => {
      const totalOrdered = (order.noOfRakes || 0) * (order.wagonsPerRake || 0);
      const delivered = deliveredMap[order.projectId] || 0;
      const pending = totalOrdered - delivered;

      const pricePerWagon =
        order.pricePerWagon ||
        (totalOrdered > 0 ? (order.quotedPrice || 0) / totalOrdered : 0);

      const orderInHandAmount = pending * pricePerWagon;

      totalOrderInHand += orderInHandAmount;
      totalVUInHand += pending;

      const clientType = (order.clientType || '').toUpperCase();
      if (clientType.includes('TWRL')) {
        twrlAmount += orderInHandAmount; twrlVU += pending;
      } else if (clientType.includes('TREL')) {
        trelAmount += orderInHandAmount; trelVU += pending;
      }

      return {
        ...order._doc,
        totalOrdered,
        delivered,
        pending,
        pricePerWagon,
        orderInHandAmount
      };
    });

    res.json({
      orders: enrichedOrders,
      totalOrderInHand,
      totalVUInHand,
      twrlAmount,
      twrlVU,
      trelAmount,
      trelVU
    });
  } catch (err) {
    console.error('❌ GET /orders Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------------
// PROJECT SUMMARY (place BEFORE :id)
// ----------------------------
router.get('/project-summary/:projectId', async (req, res) => {
  const { projectId } = req.params;

  // helper to make absolute URLs (works for both relative & absolute inputs)
  const makeAbs = (req, url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const base = `${req.protocol}://${req.get('host')}`;
    return `${base}${url.startsWith('/') ? url : `/${url}`}`;
  };

  try {
    const enquiry = await Enquiry.findOne({ projectId }).lean();
    if (!enquiry) {
      return res.status(404).json({ status: 'Error', message: 'Project not found' });
    }

    // ---- Build date-wise delivery map ----
    const updates = await DailyUpdate.find({ projectId }).sort({ date: 1 });
    const deliveredWagons = updates.reduce((sum, u) => sum + Number(u.wagonSold || 0), 0);

    const dateWiseData = {};
    updates.forEach(update => {
      const d = new Date(update.date).toISOString().split('T')[0]; // YYYY-MM-DD
      const qty = Number(update.wagonSold || 0);
      dateWiseData[d] = (dateWiseData[d] || 0) + qty;
    });

    // ---- Order totals ----
    const totalWagons = (enquiry.noOfRakes || 0) * (enquiry.wagonsPerRake || 0);
    const pending = Math.max(0, totalWagons - deliveredWagons);

    // ---- Milestones with absolute file URLs ----
    const toYMD = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt) ? null : dt.toISOString().slice(0, 10);
};

const milestones = {};
const src = enquiry.milestones;

if (src && typeof src[Symbol.iterator] === 'function') {
  for (const [key, v = {}] of src) {
    const absUrl = makeAbs(req, v.fileUrl);
    milestones[key] = {
      date: toYMD(v.date),
      notes: v.notes || '',
      fileUrl: absUrl,
      fileName: v.fileName || (absUrl ? absUrl.split('/').pop() : null),
    };
  }
} else {
  for (const [key, v = {}] of Object.entries(src || {})) {
    const absUrl = makeAbs(req, v.fileUrl);
    milestones[key] = {
      date: toYMD(v.date),
      notes: v.notes || '',
      fileUrl: absUrl,
      fileName: v.fileName || (absUrl ? absUrl.split('/').pop() : null),
    };
  }
}

    // ---- Response ----
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
res.set('Pragma', 'no-cache');
res.set('Expires', '0');
res.set('Surrogate-Control', 'no-store');

    res.json({
      projectId,
      clientName: enquiry.clientName,
      wagonType: enquiry.wagonType,
      startDate: enquiry.deliveryStart || null,
      endDate: enquiry.deliveryEnd || null,
      totalOrdered: totalWagons,
      delivered: deliveredWagons,
      pending,
      quotedPrice: Number(enquiry.quotedPrice || 0),
      pricePerWagon:
        Number(enquiry.pricePerWagon || 0) ||
        (totalWagons ? Number(enquiry.quotedPrice || 0) / totalWagons : 0),
      dateWiseDelivery: dateWiseData,
      milestones, // now includes absolute fileUrl + fileName
    });
  } catch (err) {
    console.error('❌ project-summary Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------------
// SAVE MILESTONES (NEW)  <<< THIS FIXES YOUR 404
// ----------------------------
const makeAbs = (req, url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url; // already absolute
  return `${req.protocol}://${req.get('host')}${url.startsWith('/') ? url : `/${url}`}`;
};

// ----------------------------
// SAVE MILESTONES + APPEND TO attachment
// ----------------------------
router.post('/:projectId/milestones', upload.any(), async (req, res) => {
  try {
    const { projectId } = req.params;

    // 1) Normalize body (supports nested objects and bracket fields)
    const grouped = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (typeof v === 'object' && v !== null) {
        grouped[k] = v; // e.g. main_file_opening: { date, notes }
      } else {
        const m = k.match(/^([^\[]+)\[([^\]]+)\]$/); // e.g. main_file_opening[date]
        if (m) {
          const [, group, sub] = m;
          (grouped[group] ||= {})[sub] = v;
        }
      }
    }

    // 2) Attach uploaded files both to milestones and to attachments[]
    const uploadedForAttachments = []; // <- will be pushed into doc.attachment
    (req.files || []).forEach((f) => {
      // milestone key from fieldname
      const m = f.fieldname.match(/^([^\[]+)\[file\]$/) || f.fieldname.match(/^([^.]+)\.file$/);
      const group = m ? (m[1] || m[2]) : null;

      const relUrl = `/uploads/${path.basename(f.path)}`;
      const name   = f.originalname;

      if (group) {
        (grouped[group] ||= {});
        grouped[group].fileUrl  = relUrl; // store RELATIVE in DB
        grouped[group].fileName = name;
      }

      // Also collect for attachments[]
      uploadedForAttachments.push({ name, url: relUrl });
    });

    // 3) Load doc
    const doc = await Enquiry.findOne({ projectId });
    if (!doc) {
      return res.status(404).json({ status: 'Error', message: 'Project not found' });
    }
    if (!doc.milestones) doc.milestones = new Map();
    if (!Array.isArray(doc.attachment)) doc.attachment = [];

    // 4) Date caster
    const castToDateOrNull = (s) => {
      if (s === undefined) return undefined;
      if (!s) return null;
      const dt = new Date(`${String(s).slice(0,10)}T00:00:00.000Z`);
      return isNaN(dt) ? null : dt;
    };

    // 5) Merge grouped -> milestones map
    for (const [key, curr] of Object.entries(grouped)) {
      if (key.startsWith('$') || key.includes('.')) continue;

      const prev = doc.milestones.get(key) || {};
      const nextDate = (curr.date !== undefined) ? castToDateOrNull(curr.date) : (prev.date ?? null);

      const next = {
        date: nextDate,
        notes: curr.notes ?? prev.notes ?? '',
        fileUrl: (curr.fileUrl !== undefined) ? curr.fileUrl : (prev.fileUrl ?? null),
        fileName: (curr.fileName !== undefined) ? curr.fileName : (prev.fileName ?? null),
      };

      doc.milestones.set(key, next);
    }

    // 6) Append any uploaded files into attachment[]
    if (uploadedForAttachments.length) {
      doc.attachment.push(...uploadedForAttachments);
    }

    // 7) Persist (force Map detection)
    doc.markModified('milestones');
    await doc.save();

    // 8) Build response with ABSOLUTE URLs
    const makeAbs = (req, url) => {
      if (!url) return null;
      if (/^https?:\/\//i.test(url)) return url;
      return `${req.protocol}://${req.get('host')}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const responseMilestones = {};
    for (const [k, v] of doc.milestones) {
      responseMilestones[k] = {
        ...v,
        fileUrl: makeAbs(req, v.fileUrl),
      };
    }
    const responseAttachments = (doc.attachment || []).map(a => ({
      ...a,
      url: makeAbs(req, a.url),
    }));

    return res.json({
      status: 'Success',
      message: 'Milestones & attachments updated',
      milestones: responseMilestones,
      attachments: responseAttachments,
    });
  } catch (err) {
    console.error('❌ milestones save Error:', err);
    return res.status(500).json({ status: 'Error', message: 'Milestones save failed' });
  }
});


// ----------------------------
// ADD ATTACHMENTS TO ENQUIRY
// ----------------------------
router.post('/:id/attachments', upload.array('files'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });

    const files = (req.files || []).map(file => ({
      name: file.originalname,
      url: `${req.protocol}://${req.get('host')}/uploads/${path.basename(file.path)}`
    }));

    let current = [];
    if (Array.isArray(enquiry.attachment)) current = enquiry.attachment;
    else if (typeof enquiry.attachment === 'object' && enquiry.attachment) current = [enquiry.attachment];

    enquiry.attachment = [...current, ...files];
    await enquiry.save();

    res.json({ attachments: enquiry.attachment });
  } catch (err) {
    console.error('❌ Attachment Upload Error:', err.message);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// ----------------------------
// GET BY ID  (keep LAST)
// ----------------------------
router.get('/:id', async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ status: 'Error', message: 'Enquiry not found' });
    res.json(enquiry);
  } catch (err) {
    console.error('❌ GET by ID Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ----------------------------
// PATCH BY ID  (optional after GET :id if you prefer)
// ----------------------------
router.patch('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    Object.keys(updateData).forEach(k => (updateData[k] === undefined || updateData[k] === '') && delete updateData[k]);

    const updated = await Enquiry.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    if (!updated) return res.status(404).json({ status: 'Error', message: 'Enquiry not found' });

    res.json({ status: 'Success', updated });
  } catch (err) {
    console.error('❌ PATCH Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

router.post("/:id/milestones/bulk", async (req, res) => {
  try {
    const { milestones } = req.body;
    const { id } = req.params;

    // Small date parser
    const parseDate = (val) => {
      if (!val) return null;
      if (typeof val === "number") {
        // Excel serial date
        return new Date(Math.round((val - 25569) * 86400 * 1000));
      }
      const dt = new Date(val);
      return isNaN(dt) ? null : dt;
    };

    const formatted = milestones.map((m) => ({
      milestone: m.Milestone,
      responsibility: m.Responsibility,
      planDate: parseDate(m.Plan),
      actualDate: parseDate(m.Actual),
      status: m.Status || "Plan",
      lot: m.Lot || "Lot 1",
    }));

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!Array.isArray(enquiry.milestones)) enquiry.milestones = [];
    enquiry.milestones.push(...formatted);

    await enquiry.save();

    res.json({ success: true, count: formatted.length });
  } catch (err) {
    console.error("❌ Bulk insert failed:", err);
    res.status(500).json({ error: "Bulk insert failed" });
  }
});

module.exports = router;
