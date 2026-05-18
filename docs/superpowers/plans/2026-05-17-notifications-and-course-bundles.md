# Notifications and Course Bundles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-account abandoned cart notifications and basic course bundle commerce.

**Architecture:** Notifications are persisted per user and generated lazily when the user opens account/cart related APIs. Course bundles are modeled as public catalog entities with admin CRUD, a bundle-aware cart table, and order creation that records bundle-priced course items.

**Tech Stack:** Node.js, Express, MySQL, React 19, Vite, Axios.

---

## File Structure

- Create `backend/migrations/10-add-notifications.sql`: notification table.
- Create `backend/migrations/11-add-course-bundles.sql`: bundle, bundle item, and cart bundle tables.
- Modify `database/01-create-schema.sql`: include new tables for fresh installs.
- Create `backend/src/models/Notification.js`: notification CRUD and abandoned cart generation.
- Create `backend/src/models/CourseBundle.js`: bundle queries, admin CRUD, and cart bundle operations.
- Create `backend/src/routes/notifications.js`: authenticated notification APIs.
- Create `backend/src/routes/bundles.js`: public bundle APIs.
- Modify `backend/src/routes/cart.js`: check abandoned cart and support bundle add/remove.
- Modify `backend/src/routes/admin.js`: admin bundle APIs.
- Modify `backend/src/models/Order.js`: include bundle cart rows in checkout.
- Modify `backend/src/server.js`: mount new routes.
- Modify `web/src/api/index.js`: add notification and bundle clients.
- Modify `web/src/pages/AccountPage.jsx`: add Notifications tab.
- Modify `web/src/pages/CartPage.jsx`: render bundle rows.
- Create `web/src/pages/BundlesPage.jsx`: bundle catalog.
- Create `web/src/pages/BundleDetailPage.jsx`: bundle detail and add to cart.
- Modify `web/src/App.jsx`: bundle routes.
- Modify `web/src/pages/AdminDashboard.jsx`: bundle admin tab.
- Create `web/src/components/admin/AdminBundlesTab.jsx`: admin CRUD UI.
- Modify `web/src/styles/global.css` and `web/src/styles/dashboard.css`: styles.
- Update `README.md`: document features.

## Tasks

- [ ] Add tests for notification dedupe helper and bundle price helper.
- [ ] Implement notification schema, model, route, and server mount.
- [ ] Generate abandoned cart notifications from cart/account API calls.
- [ ] Add account notification tab and unread badge.
- [ ] Implement bundle schema, model, public routes, and admin routes.
- [ ] Make cart and order bundle-aware.
- [ ] Add public bundle list/detail pages.
- [ ] Add admin bundle management tab.
- [ ] Verify backend syntax, frontend lint, and production build.

## Self-Review

- Scope covers the approved lazy abandoned-cart approach and basic admin-created course bundles.
- Combo-specific discount codes, campaign scheduling, and bundle analytics are intentionally left for a later version.
- Bundle order records keep `order_items.course_id` so existing course access, teacher revenue, and certificate flow continue to work.
