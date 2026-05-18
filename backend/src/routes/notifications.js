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
    res.status(500).json({ error: 'Loi kiem tra thong bao gio hang' });
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
    res.status(500).json({ error: 'Loi tai thong bao' });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await Notification.markAllRead(req.user.userId);
    res.json({ message: 'Da danh dau tat ca thong bao la da doc' });
  } catch (err) {
    res.status(500).json({ error: 'Loi cap nhat thong bao' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await Notification.markRead(req.user.userId, req.params.id);
    res.json({ message: 'Da danh dau thong bao la da doc' });
  } catch (err) {
    res.status(500).json({ error: 'Loi cap nhat thong bao' });
  }
});

module.exports = router;
