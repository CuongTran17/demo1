# Customer Behavior Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin dashboard analytics for customer interest clicks, add-to-cart activity, checkout starts, completed payments, and conversion percentages, including anonymous visitor tracking via cookie/localStorage consent.

**Architecture:** Store first-party analytics events in MySQL through a small public tracking endpoint. The React app sends behavioral events with an anonymous id for guests and the backend attaches `user_id` when an auth token is present; admin-only APIs aggregate funnel metrics by date range and course. The admin dashboard gets a new customer behavior tab with summary cards, funnel chart, and per-course conversion table.

**Tech Stack:** Node.js, Express, MySQL, React 19, Vite, Axios, ApexCharts.

---

## File Structure

- Create `backend/migrations/08-add-analytics-events.sql`: analytics events table and indexes.
- Create `backend/src/models/AnalyticsEvent.js`: event validation, inserts, and aggregate queries.
- Create `backend/src/routes/analytics.js`: public tracking endpoint with optional auth parsing.
- Modify `backend/src/server.js`: mount `/api/analytics`.
- Modify `backend/src/routes/admin.js`: add admin funnel endpoint.
- Modify `web/src/api/index.js`: add `analyticsAPI`.
- Create `web/src/utils/analytics.js`: anonymous id, consent state, event sender, dedupe helpers.
- Create `web/src/components/CookieConsentBanner.jsx`: consent UI.
- Modify `web/src/App.jsx`: render cookie banner once for public app.
- Modify `web/src/components/CourseCard.jsx`: track `course_click` on course link clicks.
- Modify `web/src/pages/CourseDetailPage.jsx`: track successful add-to-cart intent.
- Modify `web/src/context/CartContext.jsx`: optional central `add_to_cart` event after successful API add.
- Modify `web/src/pages/CheckoutPage.jsx`: track `checkout_start` once per checkout page load.
- Modify `web/src/pages/CheckoutSuccessPage.jsx` and `web/src/pages/SePayReturnPage.jsx`: send client return events only as supporting signals.
- Modify `web/src/pages/AdminDashboard.jsx`: load funnel analytics and add a new tab.
- Create `web/src/components/admin/AdminCustomerBehaviorTab.jsx`: cards, funnel chart, per-course table.
- Modify `web/src/styles/dashboard.css`: styles for the new tab and cookie banner.
- Update `README.md`: document analytics migration and cookie behavior.

---

### Task 1: Database Migration

**Files:**
- Create: `backend/migrations/08-add-analytics-events.sql`
- Modify: `database/01-create-schema.sql`

- [ ] **Step 1: Add migration for analytics events**

Create `backend/migrations/08-add-analytics-events.sql`:

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM(
        'course_click',
        'add_to_cart',
        'checkout_start',
        'payment_created',
        'payment_completed',
        'payment_cancelled',
        'payment_failed'
    ) NOT NULL,
    user_id INT NULL,
    anonymous_id VARCHAR(64) NULL,
    course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    order_id INT NULL,
    metadata JSON NULL,
    page_url VARCHAR(1024) NULL,
    referrer VARCHAR(1024) NULL,
    user_agent VARCHAR(512) NULL,
    ip_hash CHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_event_time (event_type, created_at),
    INDEX idx_analytics_course_event_time (course_id, event_type, created_at),
    INDEX idx_analytics_user_time (user_id, created_at),
    INDEX idx_analytics_anon_time (anonymous_id, created_at),
    INDEX idx_analytics_order (order_id),
    CONSTRAINT fk_analytics_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    CONSTRAINT fk_analytics_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL
);
```

- [ ] **Step 2: Mirror migration in base schema**

Add the same `CREATE TABLE IF NOT EXISTS analytics_events` block to `database/01-create-schema.sql` after the `reviews` or `contact_messages` table section so fresh installs include analytics.

- [ ] **Step 3: Apply migration locally**

Run:

```powershell
cd backend
node scripts/apply-migrations-and-check.js
```

Expected: migration completes without SQL errors and `analytics_events` exists.

- [ ] **Step 4: Commit database changes**

```powershell
git add backend/migrations/08-add-analytics-events.sql database/01-create-schema.sql
git commit -m "feat: add analytics events table"
```

---

### Task 2: Backend Analytics Model

**Files:**
- Create: `backend/src/models/AnalyticsEvent.js`

- [ ] **Step 1: Create the model**

Create `backend/src/models/AnalyticsEvent.js`:

```js
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

function normalizeRange(range) {
  if (range === '7d') return { sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)', label: '7d' };
  if (range === '90d') return { sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)', label: '90d' };
  if (range === 'all') return { sql: '1=1', label: 'all' };
  return { sql: 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)', label: '30d' };
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
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)`,
      [
        eventType,
        userId || null,
        cleanString(anonymousId, 64),
        cleanString(courseId, 50),
        orderId || null,
        JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
        cleanString(pageUrl, 1024),
        cleanString(referrer, 1024),
        cleanString(userAgent, 512),
        hashIp(ip),
      ]
    );
  }

  static async getFunnel(range = '30d') {
    const { sql, label } = normalizeRange(range);
    const [summaryRows] = await db.execute(
      `SELECT event_type,
              COUNT(*) AS total_events,
              COUNT(DISTINCT COALESCE(CONCAT('u:', user_id), CONCAT('a:', anonymous_id), CONCAT('e:', event_id))) AS unique_people
       FROM analytics_events
       WHERE ${sql}
       GROUP BY event_type`
    );

    const [courseRows] = await db.execute(
      `SELECT c.course_id,
              c.course_name,
              c.category,
              COUNT(CASE WHEN ae.event_type = 'course_click' THEN 1 END) AS interest_clicks,
              COUNT(DISTINCT CASE WHEN ae.event_type = 'course_click'
                THEN COALESCE(CONCAT('u:', ae.user_id), CONCAT('a:', ae.anonymous_id), CONCAT('e:', ae.event_id)) END) AS unique_interested,
              COUNT(CASE WHEN ae.event_type = 'add_to_cart' THEN 1 END) AS add_to_cart_count,
              COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.order_id END) AS completed_orders,
              CAST(COALESCE(SUM(CASE WHEN o.status = 'completed' THEN oi.price ELSE 0 END), 0) AS UNSIGNED) AS revenue
       FROM courses c
       LEFT JOIN analytics_events ae ON ae.course_id = c.course_id AND ${sql.replaceAll('created_at', 'ae.created_at')}
       LEFT JOIN order_items oi ON oi.course_id = c.course_id
       LEFT JOIN orders o ON o.order_id = oi.order_id
         AND o.status = 'completed'
         AND ${sql.replaceAll('created_at', 'o.created_at')}
       GROUP BY c.course_id, c.course_name, c.category
       HAVING interest_clicks > 0 OR add_to_cart_count > 0 OR completed_orders > 0
       ORDER BY interest_clicks DESC, completed_orders DESC
       LIMIT 100`
    );

    return { range: label, summary: summaryRows, courses: courseRows };
  }
}

module.exports = AnalyticsEvent;
```

- [ ] **Step 2: Run syntax check**

Run:

```powershell
node -c backend/src/models/AnalyticsEvent.js
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit model**

```powershell
git add backend/src/models/AnalyticsEvent.js
git commit -m "feat: add analytics event model"
```

---

### Task 3: Tracking API Route

**Files:**
- Create: `backend/src/routes/analytics.js`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Add optional auth middleware and tracking route**

Create `backend/src/routes/analytics.js`:

```js
const express = require('express');
const jwt = require('jsonwebtoken');
const AnalyticsEvent = require('../models/AnalyticsEvent');

const router = express.Router();

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email, role: decoded.role };
  } catch {
    req.user = null;
  }
  next();
}

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
```

- [ ] **Step 2: Mount route**

In `backend/src/server.js`, add:

```js
app.use('/api/analytics', require('./routes/analytics'));
```

Place it near the other API route mounts.

- [ ] **Step 3: Run syntax checks**

Run:

```powershell
node -c backend/src/routes/analytics.js
node -c backend/src/server.js
```

Expected: no syntax errors.

- [ ] **Step 4: Commit route**

```powershell
git add backend/src/routes/analytics.js backend/src/server.js
git commit -m "feat: add analytics tracking endpoint"
```

---

### Task 4: Admin Funnel API

**Files:**
- Modify: `backend/src/routes/admin.js`

- [ ] **Step 1: Import model**

At the top of `backend/src/routes/admin.js`, add:

```js
const AnalyticsEvent = require('../models/AnalyticsEvent');
```

- [ ] **Step 2: Add admin endpoint**

Add this near the existing `/analytics` route:

```js
router.get('/analytics/funnel', async (req, res) => {
  try {
    const data = await AnalyticsEvent.getFunnel(req.query?.range || '30d');
    res.json(data);
  } catch (err) {
    console.error('Admin funnel analytics error:', err);
    res.status(500).json({ error: 'Loi tai du lieu hanh vi khach hang' });
  }
});
```

- [ ] **Step 3: Run syntax check**

Run:

```powershell
node -c backend/src/routes/admin.js
```

Expected: no syntax errors.

- [ ] **Step 4: Commit admin API**

```powershell
git add backend/src/routes/admin.js
git commit -m "feat: expose admin funnel analytics"
```

---

### Task 5: Frontend Analytics Utility

**Files:**
- Modify: `web/src/api/index.js`
- Create: `web/src/utils/analytics.js`

- [ ] **Step 1: Add analytics API client**

In `web/src/api/index.js`, add:

```js
export const analyticsAPI = {
  track: (data) => api.post('/analytics/events', data),
};
```

Also add to `adminAPI`:

```js
getFunnelAnalytics: (range = '30d') => api.get(`/admin/analytics/funnel?range=${encodeURIComponent(range)}`),
```

- [ ] **Step 2: Add analytics helper**

Create `web/src/utils/analytics.js`:

```js
import { analyticsAPI } from '../api';

const ANON_KEY = 'ptit_anon_id';
const CONSENT_KEY = 'ptit_cookie_consent';
const DEDUPE_PREFIX = 'ptit_analytics_dedupe:';

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsConsent() {
  return localStorage.getItem(CONSENT_KEY) || '';
}

export function setAnalyticsConsent(value) {
  localStorage.setItem(CONSENT_KEY, value === 'accepted' ? 'accepted' : 'necessary');
}

export function getAnonymousId() {
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = createId();
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}

export function canTrackAnalytics() {
  return getAnalyticsConsent() === 'accepted';
}

export function shouldTrackOnce(key, ttlMs) {
  const storageKey = `${DEDUPE_PREFIX}${key}`;
  const now = Date.now();
  const previous = Number(sessionStorage.getItem(storageKey) || 0);
  if (previous && now - previous < ttlMs) return false;
  sessionStorage.setItem(storageKey, String(now));
  return true;
}

export async function trackEvent(eventType, payload = {}) {
  if (!canTrackAnalytics()) return;
  try {
    await analyticsAPI.track({
      eventType,
      anonymousId: getAnonymousId(),
      courseId: payload.courseId || null,
      orderId: payload.orderId || null,
      metadata: payload.metadata || {},
      pageUrl: window.location.href,
      referrer: document.referrer || null,
    });
  } catch {
    // Analytics must never block the user journey.
  }
}
```

- [ ] **Step 3: Run frontend lint**

Run:

```powershell
cd web
npm run lint
```

Expected: no new lint errors from `api/index.js` or `utils/analytics.js`.

- [ ] **Step 4: Commit utility**

```powershell
git add web/src/api/index.js web/src/utils/analytics.js
git commit -m "feat: add frontend analytics helper"
```

---

### Task 6: Cookie Consent UI

**Files:**
- Create: `web/src/components/CookieConsentBanner.jsx`
- Modify: `web/src/App.jsx`
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Add banner component**

Create `web/src/components/CookieConsentBanner.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { getAnalyticsConsent, setAnalyticsConsent } from '../utils/analytics';

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!getAnalyticsConsent());
  }, []);

  if (!visible) return null;

  const choose = (value) => {
    setAnalyticsConsent(value);
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div>
        <strong>Quyen rieng tu</strong>
        <p>PTIT Learning dung cookie can thiet cho dang nhap/gio hang va cookie phan tich neu ban dong y.</p>
      </div>
      <div className="cookie-consent__actions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => choose('necessary')}>
          Chi can thiet
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => choose('accepted')}>
          Dong y phan tich
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render banner in app**

In `web/src/App.jsx`, import and render:

```jsx
import CookieConsentBanner from './components/CookieConsentBanner';
```

Place near the app shell so it appears once:

```jsx
<CookieConsentBanner />
```

- [ ] **Step 3: Add CSS**

Append to `web/src/styles/global.css`:

```css
.cookie-consent {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 1000;
  width: min(420px, calc(100vw - 32px));
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.16);
}

.cookie-consent p {
  margin: 4px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
}

.cookie-consent__actions {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

@media (max-width: 640px) {
  .cookie-consent {
    left: 16px;
    right: 16px;
    bottom: 16px;
    width: auto;
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 4: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: Vite build succeeds.

- [ ] **Step 5: Commit cookie UI**

```powershell
git add web/src/components/CookieConsentBanner.jsx web/src/App.jsx web/src/styles/global.css
git commit -m "feat: add analytics cookie consent"
```

---

### Task 7: Track Customer Funnel Events

**Files:**
- Modify: `web/src/components/CourseCard.jsx`
- Modify: `web/src/pages/CourseDetailPage.jsx`
- Modify: `web/src/pages/CheckoutPage.jsx`
- Modify: `web/src/pages/CheckoutSuccessPage.jsx`
- Modify: `web/src/pages/SePayReturnPage.jsx`

- [ ] **Step 1: Track course interest clicks**

In `web/src/components/CourseCard.jsx`, import:

```js
import { shouldTrackOnce, trackEvent } from '../utils/analytics';
```

Add this function inside `CourseCard`:

```js
const handleCourseClick = () => {
  const courseId = course.course_id;
  if (shouldTrackOnce(`course_click:${courseId}`, 30 * 60 * 1000)) {
    trackEvent('course_click', {
      courseId,
      metadata: { source: spotlight ? 'spotlight_card' : 'course_card' },
    });
  }
};
```

Add to the `<Link>`:

```jsx
onClick={handleCourseClick}
```

- [ ] **Step 2: Track add-to-cart after success**

In `web/src/pages/CourseDetailPage.jsx`, import:

```js
import { trackEvent } from '../utils/analytics';
```

Inside `handleAddToCart`, after `await addToCart(id);`, add:

```js
trackEvent('add_to_cart', { courseId: id, metadata: { source: 'course_detail' } });
```

- [ ] **Step 3: Track checkout start once**

In `web/src/pages/CheckoutPage.jsx`, import:

```js
import { shouldTrackOnce, trackEvent } from '../utils/analytics';
```

Add a `useEffect` after cart data is available:

```jsx
useEffect(() => {
  if (!cartItems?.length) return;
  const courseIds = cartItems.map((item) => item.course_id).filter(Boolean);
  if (!shouldTrackOnce(`checkout_start:${courseIds.join(',')}`, 30 * 60 * 1000)) return;
  courseIds.forEach((courseId) => {
    trackEvent('checkout_start', { courseId, metadata: { cartSize: courseIds.length } });
  });
}, [cartItems]);
```

Use the page's actual cart item state name. If the page uses `items` instead of `cartItems`, keep the same logic with that variable.

- [ ] **Step 4: Track return-page supporting events**

In `web/src/pages/CheckoutSuccessPage.jsx`, send `payment_completed` once if an `orderId` is available in route state or query. In `web/src/pages/SePayReturnPage.jsx`, send:

```js
trackEvent(paymentStatus === 'success' ? 'payment_completed' : paymentStatus === 'cancel' ? 'payment_cancelled' : 'payment_failed', {
  orderId,
  metadata: { source: 'sepay_return', status: paymentStatus },
});
```

Keep admin conversion calculations based on server orders, not only this frontend event.

- [ ] **Step 5: Build and manual smoke test**

Run:

```powershell
cd web
npm run build
```

Manual test:

1. Accept analytics cookies.
2. Click a course card.
3. Add that course to cart.
4. Open checkout.
5. Confirm rows appear in `analytics_events` for `course_click`, `add_to_cart`, and `checkout_start`.

- [ ] **Step 6: Commit event hooks**

```powershell
git add web/src/components/CourseCard.jsx web/src/pages/CourseDetailPage.jsx web/src/pages/CheckoutPage.jsx web/src/pages/CheckoutSuccessPage.jsx web/src/pages/SePayReturnPage.jsx
git commit -m "feat: track customer funnel events"
```

---

### Task 8: Admin Customer Behavior Tab

**Files:**
- Create: `web/src/components/admin/AdminCustomerBehaviorTab.jsx`
- Modify: `web/src/pages/AdminDashboard.jsx`
- Modify: `web/src/styles/dashboard.css`

- [ ] **Step 1: Create tab component**

Create `web/src/components/admin/AdminCustomerBehaviorTab.jsx`:

```jsx
import Chart from 'react-apexcharts';
import { formatPrice } from '../../utils/courseFormat';

function numberValue(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function percent(part, total) {
  const p = numberValue(part);
  const t = numberValue(total);
  return t > 0 ? `${Math.round((p / t) * 100)}%` : '0%';
}

function eventSummary(summary, eventType, field = 'total_events') {
  return numberValue(summary?.find((row) => row.event_type === eventType)?.[field]);
}

export default function AdminCustomerBehaviorTab({ data, range, onRangeChange }) {
  const summary = data?.summary || [];
  const courses = data?.courses || [];
  const interestClicks = eventSummary(summary, 'course_click');
  const uniqueInterested = eventSummary(summary, 'course_click', 'unique_people');
  const addToCart = eventSummary(summary, 'add_to_cart');
  const checkoutStart = eventSummary(summary, 'checkout_start');
  const completed = courses.reduce((sum, course) => sum + numberValue(course.completed_orders), 0);

  const funnelLabels = ['Quan tam', 'Them gio', 'Checkout', 'Thanh toan'];
  const funnelValues = [interestClicks, addToCart, checkoutStart, completed];

  return (
    <div>
      <div className="ta-table-header ta-table-header--spread">
        <h2>Hanh vi khach hang</h2>
        <div className="ta-sort-group">
          {['7d', '30d', '90d', 'all'].map((option) => (
            <button
              key={option}
              type="button"
              className={`ta-btn ta-btn--sm ${range === option ? 'ta-btn--primary' : 'ta-btn--outline'}`}
              onClick={() => onRangeChange(option)}
            >
              {option === 'all' ? 'Tat ca' : option}
            </button>
          ))}
        </div>
      </div>

      <div className="ta-metrics-grid">
        <div className="ta-metric-card"><div className="ta-metric-body"><div className="ta-metric-label">Tong luot quan tam</div><div className="ta-metric-value">{interestClicks}</div></div></div>
        <div className="ta-metric-card"><div className="ta-metric-body"><div className="ta-metric-label">Nguoi quan tam duy nhat</div><div className="ta-metric-value">{uniqueInterested}</div></div></div>
        <div className="ta-metric-card"><div className="ta-metric-body"><div className="ta-metric-label">Them vao gio</div><div className="ta-metric-value">{addToCart}</div></div></div>
        <div className="ta-metric-card"><div className="ta-metric-body"><div className="ta-metric-label">Ty le thanh toan</div><div className="ta-metric-value">{percent(completed, interestClicks)}</div></div></div>
      </div>

      <div className="ta-chart-card ta-chart-card--spaced">
        <div className="ta-chart-header">
          <h3 className="ta-chart-title">Funnel chuyen doi</h3>
        </div>
        <Chart
          type="bar"
          height={280}
          options={{
            chart: { fontFamily: 'Be Vietnam Pro, sans-serif', toolbar: { show: false } },
            colors: ['#0ea5e9'],
            plotOptions: { bar: { borderRadius: 5, horizontal: true, barHeight: '54%' } },
            xaxis: { categories: funnelLabels },
            dataLabels: { enabled: true },
          }}
          series={[{ name: 'So luong', data: funnelValues }]}
        />
      </div>

      <div className="ta-table-wrap ta-table-wrap--spaced">
        <div className="ta-table-header">
          <h3 className="ta-table-title">Theo khoa hoc</h3>
        </div>
        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th>Khoa hoc</th>
                <th>Quan tam</th>
                <th>Duy nhat</th>
                <th>Them gio</th>
                <th>Thanh toan</th>
                <th>Quan tam -> gio</th>
                <th>Quan tam -> thanh toan</th>
                <th>Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.course_id}>
                  <td className="ta-text-bold">{course.course_name}</td>
                  <td>{numberValue(course.interest_clicks)}</td>
                  <td>{numberValue(course.unique_interested)}</td>
                  <td>{numberValue(course.add_to_cart_count)}</td>
                  <td>{numberValue(course.completed_orders)}</td>
                  <td>{percent(course.add_to_cart_count, course.interest_clicks)}</td>
                  <td>{percent(course.completed_orders, course.interest_clicks)}</td>
                  <td className="ta-text-bold">{formatPrice(course.revenue)}</td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr><td colSpan="8" className="ta-text-muted">Chua co du lieu trong khoang thoi gian nay.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire tab into dashboard**

In `web/src/pages/AdminDashboard.jsx`:

1. Import component:

```js
import AdminCustomerBehaviorTab from '../components/admin/AdminCustomerBehaviorTab';
```

2. Add tab:

```js
{ key: 'behavior', label: 'Hanh vi khach hang' },
```

3. Add state:

```js
const [behaviorRange, setBehaviorRange] = useState('30d');
const [behaviorAnalytics, setBehaviorAnalytics] = useState(null);
```

4. Add loader:

```js
const loadBehaviorAnalytics = async (range = behaviorRange) => {
  const res = await adminAPI.getFunnelAnalytics(range);
  setBehaviorAnalytics(res.data || null);
};
```

5. Include it in initial dashboard load with safe fallback:

```js
adminAPI.getFunnelAnalytics(behaviorRange).catch(() => ({ data: null }))
```

6. Render tab:

```jsx
{tab === 'behavior' && (
  <AdminCustomerBehaviorTab
    data={behaviorAnalytics}
    range={behaviorRange}
    onRangeChange={async (nextRange) => {
      setBehaviorRange(nextRange);
      await loadBehaviorAnalytics(nextRange);
    }}
  />
)}
```

- [ ] **Step 3: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: build succeeds and dashboard route compiles.

- [ ] **Step 4: Commit admin UI**

```powershell
git add web/src/components/admin/AdminCustomerBehaviorTab.jsx web/src/pages/AdminDashboard.jsx web/src/styles/dashboard.css
git commit -m "feat: add customer behavior dashboard"
```

---

### Task 9: Payment Completion Accuracy

**Files:**
- Modify: `backend/src/models/AnalyticsEvent.js`
- Modify: `backend/src/models/Order.js`
- Modify: `backend/src/routes/sepay.js`
- Modify: `backend/src/routes/admin.js`

- [ ] **Step 1: Add server-side payment event helper**

In `backend/src/models/AnalyticsEvent.js`, add:

```js
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
```

- [ ] **Step 2: Track completed/rejected in server flows**

After successful `Order.updateStatus(orderId, 'completed')` in SePay webhook, admin approve, and free-order completion, call:

```js
await AnalyticsEvent.trackOrderCourses('payment_completed', orderId, { source: 'server_order_status' });
```

After reject/cancel status updates, call the matching event:

```js
await AnalyticsEvent.trackOrderCourses('payment_failed', orderId, { source: 'server_order_status' });
```

Use `payment_cancelled` where the user explicitly cancels.

- [ ] **Step 3: Run syntax checks**

Run:

```powershell
node -c backend/src/models/AnalyticsEvent.js
node -c backend/src/routes/sepay.js
node -c backend/src/routes/admin.js
```

Expected: no syntax errors.

- [ ] **Step 4: Commit server payment events**

```powershell
git add backend/src/models/AnalyticsEvent.js backend/src/routes/sepay.js backend/src/routes/admin.js backend/src/models/Order.js
git commit -m "feat: track server-side payment outcomes"
```

---

### Task 10: Verification and Documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the feature**

Add a short section to `README.md`:

```md
### Customer behavior analytics

The platform records first-party analytics events after a visitor accepts analytics cookies:

- `course_click`: user clicks a course card, counted as customer interest.
- `add_to_cart`: user successfully adds a course to cart.
- `checkout_start`: user opens checkout with cart items.
- `payment_completed`, `payment_cancelled`, `payment_failed`: server/client payment outcome signals.

Admins can view customer behavior in the `Hanh vi khach hang` dashboard tab. The dashboard shows both total interest clicks and unique interested people, using `user_id` for logged-in users and `anonymous_id` for guests.
```

- [ ] **Step 2: Full backend checks**

Run:

```powershell
node -c backend/src/models/AnalyticsEvent.js
node -c backend/src/routes/analytics.js
node -c backend/src/routes/admin.js
node -c backend/src/routes/sepay.js
```

Expected: every command exits with code `0`.

- [ ] **Step 3: Full frontend checks**

Run:

```powershell
cd web
npm run lint
npm run build
```

Expected: no lint failures introduced by this feature and Vite build succeeds.

- [ ] **Step 4: Manual end-to-end check**

Run backend and frontend, then verify:

1. Cookie banner appears for a fresh browser profile.
2. Choosing `Chi can thiet` prevents analytics POSTs.
3. Choosing `Dong y phan tich` allows analytics POSTs.
4. Clicking a course card creates one `course_click` event.
5. Re-clicking the same course within 30 minutes does not duplicate that session event.
6. Adding to cart creates `add_to_cart`.
7. Opening checkout creates `checkout_start`.
8. Completing or approving an order affects completed payment count in admin behavior dashboard.
9. Admin range filters `7d`, `30d`, `90d`, and `all` return different query windows.

- [ ] **Step 5: Commit docs and final verification**

```powershell
git add README.md
git commit -m "docs: document customer analytics"
```

Run:

```powershell
git status --short
```

Expected: no uncommitted files from this feature.

---

## Self-Review

- Spec coverage: total interest clicks, unique interested people, add-to-cart, checkout, payment conversion, admin dashboard, date filters, and cookie consent are covered.
- Scope: this is one cohesive analytics feature; no separate external analytics or campaign attribution is included.
- Type consistency: event names are consistent across SQL, backend model, frontend helper, and dashboard aggregation.
- Residual risk: `checkout_start` step must use the exact cart state variable from `CheckoutPage.jsx` during implementation; the worker must inspect the page before editing.
