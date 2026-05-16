const express = require('express');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/events', optionalAuth, async (req, res) => {
  try {
    await AnalyticsEvent.track({
      eventType: req.body?.eventType,
      userId: req.user?.userId || null,
      anonymousId: req.body?.anonymousId,
      courseId: req.body?.courseId,
      orderId: req.body?.orderId,
      metadata: req.body?.metadata,
      pageUrl: req.body?.pageUrl,
      referrer: req.body?.referrer,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Analytics tracking failed' });
  }
});

module.exports = router;
