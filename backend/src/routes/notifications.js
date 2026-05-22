const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.post('/check-abandoned-cart', async (req, res) => {
  try {
    const result = await Notification.checkAbandonedCart(req.user.userId);
    const unreadCount = await Notification.getUnreadCount(req.user.userId);
    res.json({ ...result, unreadCount });
  } catch (err) {
    console.error('Check abandoned cart notification error:', err);
    res.status(500).json({ error: 'Lỗi kiểm tra thông báo giỏ hàng' });
  }
});

router.get('/', async (req, res) => {
  try {
    await Notification.checkAbandonedCart(req.user.userId);
    const notifications = await Notification.getByUser(req.user.userId);
    const unreadCount = await Notification.getUnreadCount(req.user.userId);
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Lỗi tải thông báo' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await Notification.markAllRead(req.user.userId);
    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật thông báo' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.markRead(req.user.userId, req.params.id);
    res.json({ message: 'Đã đánh dấu thông báo là đã đọc' });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi cập nhật thông báo' });
  }
});

module.exports = router;
