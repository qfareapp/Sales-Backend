const express = require('express');
const router = express.Router();
const DailyUpdate = require('../models/DailyUpdate');

// 🔹 POST a new daily update
router.post('/', async (req, res) => {
  try {
    const { projectId, date, wagonSold } = req.body;

    if (!projectId || !date || wagonSold === undefined) {
      return res.status(400).json({ status: 'Error', message: 'Missing required fields' });
    }

    const update = new DailyUpdate({ projectId, date, wagonSold });
    await update.save();

    res.json({ status: 'Success', data: update });
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// 🔹 GET all daily updates
router.get('/', async (req, res) => {
  try {
    const updates = await DailyUpdate.find().sort({ date: 1 });
    res.json(updates);
  } catch (err) {
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

module.exports = router;
