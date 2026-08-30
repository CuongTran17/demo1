# Frontend Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize Search, Course Detail, and Learning Player with a shared product UI vocabulary while preserving existing behavior.

**Architecture:** Add a small shared product-token layer to the existing CSS instead of introducing a component library. Apply those tokens to the three target surfaces through scoped CSS and minimal JSX class cleanup, keeping routes, API calls, and state logic unchanged.

**Tech Stack:** React 19, React Router 7, Vite 7, CSS modules-by-convention via existing `global.css` and `dashboard.css`, npm build verification.

---

## File Structure

- Modify `web/src/styles/global.css`: add shared storefront product tokens and polished styles for cards, search, course detail, and learning player.
- Modify `web/src/pages/SearchPage.jsx`: replace pagination and filter inline styles with class names.
- Modify `web/src/components/CourseCard.jsx`: remove inline discount badge color and emoji-like wishlist glyphs, add class hooks for polished states.
- Modify `web/src/pages/CourseDetailPage.jsx`: replace CTA inline width styles and review heading inline styles with class names.
- Modify `web/src/pages/LearningPage.jsx`: replace emoji-heavy lesson status/action labels with text/icon-neutral labels and add class hooks for unavailable video state.
- Test by running `npm.cmd run build` in `web`.
- Inspect with `node .agents/skills/impeccable/scripts/detect.mjs --json ...` for the touched files.

---

### Task 1: Shared Product Tokens

**Files:**
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Add shared product token aliases near `:root`**

Add these variables after the existing `--gradient` declaration:

```css
  --product-bg: #f6f8fb;
  --product-surface: #ffffff;
  --product-surface-muted: #f8fafc;
  --product-text: #0f172a;
  --product-text-soft: #334155;
  --product-muted: #64748b;
  --product-subtle: #94a3b8;
  --product-border: #e2e8f0;
  --product-border-soft: #eef2f7;
  --product-primary: #2563eb;
  --product-primary-hover: #1d4ed8;
  --product-primary-soft: #eff6ff;
  --product-primary-border: #bfdbfe;
  --product-success: #16a34a;
  --product-success-soft: #f0fdf4;
  --product-warning: #d97706;
  --product-warning-soft: #fffbeb;
  --product-danger: #dc2626;
  --product-danger-soft: #fef2f2;
  --product-radius-sm: 6px;
  --product-radius-md: 8px;
  --product-radius-lg: 12px;
  --product-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --product-shadow-md: 0 10px 28px rgba(15, 23, 42, 0.08);
```

- [ ] **Step 2: Update core storefront button styles**

Change `.btn-primary` and `.btn-gradient` so the polished surfaces use solid primary actions:

```css
.btn-primary,
.btn-gradient {
  background: var(--product-primary);
  color: #fff;
  border-color: var(--product-primary);
}

.btn-primary:hover,
.btn-gradient:hover {
  background: var(--product-primary-hover);
  border-color: var(--product-primary-hover);
  opacity: 1;
  transform: translateY(-1px);
}
```

- [ ] **Step 3: Add reduced-motion fallback**

Append near the end of `global.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Build check**

Run: `npm.cmd run build`

Expected: Vite build completes successfully.

---

### Task 2: CourseCard and Search Polish

**Files:**
- Modify: `web/src/components/CourseCard.jsx`
- Modify: `web/src/pages/SearchPage.jsx`
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Update discount badge markup**

In `CourseCard.jsx`, replace the inline discount badge:

```jsx
<span className="card-badge card-badge--discount">
  -{course.discount_percentage}%
</span>
```

- [ ] **Step 2: Update wishlist glyphs**

In `CourseCard.jsx`, keep the button behavior but replace the visible text with stable symbols:

```jsx
<span aria-hidden="true">{wished ? '♥' : '♡'}</span>
```

- [ ] **Step 3: Replace search pagination inline styles**

In `SearchPage.jsx`, change the pagination wrapper to:

```jsx
<div className="pagination search-pagination">
```

Change ellipsis to:

```jsx
<span key={`ellipsis-${index}`} className="search-pagination-ellipsis">...</span>
```

Change page buttons to:

```jsx
className={`btn search-page-btn ${currentPage === page ? 'btn-primary' : 'btn-outline'}`}
```

- [ ] **Step 4: Add polished card/search CSS**

Append to `global.css` before dark-mode overrides:

```css
.card {
  border-color: var(--product-border);
  border-radius: var(--product-radius-lg);
  box-shadow: var(--product-shadow-sm);
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: var(--product-shadow-md);
  border-color: var(--product-primary-border);
}

.card-title {
  color: var(--product-text);
}

.card-text,
.card-meta {
  color: var(--product-muted);
}

.card-badge {
  background: var(--product-primary);
}

.card-badge--discount {
  background: var(--product-danger);
}

.wishlist-chip {
  border-color: var(--product-border);
  color: var(--product-muted);
  box-shadow: var(--product-shadow-sm);
}

.wishlist-chip--active,
.wishlist-chip:hover {
  color: var(--product-danger);
  border-color: #fecdd3;
  background: var(--product-danger-soft);
}

.search-page-shell {
  padding-block: 32px 48px;
}

.search-sidebar,
.search-results {
  border-color: var(--product-border);
}

.search-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 32px;
  flex-wrap: wrap;
}

.search-pagination-ellipsis {
  padding: 0 4px;
  color: var(--product-subtle);
}

.search-page-btn {
  min-width: 36px;
}
```

- [ ] **Step 5: Build check**

Run: `npm.cmd run build`

Expected: Vite build completes successfully.

---

### Task 3: Course Detail Polish

**Files:**
- Modify: `web/src/pages/CourseDetailPage.jsx`
- Modify: `web/src/styles/global.css`

- [ ] **Step 1: Replace CTA inline width styles**

In `CourseDetailPage.jsx`, change purchase/action buttons inside `.course-sidebar-actions` to include `course-sidebar-btn` and remove `style={{ width: '100%' }}`:

```jsx
<button className="btn btn-gradient btn-lg course-sidebar-btn" onClick={handleAddToCart}>
```

```jsx
<button className="btn btn-outline btn-lg course-sidebar-btn" onClick={() => { handleAddToCart().then(() => navigate('/cart')); }}>
```

```jsx
<button type="button" className="btn btn-outline btn-lg course-sidebar-btn" onClick={handleToggleWishlist}>
```

For purchased state:

```jsx
<button className="btn btn-gradient btn-lg course-sidebar-btn" onClick={() => navigate(`/learning/${id}`)}>
```

- [ ] **Step 2: Replace reviews heading inline style**

Change:

```jsx
<h2 className="section-title course-reviews-title">
```

- [ ] **Step 3: Add course detail CSS**

Append to `global.css`:

```css
.course-sidebar {
  border-color: var(--product-border);
  border-radius: var(--product-radius-lg);
  box-shadow: var(--product-shadow-md);
}

.course-sidebar-body {
  color: var(--product-text);
}

.course-sidebar-btn {
  width: 100%;
}

.course-price-big {
  color: var(--product-text);
}

.course-saving-text {
  color: var(--product-success);
}

.course-sidebar-note-list {
  color: var(--product-text-soft);
}

.detail-highlight-card {
  border-color: var(--product-border);
  background: var(--product-surface);
  box-shadow: var(--product-shadow-sm);
}

.detail-check {
  background: var(--product-success-soft);
  color: var(--product-success);
}

.course-reviews-title {
  text-align: left;
  margin-bottom: 28px;
}

.review-bar-fill {
  background: var(--product-warning);
}
```

- [ ] **Step 4: Build check**

Run: `npm.cmd run build`

Expected: Vite build completes successfully.

---

### Task 4: Learning Player Polish

**Files:**
- Modify: `web/src/pages/LearningPage.jsx`
- Modify: `web/src/styles/global.css`
- Modify: `web/src/styles/dashboard.css`

- [ ] **Step 1: Replace header action text**

In `LearningPage.jsx`, replace:

```jsx
<button className="btn-share" onClick={copyLink}>Chia sẻ</button>
<Link to="/account" className="btn-back-learn">Quay lại</Link>
```

- [ ] **Step 2: Replace lesson icon expressions with text-safe state labels**

Inside `.lesson-icon`, use:

```jsx
{locked ? 'Khóa' : isCompleted ? 'Xong' : isActive ? (isLesson ? 'Phát' : 'Quiz') : (isLesson ? 'Bài' : 'Quiz')}
```

- [ ] **Step 3: Replace current lesson action labels**

Use:

```jsx
<button className="btn-copy" onClick={copyLink}>Sao chép đường dẫn</button>
```

For status chips:

```jsx
if (done) return <span className="learning-status-chip learning-status-chip--done">Đã hoàn thành</span>;
if (watched > 0) return <span className="learning-status-chip">Đã xem {watched}%</span>;
```

- [ ] **Step 4: Add unavailable video class hook**

Replace the inline unavailable video wrapper with:

```jsx
<div className="video-empty-state">
  <span className="video-empty-state__icon" aria-hidden="true">Video</span>
  <p>Bài học này chưa có video</p>
</div>
```

- [ ] **Step 5: Adjust sidebar motion in CSS**

In `dashboard.css`, change `.learning-sidebar` transition from margin-based emphasis to transform-first:

```css
.learning-sidebar {
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.learning-sidebar.collapsed {
  margin-left: -330px;
}
```

Keep `margin-left` behavior for layout compatibility in this pass, but remove it from the transition list.

- [ ] **Step 6: Add learning polish CSS**

Append to `global.css`:

```css
.learning-sidebar .lesson-icon {
  min-width: 34px;
  padding-inline: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}

.video-empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  color: var(--product-subtle);
  background: #020617;
}

.video-empty-state__icon {
  padding: 8px 12px;
  border-radius: var(--product-radius-md);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

- [ ] **Step 7: Build check**

Run: `npm.cmd run build`

Expected: Vite build completes successfully.

---

### Task 5: Final Verification

**Files:**
- Inspect: `web/src/styles/global.css`
- Inspect: `web/src/styles/dashboard.css`
- Inspect: `web/src/pages/SearchPage.jsx`
- Inspect: `web/src/components/CourseCard.jsx`
- Inspect: `web/src/pages/CourseDetailPage.jsx`
- Inspect: `web/src/pages/LearningPage.jsx`

- [ ] **Step 1: Run production build**

Run from `web`: `npm.cmd run build`

Expected: Vite build completes successfully.

- [ ] **Step 2: Run design detector on touched files**

Run from project root:

```powershell
node .agents\skills\impeccable\scripts\detect.mjs --json web\src\styles\global.css web\src\styles\dashboard.css web\src\pages\SearchPage.jsx web\src\components\CourseCard.jsx web\src\pages\CourseDetailPage.jsx web\src\pages\LearningPage.jsx
```

Expected: Existing warnings may remain in untouched parts of `global.css`, but no new warning should be introduced by the changed sections.

- [ ] **Step 3: Review git diff**

Run: `git diff -- web/src/styles/global.css web/src/styles/dashboard.css web/src/pages/SearchPage.jsx web/src/components/CourseCard.jsx web/src/pages/CourseDetailPage.jsx web/src/pages/LearningPage.jsx`

Expected: Diff only contains frontend polish changes described in this plan.

- [ ] **Step 4: Summarize residual risks**

Document in the final response whether build passed, whether detector still reports old warnings, and which surface should be visually reviewed next.

---

## Self-Review

- Spec coverage: token unification, Search/CourseCard, Course Detail, Learning Player, motion, and build verification all have tasks.
- Placeholder scan: no TBD/TODO placeholders are present.
- Scope check: admin/teacher dashboards and backend are intentionally excluded from implementation tasks.
