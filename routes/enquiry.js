const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const DailyUpdate = require('../models/DailyUpdate'); // ✅ for KPI
const multer = require('multer');
const path = require('path');

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// ✅ Create new enquiry
router.post('/', async (req, res) => {
  try {
    const body = req.body;

    // Auto-generate orderId if not provided
    if (!body.orderId || body.orderId.trim() === '') {
      const count = await Enquiry.countDocuments();
      body.orderId = `ORD-${String(count + 1).padStart(4, '0')}`;
    }

    // Auto-generate projectId if stage is Confirmed and not provided
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

// ✅ Get all enquiries with KPI: currentOrderInHand
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

// ✅ Get confirmed orders with enriched delivery & KPI
router.get('/orders', async (req, res) => {
  try {
    const confirmedOrders = await Enquiry.find({ stage: { $in: ['Confirmed', 'Order Confirmed'] } });
    const updates = await DailyUpdate.find();

    // Step 1: Build delivery map per projectId
    const deliveredMap = {};
    updates.forEach(update => {
      deliveredMap[update.projectId] = (deliveredMap[update.projectId] || 0) + update.wagonSold;
    });

    // Step 2: Enrich confirmed orders with delivery info
    let totalOrderInHand = 0;
    let totalVUInHand = 0;
    let twrlAmount = 0, twrlVU = 0;
    let trelAmount = 0, trelVU = 0;

    const enrichedOrders = confirmedOrders.map(order => {
      const totalOrdered = (order.noOfRakes || 0) * (order.wagonsPerRake || 0);
      const delivered = deliveredMap[order.projectId] || 0;
      const pending = totalOrdered - delivered;

      const pricePerWagon = totalOrdered > 0 ? (order.quotedPrice || 0) / totalOrdered : 0;
      const orderInHandAmount = pending * pricePerWagon;

      totalOrderInHand += orderInHandAmount;
      totalVUInHand += pending;

      const clientType = (order.clientType || '').toUpperCase();
      if (clientType.includes('TWRL')) {
        twrlAmount += orderInHandAmount;
        twrlVU += pending;
      } else if (clientType.includes('TREL')) {
        trelAmount += orderInHandAmount;
        trelVU += pending;
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

    // Respond with enriched order + new KPIs
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


// ✅ Get a single enquiry by ID
router.get('/:id', async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ status: 'Error', message: 'Enquiry not found' });
    }
    res.json(enquiry);
  } catch (err) {
    console.error('❌ GET by ID Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ✅ PATCH - Update enquiry by ID
router.patch('/:id', async (req, res) => {
  try {
    const updateData = req.body;

    // Remove undefined or empty fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === '') {
        delete updateData[key];
      }
    });

    const updated = await Enquiry.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });

    if (!updated) {
      return res.status(404).json({ status: 'Error', message: 'Enquiry not found' });
    }

    res.json({ status: 'Success', updated });
  } catch (err) {
    console.error('❌ PATCH Error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// ✅ POST - Upload multiple attachments to an enquiry
router.post('/:id/attachments', upload.array('files'), async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });

    const files = req.files.map(file => ({
      name: file.originalname,
      url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    }));

    let currentAttachments = [];
if (Array.isArray(enquiry.attachment)) {
  currentAttachments = enquiry.attachment;
} else if (typeof enquiry.attachment === 'string' && enquiry.attachment.trim() === '') {
  currentAttachments = [];
} else if (typeof enquiry.attachment === 'object') {
  currentAttachments = [enquiry.attachment];
}
enquiry.attachment = [...currentAttachments, ...files];
    await enquiry.save();

    res.json({ attachments: enquiry.attachment });
  } catch (err) {
    console.error('❌ Attachment Upload Error:', err.message);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});
// 📊 Project Summary API
router.get('/project-summary/:projectId', async (req, res) => {
  const { projectId } = req.params;

  try {
    const enquiry = await Enquiry.findOne({ projectId });
    const updates = await DailyUpdate.find({ projectId }).sort({ date: 1 });

    const deliveredWagons = updates.reduce((sum, u) => sum + Number(u.wagonSold || 0), 0);
    const dateWiseData = {};

    updates.forEach(update => {
  const d = new Date(update.date).toISOString().split('T')[0];
  const qty = Number(update.wagonSold || 0);
  dateWiseData[d] = (dateWiseData[d] || 0) + qty;
});

    const totalWagons = enquiry.noOfRakes * enquiry.wagonsPerRake;
    const pending = totalWagons - deliveredWagons;

    res.json({
      projectId,
      clientName: enquiry.clientName,
      wagonType: enquiry.wagonType,
      startDate: enquiry.deliveryStart,
      endDate: enquiry.deliveryEnd,
      totalOrdered: totalWagons,
      delivered: deliveredWagons,
      pending,
      quotedPrice: enquiry.quotedPrice,
      pricePerWagon: enquiry.pricePerWagon,
      dateWiseDelivery: dateWiseData
    });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
