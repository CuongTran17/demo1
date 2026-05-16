# Commerce Discovery Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add e-commerce style discovery features: wishlist, recently viewed courses, and related course recommendations.

**Architecture:** Wishlist is persisted in MySQL for logged-in users and exposed through authenticated REST endpoints. Recently viewed stays client-side in localStorage so guests benefit immediately without account friction. Related courses are served from the backend using course category, level, price proximity, popularity, and rating signals, then rendered on course detail pages alongside recently viewed and wishlist controls.

**Tech Stack:** Node.js, Express, MySQL, React 19, Vite, Axios.

---

## File Structure

- Create `backend/migrations/09-add-wishlist.sql`: wishlist table.
- Modify `database/01-create-schema.sql`: include wishlist for fresh installs.
- Create `backend/src/models/Wishlist.js`: wishlist CRUD and count.
- Create `backend/src/routes/wishlist.js`: authenticated wishlist endpoints.
- Modify `backend/src/server.js`: mount `/api/wishlist`.
- Modify `backend/src/models/Course.js`: add `getRelatedCourses(courseId, limit)`.
- Modify `backend/src/routes/courses.js`: add `/api/courses/:id/related`.
- Modify `web/src/api/index.js`: add `wishlistAPI` and `coursesAPI.getRelated`.
- Create `web/src/utils/recentlyViewed.js`: localStorage helper.
- Create `web/src/context/WishlistContext.jsx`: global wishlist state and toggles.
- Modify `web/src/main.jsx`: wrap app in `WishlistProvider`.
- Modify `web/src/components/CourseCard.jsx`: render wishlist button and preserve course click navigation.
- Modify `web/src/pages/CourseDetailPage.jsx`: save recently viewed, show wishlist CTA, related courses, recently viewed strip.
- Modify `web/src/pages/AccountPage.jsx`: add wishlist tab.
- Modify `web/src/styles/global.css`: public course card/detail styles.
- Modify `web/src/styles/dashboard.css`: account wishlist tab styles if needed.
- Update `README.md`: document the new customer discovery features.

---

### Task 1: Wishlist Database

**Files:**
- Create: `backend/migrations/09-add-wishlist.sql`
- Modify: `database/01-create-schema.sql`

- [ ] **Step 1: Create wishlist migration**

Create `backend/migrations/09-add-wishlist.sql`:

```sql
CREATE TABLE IF NOT EXISTS wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist_user_course (user_id, course_id),
    INDEX idx_wishlist_user_created (user_id, created_at),
    INDEX idx_wishlist_course (course_id),
    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);
```

- [ ] **Step 2: Add wishlist table to base schema**

In `database/01-create-schema.sql`, add the same `CREATE TABLE IF NOT EXISTS wishlist` block after the `cart` table. Keep the `course_id` collation consistent with the `courses.course_id` definition already used by reviews/certificates.

- [ ] **Step 3: Apply migration locally**

Run:

```powershell
cd backend
node scripts/apply-migrations-and-check.js
```

Expected: migration completes without SQL errors and the `wishlist` table exists.

- [ ] **Step 4: Commit database changes**

```powershell
git add backend/migrations/09-add-wishlist.sql database/01-create-schema.sql
git commit -m "feat: add wishlist table"
```

---

### Task 2: Wishlist Backend Model

**Files:**
- Create: `backend/src/models/Wishlist.js`

- [ ] **Step 1: Create wishlist model**

Create `backend/src/models/Wishlist.js`:

```js
const db = require('../config/database');

class Wishlist {
  static async getByUser(userId) {
    const [rows] = await db.execute(
      `SELECT c.*,
              w.wishlist_id,
              w.created_at AS wished_at,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
              COUNT(r.review_id) AS review_count
       FROM wishlist w
       JOIN courses c ON c.course_id = w.course_id
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE w.user_id = ?
       GROUP BY c.course_id, w.wishlist_id, w.created_at
       ORDER BY w.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getIdsByUser(userId) {
    const [rows] = await db.execute(
      'SELECT course_id FROM wishlist WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows.map((row) => row.course_id);
  }

  static async add(userId, courseId) {
    await db.execute(
      'INSERT IGNORE INTO wishlist (user_id, course_id) VALUES (?, ?)',
      [userId, courseId]
    );
  }

  static async remove(userId, courseId) {
    const [result] = await db.execute(
      'DELETE FROM wishlist WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    return result.affectedRows > 0;
  }

  static async count(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS count FROM wishlist WHERE user_id = ?',
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }
}

module.exports = Wishlist;
```

- [ ] **Step 2: Run syntax check**

Run:

```powershell
node -c backend/src/models/Wishlist.js
```

Expected: no output and exit code `0`.

- [ ] **Step 3: Commit model**

```powershell
git add backend/src/models/Wishlist.js
git commit -m "feat: add wishlist model"
```

---

### Task 3: Wishlist API

**Files:**
- Create: `backend/src/routes/wishlist.js`
- Modify: `backend/src/server.js`

- [ ] **Step 1: Create route**

Create `backend/src/routes/wishlist.js`:

```js
const express = require('express');
const Wishlist = require('../models/Wishlist');
const Course = require('../models/Course');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const courses = await Wishlist.getByUser(req.user.userId);
    res.json({ courses, count: courses.length });
  } catch (err) {
    console.error('Wishlist get error:', err);
    res.status(500).json({ error: 'Loi tai danh sach yeu thich' });
  }
});

router.get('/ids', async (req, res) => {
  try {
    const courseIds = await Wishlist.getIdsByUser(req.user.userId);
    res.json({ courseIds, count: courseIds.length });
  } catch (err) {
    res.status(500).json({ error: 'Loi tai danh sach yeu thich' });
  }
});

router.post('/:courseId', async (req, res) => {
  try {
    const course = await Course.getById(req.params.courseId);
    if (!course) return res.status(404).json({ error: 'Khoa hoc khong ton tai' });
    await Wishlist.add(req.user.userId, req.params.courseId);
    const count = await Wishlist.count(req.user.userId);
    res.json({ message: 'Da them vao yeu thich', courseId: req.params.courseId, count });
  } catch (err) {
    console.error('Wishlist add error:', err);
    res.status(500).json({ error: 'Loi them vao yeu thich' });
  }
});

router.delete('/:courseId', async (req, res) => {
  try {
    await Wishlist.remove(req.user.userId, req.params.courseId);
    const count = await Wishlist.count(req.user.userId);
    res.json({ message: 'Da xoa khoi yeu thich', courseId: req.params.courseId, count });
  } catch (err) {
    res.status(500).json({ error: 'Loi xoa khoi yeu thich' });
  }
});

module.exports = router;
```

- [ ] **Step 2: Mount route**

In `backend/src/server.js`, add:

```js
app.use('/api/wishlist', require('./routes/wishlist'));
```

Place it near `/api/cart` and `/api/orders`.

- [ ] **Step 3: Run syntax checks**

Run:

```powershell
node -c backend/src/routes/wishlist.js
node -c backend/src/server.js
```

Expected: no syntax errors.

- [ ] **Step 4: Commit wishlist API**

```powershell
git add backend/src/routes/wishlist.js backend/src/server.js
git commit -m "feat: add wishlist api"
```

---

### Task 4: Related Courses Backend

**Files:**
- Modify: `backend/src/models/Course.js`
- Modify: `backend/src/routes/courses.js`

- [ ] **Step 1: Add related course query**

In `backend/src/models/Course.js`, add this static method before `create`:

```js
  static async getRelatedCourses(courseId, limit = 6) {
    const current = await this.getById(courseId);
    if (!current) return [];

    const safeLimit = Math.max(1, Math.min(Number(limit) || 6, 12));
    const [rows] = await db.execute(
      `SELECT c.*,
              COALESCE(ROUND(AVG(r.rating), 1), 0) AS average_rating,
              COUNT(r.review_id) AS review_count,
              (
                CASE WHEN c.category = ? THEN 50 ELSE 0 END +
                CASE WHEN c.level = ? THEN 20 ELSE 0 END +
                CASE WHEN ABS(COALESCE(c.price, 0) - ?) <= 300000 THEN 10 ELSE 0 END +
                LEAST(COALESCE(c.students_count, 0), 1000) / 100
              ) AS related_score
       FROM courses c
       LEFT JOIN reviews r ON r.course_id = c.course_id
       WHERE c.course_id <> ?
       GROUP BY c.course_id
       ORDER BY related_score DESC, average_rating DESC, c.created_at DESC
       LIMIT ${safeLimit}`,
      [current.category, current.level, Number(current.price || 0), courseId]
    );

    return rows;
  }
```

- [ ] **Step 2: Add public route**

In `backend/src/routes/courses.js`, add this route before `router.get('/:id', ...)`:

```js
// GET /api/courses/:id/related
router.get('/:id/related', async (req, res) => {
  try {
    const limit = Number(req.query?.limit || 6);
    const courses = await Course.getRelatedCourses(req.params.id, limit);
    res.json({ courses });
  } catch (err) {
    console.error('Related courses error:', err);
    res.status(500).json({ error: 'Loi tai khoa hoc lien quan' });
  }
});
```

- [ ] **Step 3: Run syntax checks**

Run:

```powershell
node -c backend/src/models/Course.js
node -c backend/src/routes/courses.js
```

Expected: no syntax errors.

- [ ] **Step 4: Commit related backend**

```powershell
git add backend/src/models/Course.js backend/src/routes/courses.js
git commit -m "feat: add related courses endpoint"
```

---

### Task 5: Frontend API and Recently Viewed Utility

**Files:**
- Modify: `web/src/api/index.js`
- Create: `web/src/utils/recentlyViewed.js`

- [ ] **Step 1: Add frontend API methods**

In `web/src/api/index.js`, add to `coursesAPI`:

```js
getRelated: (id, limit = 6) => api.get(`/courses/${id}/related?limit=${limit}`),
```

Add a new API section:

```js
// ============ Wishlist API ============
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  getIds: () => api.get('/wishlist/ids'),
  add: (courseId) => api.post(`/wishlist/${courseId}`),
  remove: (courseId) => api.delete(`/wishlist/${courseId}`),
};
```

- [ ] **Step 2: Create recently viewed helper**

Create `web/src/utils/recentlyViewed.js`:

```js
const KEY = 'ptit_recently_viewed_courses';
const MAX_ITEMS = 8;

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getRecentlyViewed() {
  if (typeof window === 'undefined') return [];
  return safeParse(localStorage.getItem(KEY));
}

export function addRecentlyViewed(course) {
  if (typeof window === 'undefined' || !course?.course_id) return [];
  const compact = {
    course_id: course.course_id,
    course_name: course.course_name,
    category: course.category,
    level: course.level,
    price: course.price,
    old_price: course.old_price,
    thumbnail: course.thumbnail,
    average_rating: course.average_rating,
    review_count: course.review_count,
    viewed_at: new Date().toISOString(),
  };
  const next = [compact, ...getRecentlyViewed().filter((item) => item.course_id !== compact.course_id)].slice(0, MAX_ITEMS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearRecentlyViewed() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
```

- [ ] **Step 3: Run frontend lint**

Run:

```powershell
cd web
npm run lint
```

Expected: no lint errors from these files.

- [ ] **Step 4: Commit API and utility**

```powershell
git add web/src/api/index.js web/src/utils/recentlyViewed.js
git commit -m "feat: add discovery frontend utilities"
```

---

### Task 6: Wishlist Context

**Files:**
- Create: `web/src/context/WishlistContext.jsx`
- Modify: `web/src/main.jsx`

- [ ] **Step 1: Create context**

Create `web/src/context/WishlistContext.jsx`:

```jsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { wishlistAPI } from '../api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [courseIds, setCourseIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWishlistIds = async () => {
    if (!user) {
      setCourseIds([]);
      return;
    }
    setLoading(true);
    try {
      const res = await wishlistAPI.getIds();
      setCourseIds(res.data?.courseIds || []);
    } catch {
      setCourseIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlistIds();
  }, [user?.user_id]);

  const toggleWishlist = async (courseId) => {
    if (!user) {
      const err = new Error('LOGIN_REQUIRED');
      err.code = 'LOGIN_REQUIRED';
      throw err;
    }
    const normalized = String(courseId || '').trim();
    if (!normalized) return false;

    const exists = courseIds.includes(normalized);
    if (exists) {
      await wishlistAPI.remove(normalized);
      setCourseIds((prev) => prev.filter((id) => id !== normalized));
      return false;
    }

    await wishlistAPI.add(normalized);
    setCourseIds((prev) => (prev.includes(normalized) ? prev : [normalized, ...prev]));
    return true;
  };

  const value = useMemo(() => ({
    courseIds,
    count: courseIds.length,
    loading,
    isWishlisted: (courseId) => courseIds.includes(String(courseId || '').trim()),
    toggleWishlist,
    reloadWishlist: loadWishlistIds,
  }), [courseIds, loading, user]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
```

- [ ] **Step 2: Wrap app**

In `web/src/main.jsx`, import:

```js
import { WishlistProvider } from './context/WishlistContext.jsx';
```

Wrap `App` inside `WishlistProvider`, inside `AuthProvider`:

```jsx
<AuthProvider>
  <WishlistProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </WishlistProvider>
</AuthProvider>
```

Keep the existing `CartProvider` and `AuthProvider` order valid; `WishlistProvider` must be inside `AuthProvider`.

- [ ] **Step 3: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit wishlist context**

```powershell
git add web/src/context/WishlistContext.jsx web/src/main.jsx
git commit -m "feat: add wishlist state provider"
```

---

### Task 7: Course Card Wishlist Button

**Files:**
- Modify: `web/src/components/CourseCard.jsx`
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Add wishlist button to card**

In `web/src/components/CourseCard.jsx`, import:

```js
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
```

Change the existing `react-router-dom` import from:

```js
import { Link } from 'react-router-dom';
```

to:

```js
import { Link, useNavigate } from 'react-router-dom';
```

Inside `CourseCard`, add:

```js
const navigate = useNavigate();
const { isWishlisted, toggleWishlist } = useWishlist();
const wished = isWishlisted(course.course_id);

const handleWishlistClick = async (event) => {
  event.preventDefault();
  event.stopPropagation();
  try {
    await toggleWishlist(course.course_id);
  } catch (err) {
    if (err.code === 'LOGIN_REQUIRED') navigate('/login');
  }
};
```

Inside `.card-wrapper`, add before badges:

```jsx
<button
  type="button"
  className={`wishlist-chip ${wished ? 'wishlist-chip--active' : ''}`}
  onClick={handleWishlistClick}
  aria-label={wished ? 'Xoa khoi yeu thich' : 'Them vao yeu thich'}
>
  {wished ? '♥' : '♡'}
</button>
```

- [ ] **Step 2: Add card wishlist CSS**

Append to `web/src/styles/global.css`:

```css
.wishlist-chip {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: #475569;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
}

.wishlist-chip:hover,
.wishlist-chip--active {
  color: #e11d48;
  border-color: #fecdd3;
  background: #fff1f2;
}
```

- [ ] **Step 3: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: build succeeds, and course cards still navigate when the card body is clicked.

- [ ] **Step 4: Commit card UI**

```powershell
git add web/src/components/CourseCard.jsx web/src/styles/global.css
git commit -m "feat: add wishlist control to course cards"
```

---

### Task 8: Course Detail Discovery Sections

**Files:**
- Modify: `web/src/pages/CourseDetailPage.jsx`
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Load related courses and recently viewed**

In `web/src/pages/CourseDetailPage.jsx`, import:

```js
import CourseCard from '../components/CourseCard';
import { addRecentlyViewed, getRecentlyViewed } from '../utils/recentlyViewed';
import { useWishlist } from '../context/WishlistContext';
```

Add state:

```js
const [relatedCourses, setRelatedCourses] = useState([]);
const [recentCourses, setRecentCourses] = useState([]);
```

Inside component:

```js
const { isWishlisted, toggleWishlist } = useWishlist();
```

After successfully loading course in `loadCourse`, add:

```js
const loadedCourse = courseRes.data.course || courseRes.data;
setCourse(loadedCourse);
setRecentCourses(addRecentlyViewed(loadedCourse).filter((item) => item.course_id !== id));
```

Replace any existing `setCourse(courseRes.data.course || courseRes.data);` with that block.

Add a related courses effect:

```jsx
useEffect(() => {
  let alive = true;
  coursesAPI.getRelated(id, 6)
    .then((res) => {
      if (alive) setRelatedCourses(res.data?.courses || []);
    })
    .catch(() => {
      if (alive) setRelatedCourses([]);
    });
  setRecentCourses(getRecentlyViewed().filter((item) => item.course_id !== id));
  return () => { alive = false; };
}, [id]);
```

- [ ] **Step 2: Add detail wishlist button**

Near the add-to-cart actions, add:

```jsx
<button
  type="button"
  className="btn btn-outline btn-lg"
  style={{ width: '100%' }}
  onClick={async () => {
    try {
      await toggleWishlist(id);
    } catch (err) {
      if (err.code === 'LOGIN_REQUIRED') navigate('/login');
    }
  }}
>
  {isWishlisted(id) ? 'Da luu yeu thich' : 'Luu vao yeu thich'}
</button>
```

Place it below “Mua ngay” so the purchase CTA remains primary.

- [ ] **Step 3: Render related and recent sections**

Before the reviews section, add:

```jsx
{relatedCourses.length > 0 && (
  <section className="section course-discovery-section">
    <div className="container">
      <div className="course-discovery-header">
        <h2 className="section-title">Khoa hoc lien quan</h2>
      </div>
      <div className="course-discovery-grid">
        {relatedCourses.map((item) => <CourseCard key={item.course_id} course={item} />)}
      </div>
    </div>
  </section>
)}

{recentCourses.length > 0 && (
  <section className="section course-discovery-section">
    <div className="container">
      <div className="course-discovery-header">
        <h2 className="section-title">Da xem gan day</h2>
      </div>
      <div className="course-discovery-grid">
        {recentCourses.slice(0, 4).map((item) => <CourseCard key={item.course_id} course={item} />)}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 4: Add discovery section CSS**

Append to `web/src/styles/global.css`:

```css
.course-discovery-section {
  background: #ffffff;
}

.course-discovery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.course-discovery-header .section-title {
  margin-bottom: 0;
  text-align: left;
}

.course-discovery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 980px) {
  .course-discovery-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .course-discovery-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: build succeeds and course detail has related/recent sections without layout overlap.

- [ ] **Step 6: Commit detail discovery**

```powershell
git add web/src/pages/CourseDetailPage.jsx web/src/styles/global.css
git commit -m "feat: add course detail discovery sections"
```

---

### Task 9: Account Wishlist Tab

**Files:**
- Modify: `web/src/pages/AccountPage.jsx`

- [ ] **Step 1: Load wishlist courses**

In `web/src/pages/AccountPage.jsx`, add `wishlistAPI` to imports:

```js
import { authAPI, ordersAPI, coursesAPI, certificatesAPI, wishlistAPI } from '../api';
```

Add state:

```js
const [wishlistCourses, setWishlistCourses] = useState([]);
```

Add menu item:

```js
{ key: 'wishlist', label: 'Yeu thich' },
```

In `loadData`, add:

```js
wishlistAPI.get().catch(() => ({ data: { courses: [] } })),
```

Then set:

```js
setWishlistCourses(wishlistRes.data?.courses || []);
```

Use the actual result variable name from the `Promise.all` destructuring.

- [ ] **Step 2: Render wishlist tab**

Add this block in the account main render:

```jsx
{activeTab === 'wishlist' && (
  <div>
    <h2 className="account-ds-title">Khoa hoc yeu thich</h2>
    {wishlistCourses.length === 0 ? (
      <div className="ta-empty-state">
        <div className="ta-empty-icon">♡</div>
        <h3>Chua co khoa hoc yeu thich</h3>
        <p>Luu cac khoa hoc ban quan tam de quay lai mua sau.</p>
        <Link to="/search" className="ta-btn ta-btn--primary">Kham pha khoa hoc</Link>
      </div>
    ) : (
      <div className="ta-table-wrap">
        <table className="ta-table">
          <thead>
            <tr>
              <th>Khoa hoc</th>
              <th>Danh muc</th>
              <th>Gia</th>
              <th style={{ textAlign: 'center' }}>Hanh dong</th>
            </tr>
          </thead>
          <tbody>
            {wishlistCourses.map((course) => (
              <tr key={course.course_id}>
                <td><strong>{course.course_name}</strong></td>
                <td><span className="ta-badge ta-badge--info">{course.category}</span></td>
                <td><strong>{formatPrice(course.price)}</strong></td>
                <td style={{ textAlign: 'center' }}>
                  <Link to={`/course/${course.course_id}`} className="ta-btn ta-btn--primary ta-btn--sm">
                    Xem chi tiet
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Build check**

Run:

```powershell
cd web
npm run build
```

Expected: build succeeds and account page has a wishlist tab.

- [ ] **Step 4: Commit account tab**

```powershell
git add web/src/pages/AccountPage.jsx
git commit -m "feat: show wishlist in account"
```

---

### Task 10: Documentation and Manual Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document discovery features**

Add to `README.md`:

```md
### Commerce discovery features

The storefront supports:

- Wishlist for logged-in users through `/api/wishlist`.
- Recently viewed courses stored in browser localStorage under `ptit_recently_viewed_courses`.
- Related courses from `/api/courses/:id/related`, ranked by category, level, price proximity, popularity, and rating.

These features make the course storefront behave more like an e-commerce catalog and help users return to courses they are considering.
```

- [ ] **Step 2: Backend verification**

Run:

```powershell
node -c backend/src/models/Wishlist.js
node -c backend/src/routes/wishlist.js
node -c backend/src/models/Course.js
node -c backend/src/routes/courses.js
node -c backend/src/server.js
```

Expected: all commands exit successfully.

- [ ] **Step 3: Frontend verification**

Run:

```powershell
cd web
npm run lint
npm run build
```

Expected: lint and build pass.

- [ ] **Step 4: Manual browser verification**

Start the app and verify:

1. Guest can open course detail and sees “Da xem gan day” after visiting more than one course.
2. Guest clicking wishlist is sent to login.
3. Logged-in user can add/remove wishlist from course card.
4. Logged-in user can add/remove wishlist from course detail.
5. Account page shows wishlist tab and saved courses.
6. Related courses appear on course detail and exclude the current course.
7. Recently viewed excludes the current course and shows newest first.
8. Course cards still navigate correctly when clicking outside the wishlist button.

- [ ] **Step 5: Commit docs**

```powershell
git add README.md
git commit -m "docs: document commerce discovery features"
```

Run:

```powershell
git status --short
```

Expected: no uncommitted files from this feature.

---

## Self-Review

- Spec coverage: wishlist, recently viewed, and related courses are each covered by backend/frontend tasks and verification.
- Scope: this plan does not include abandoned cart, bundles, notifications, or recommendation ML; those are separate future features.
- Type consistency: `course_id`, `wishlist`, `wishlistAPI`, `getRelated`, and localStorage key names are consistent across tasks.
- Residual implementation note: `AccountPage.jsx` has a large existing `Promise.all`; the worker must update destructuring carefully so existing orders/courses/certificates loading stays intact.
