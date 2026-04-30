const express = require('express');
const ContactMessage = require('../models/ContactMessage');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const messageId = await ContactMessage.create(req.body);
    res.status(201).json({
      message: 'Đã nhận được tin nhắn của bạn',
      messageId,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Lỗi gửi liên hệ' });
  }
});

module.exports = router;
