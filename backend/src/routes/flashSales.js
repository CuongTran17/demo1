const express = require('express');
const FlashSale = require('../models/FlashSale');

const router = express.Router();

// Public endpoint: anyone (including non-logged users) can view active flash sale countdown
router.get('/active', async (req, res) => {
  try {
    const sale = await FlashSale.getActivePublicSale();
    if (!sale) return res.json({ active: false, sale: null });

    res.json({ active: true, sale });
  } catch (err) {
    console.error('Get active flash sale error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

module.exports = router;
