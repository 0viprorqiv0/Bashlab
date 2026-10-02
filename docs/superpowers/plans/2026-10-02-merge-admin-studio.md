# Merge Admin Studio Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cleanly merge and integrate `origin/feature/admin-studio` (Content Studio with VSCode layout, auto-save, confirmation modals, redesigned UsersManager) into `feature/full-feature-revision` while preserving the subscription pages, Prometheus live metrics dashboard, and 100vh ChatGPT lab workspace.

**Architecture:** 
- Checkout new Admin Studio components and stylesheets from `5d8f4e3`.
- Integrate the VSCode top titlebar in `AdminGate.jsx` with center/right portal mount points.
- Wire `ContentStudio.jsx` into `ContentManager.jsx` and `/admin/studio/page.js`.
- Integrate `UsersManager.jsx` with `UsersManager.module.css`.
- Add `deleteChapter` and `deleteLesson` to `writeApi.js`.
- Wire `SiteChrome.jsx` to lock full-height on admin paths while retaining Service Worker cache purge.
- Retain existing subscription pages (`subscription/page.js`, `subscription.module.css`), Activity dashboard, and ChatGPT lab workspace.

**Tech Stack:** Next.js 14, React 18, CSS Modules, Express backend, Playwright E2E.

**Spec:** Branch `origin/feature/admin-studio` (Commit `5d8f4e3d074ef96658ee20db5fe9a3f5b8528f41`).

## Global Constraints
- Do NOT delete or damage `frontend/app/(site)/subscription/page.js` or `subscription.module.css`.
- Do NOT break or revert the Prometheus live activity charts (`LineChart.jsx`, `Dashboard.jsx`).
- Do NOT break or revert the ChatGPT lab workspace (`LabWorkspace.jsx`).
- Ensure `npm --prefix frontend run lint` and `npm --prefix backend test` pass with 0 errors.
- Capture real browser screenshots of `/admin/content`, `/admin/users`, `/admin/activity`, `/subscription`, and `/labs/...` to verify visual correctness.

---

### Task 1: Check out new Admin Studio files and delete API functions
**Files:**
- Create: `frontend/app/(site)/admin/studio/page.js`
- Create: `frontend/components/admin/ContentStudio.jsx`
- Create: `frontend/components/admin/ContentStudio.module.css`
- Create: `frontend/components/admin/UsersManager.module.css`
- Modify: `frontend/lib/writeApi.js`

- [ ] **Step 1: Checkout the new files from `5d8f4e3`**
- [ ] **Step 2: Add `deleteChapter` and `deleteLesson` to `writeApi.js`**
- [ ] **Step 3: Verify files exist and compile**

### Task 2: Update Layout, Chrome, and Global Styles
**Files:**
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/layout/SiteChrome.module.css`
- Modify: `frontend/components/layout/SiteChrome.jsx`
- Modify: `frontend/components/layout/Navbar.jsx`

- [ ] **Step 1: Add `.admin-locked` to `globals.css`**
- [ ] **Step 2: Add `.adminChromeContainer` and `.adminMain` to `SiteChrome.module.css`**
- [ ] **Step 3: Update `SiteChrome.jsx` with `isAdmin` lock while preserving SW purge and workspace rules**
- [ ] **Step 4: Update `Navbar.jsx` admin link in dropdown**

### Task 3: Update Admin Shell & Components
**Files:**
- Modify: `frontend/components/admin/Admin.module.css`
- Modify: `frontend/components/admin/AdminGate.jsx`
- Modify: `frontend/components/admin/ContentManager.jsx`
- Modify: `frontend/components/admin/ContentManager.module.css`
- Modify: `frontend/components/admin/UsersManager.jsx`

- [ ] **Step 1: Update `Admin.module.css` with VSCode title bar, tabs, and shell styles**
- [ ] **Step 2: Update `AdminGate.jsx` with VSCode title bar and portal targets**
- [ ] **Step 3: Update `ContentManager.jsx` and `ContentManager.module.css` to embed `ContentStudio`**
- [ ] **Step 4: Checkout and verify `UsersManager.jsx` from `5d8f4e3`**

### Task 4: Automated Verification (Lint, Backend Tests, E2E)
- [ ] **Step 1: Run frontend linter `npm --prefix frontend run lint`**
- [ ] **Step 2: Run backend tests `npm --prefix backend test`**
- [ ] **Step 3: Run Playwright E2E tests for admin and workspace**

### Task 5: Real Browser Verification & Screenshots
- [ ] **Step 1: Screenshot `/admin/content` (Content Studio)**
- [ ] **Step 2: Screenshot `/admin/users` (Users Manager)**
- [ ] **Step 3: Screenshot `/admin/activity` (Live Dashboard)**
- [ ] **Step 4: Screenshot `/subscription` (Subscription Page intact)**
- [ ] **Step 5: Screenshot `/labs/shell-101/01-navigating-directories` (Workspace intact)**

### Task 6: Commit, Log & Push
- [ ] **Step 1: Document in `WORK_LOG.md`**
- [ ] **Step 2: Git commit and push**
