const crypto = require('crypto');
const db = require('../config/database');

const ALLOWED_EVENTS = new Set([
  'course_click',
  'add_to_cart',
  'checkout_start',
  'payment_created',
  'payment_completed',
  'payment_cancelled',
  'payment_failed',
]);

function normalizeRange(range, alias = '') {
  const prefix = alias ? `${alias}.` : '';
  if (range === 'day') return { sql: `DATE(${prefix}created_at) = CURDATE()`, label: 'day' };
  if (range === 'week' || range === '7d') return { sql: `${prefix}created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, label: 'week' };
  if (range === 'month' || range === '30d') return { sql: `${prefix}created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, label: 'month' };
  if (range === 'quarter' || range === '90d') return { sql: `${prefix}created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`, label: 'quarter' };
  if (range === 'all') return { sql: '1=1', label: 'all' };
  return { sql: `${prefix}created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, label: 'month' };
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip)).digest('hex');
}

function cleanString(value, maxLength) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeOrderId(orderId) {
  if (orderId == null || orderId === '') return null;
  const num = Number(orderId);
  return Number.isInteger(num) && num > 0 ? num : null;
}

class AnalyticsEvent {
  static async track({ eventType, userId, anonymousId, courseId, orderId, metadata, pageUrl, referrer, userAgent, ip }) {
    if (!ALLOWED_EVENTS.has(eventType)) {
      const err = new Error('Unsupported analytics event');
      err.status = 400;
      throw err;
    }

    await db.execute(
      `INSERT INTO analytics_events
       (event_type, user_id, anonymous_id, course_id, order_id, metadata, page_url, referrer, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        userId || null,
        cleanString(anonymousId, 64),
        cleanString(courseId, 50),
        normalizeOrderId(orderId),
        JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
        cleanString(pageUrl, 1024),
        cleanString(referrer, 1024),
        cleanString(userAgent, 512),
        hashIp(ip),
      ]
    );
  }

  static async trackOrderCourses(eventType, orderId, metadata = {}) {
    if (!ALLOWED_EVENTS.has(eventType)) return;

    const [items] = await db.execute(
      `SELECT o.user_id, oi.course_id
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.order_id
       WHERE o.order_id = ?`,
      [orderId]
    );

    for (const item of items) {
      await this.track({
        eventType,
        userId: item.user_id,
        courseId: item.course_id,
        orderId,
        metadata,
      });
    }
  }

  static async getFunnel(range = '30d') {
    const eventRange = normalizeRange(range, 'ae');
    const orderRange = normalizeRange(range, 'o');
    const plainEventRange = normalizeRange(range);

    const [summaryRows] = await db.execute(
      `SELECT event_type,
              COUNT(*) AS total_events,
              COUNT(DISTINCT COALESCE(CONCAT('u:', user_id), CONCAT('a:', anonymous_id), CONCAT('e:', event_id))) AS unique_people
       FROM analytics_events
       WHERE ${plainEventRange.sql}
       GROUP BY event_type`
    );

    const [courseRows] = await db.execute(
      `SELECT c.course_id,
              c.course_name,
              c.category,
              COALESCE(es.interest_clicks, 0) AS interest_clicks,
              COALESCE(es.unique_interested, 0) AS unique_interested,
              COALESCE(es.add_to_cart_count, 0) AS add_to_cart_count,
              COALESCE(es.checkout_start_count, 0) AS checkout_start_count,
              COALESCE(os.completed_orders, 0) AS completed_orders,
              CAST(COALESCE(os.revenue, 0) AS UNSIGNED) AS revenue
       FROM courses c
       LEFT JOIN (
         SELECT ae.course_id,
                COUNT(CASE WHEN ae.event_type = 'course_click' THEN 1 END) AS interest_clicks,
                COUNT(DISTINCT CASE WHEN ae.event_type = 'course_click'
                  THEN COALESCE(CONCAT('u:', ae.user_id), CONCAT('a:', ae.anonymous_id), CONCAT('e:', ae.event_id)) END) AS unique_interested,
                COUNT(CASE WHEN ae.event_type = 'add_to_cart' THEN 1 END) AS add_to_cart_count,
                COUNT(CASE WHEN ae.event_type = 'checkout_start' THEN 1 END) AS checkout_start_count
         FROM analytics_events ae
         WHERE ${eventRange.sql}
           AND ae.course_id IS NOT NULL
         GROUP BY ae.course_id
       ) es ON es.course_id = c.course_id
       LEFT JOIN (
         SELECT oi.course_id,
                COUNT(DISTINCT o.order_id) AS completed_orders,
                SUM(oi.price) AS revenue
         FROM order_items oi
         JOIN orders o ON o.order_id = oi.order_id
         WHERE o.status = 'completed'
           AND ${orderRange.sql}
         GROUP BY oi.course_id
       ) os ON os.course_id = c.course_id
       WHERE COALESCE(es.interest_clicks, 0) > 0
          OR COALESCE(es.add_to_cart_count, 0) > 0
          OR COALESCE(es.checkout_start_count, 0) > 0
          OR COALESCE(os.completed_orders, 0) > 0
       ORDER BY interest_clicks DESC, completed_orders DESC
       LIMIT 100`
    );

    return { range: eventRange.label, summary: summaryRows, courses: courseRows };
  }
}

module.exports = AnalyticsEvent;
