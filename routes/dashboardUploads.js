const express = require('express');
const multer = require('multer');
const DashboardUpload = require('../models/DashboardUpload');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { siteId, category } = req.body;
    if (!siteId || !category) {
      return res.status(400).json({ success: false, message: 'siteId and category are required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    const doc = await DashboardUpload.create({
      siteId,
      category,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    });

    return res.json({
      success: true,
      id: doc._id,
      uploadedAt: doc.createdAt,
      originalName: doc.originalName,
      size: doc.size,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:siteId/:category/latest', async (req, res, next) => {
  try {
    const { siteId, category } = req.params;
    const doc = await DashboardUpload.findOne({ siteId, category }).sort({ createdAt: -1 }).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'No upload found' });
    }

    return res.json({
      success: true,
      upload: {
        id: doc._id,
        siteId: doc.siteId,
        category: doc.category,
        uploadedAt: doc.createdAt,
        originalName: doc.originalName,
        size: doc.size,
      },
      file: {
        data: doc.data.toString('base64'),
        mimeType: doc.mimeType,
        originalName: doc.originalName,
      },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
