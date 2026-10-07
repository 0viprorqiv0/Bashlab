const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { createTestUser, deleteTestUserSafe } = require('../tests/e2e/support/supabaseAdmin');

const artifactsDir = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541';

async function runInteractiveAudit() {
  console.log('====================================================');
  console.log('   STARTING COMPREHENSIVE INTERACTIVE UI AUDIT      ');
  console.log('====================================================');

  console.log('1. Provisioning test administrator...');
  const admin = await createTestUser({ role: 'admin', prefix: 'fullaudit' });
  console.log(`Admin provisioned: ${admin.email}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const auditReport = {
    pagesChecked: 0,
    interactionsTested: 0,
    screenshotsCaptured: [],
    headerHeightAudit: [],
    zeroScrollAudit: [],
    typographyAudit: [],
    consoleErrors: [],
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore known favicon / benign network noise
      if (!txt.includes('favicon') && !txt.includes('net::ERR_')) {
        auditReport.consoleErrors.push(txt);
      }
    }
  });

  async function snap(filename, label) {
    const filePath = path.join(artifactsDir, filename);
    await page.waitForTimeout(300);
    await page.screenshot({ path: filePath });
    auditReport.screenshotsCaptured.push({ filename, label });
    console.log(`  📸 Captured: ${filename} [${label}]`);
  }

  async function checkHeaderMetrics(pageName) {
    const metrics = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return null;
      const rect = header.getBoundingClientRect();
      const style = window.getComputedStyle(header);
      return {
        height: Math.round(rect.height),
        backgroundColor: style.backgroundColor,
        borderBottom: style.borderBottom,
        display: style.display,
      };
    });
    if (metrics) {
      auditReport.headerHeightAudit.push({ page: pageName, ...metrics });
    }
  }

  async function checkZeroScroll(pageName) {
    const scrollInfo = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      const hasWindowVertical = doc.scrollHeight > window.innerHeight;
      const hasWindowHorizontal = doc.scrollWidth > window.innerWidth;
      return {
        hasWindowVertical,
        hasWindowHorizontal,
        scrollHeight: doc.scrollHeight,
        innerHeight: window.innerHeight,
        scrollWidth: doc.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    auditReport.zeroScrollAudit.push({ page: pageName, ...scrollInfo });
  }

  try {
    // ----------------------------------------------------
    // AUTHENTICATION
    // ----------------------------------------------------
    console.log('\n2. Logging in...');
    await page.goto('http://localhost:3000/login');
    const main = page.locator('main');
    await main.getByLabel('Email address').fill(admin.email);
    await main.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    console.log('Login successful.');

    // ----------------------------------------------------
    // 1. LANDING PAGE (/)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Landing Page (/) ---');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Landing');
    await checkZeroScroll('Landing');
    await snap('audit-01-landing-home.png', 'Landing page hero view');

    // Click User Profile Capsule on landing page
    const landingUserBtn = page.getByRole('button', { name: 'User menu' });
    if (await landingUserBtn.isVisible()) {
      await landingUserBtn.click();
      await snap('audit-02-landing-user-dropdown.png', 'Landing user dropdown menu open');
      auditReport.interactionsTested++;
      // Close dropdown
      await page.keyboard.press('Escape');
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 2. COURSES CATALOG (/courses)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Courses Catalog (/courses) ---');
    await page.goto('http://localhost:3000/courses', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Courses');
    await checkZeroScroll('Courses');
    await snap('audit-03-courses-all.png', 'Course catalog All filter active');

    // Click filter: "Core Tracks"
    const coreTracksBtn = page.getByRole('button', { name: 'Core Tracks' });
    if (await coreTracksBtn.isVisible()) {
      await coreTracksBtn.click();
      await snap('audit-04-courses-coretracks.png', 'Course catalog Core Tracks filter active');
      auditReport.interactionsTested++;
    }

    // Click filter: "Security"
    const securityBtn = page.getByRole('button', { name: 'Security' });
    if (await securityBtn.isVisible()) {
      await securityBtn.click();
      await snap('audit-05-courses-security.png', 'Course catalog Security filter active');
      auditReport.interactionsTested++;
    }

    // Click filter: "All" to restore
    const allFilterBtn = page.getByRole('button', { name: 'All' });
    if (await allFilterBtn.isVisible()) {
      await allFilterBtn.click();
    }

    // Open User Dropdown on Courses
    const coursesUserBtn = page.getByRole('button', { name: 'User menu' });
    if (await coursesUserBtn.isVisible()) {
      await coursesUserBtn.click();
      await snap('audit-06-courses-user-menu.png', 'Courses user profile dropdown open');
      auditReport.interactionsTested++;
      await page.keyboard.press('Escape');
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 3. MY LEARNING (/my-learning)
    // ----------------------------------------------------
    console.log('\n--- Auditing: My Learning (/my-learning) ---');
    await page.goto('http://localhost:3000/my-learning', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('My Learning');
    await checkZeroScroll('My Learning');
    await snap('audit-07-mylearning-overview.png', 'My Learning streak and courses overview');

    // Interact with Heatmap Range Selector
    const rangeSelect = page.locator('select');
    if (await rangeSelect.isVisible()) {
      await rangeSelect.selectOption('90');
      await snap('audit-08-mylearning-heatmap-range.png', 'My Learning heatmap range 90 days');
      auditReport.interactionsTested++;
      await rangeSelect.selectOption('365');
    }

    // Open User Dropdown on My Learning
    const learningUserBtn = page.getByRole('button', { name: 'User menu' });
    if (await learningUserBtn.isVisible()) {
      await learningUserBtn.click();
      await snap('audit-09-mylearning-user-menu.png', 'My Learning user profile dropdown open');
      auditReport.interactionsTested++;
      await page.keyboard.press('Escape');
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 4. ACCOUNT & SECURITY (/account)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Account & Security (/account) ---');
    await page.goto('http://localhost:3000/account', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Account');
    await checkZeroScroll('Account');
    await snap('audit-10-account-personal-profile.png', 'Account Personal profile tab active');

    // Click "Edit profile" button -> opens modal/editor
    const editProfileBtn = page.locator('#edit-profile-btn');
    if (await editProfileBtn.isVisible()) {
      await editProfileBtn.click();
      await snap('audit-11-account-edit-profile-modal.png', 'Account Edit Profile form expanded');
      auditReport.interactionsTested++;
      // Cancel edit modal
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible()) await cancelBtn.click();
    }

    // Click "Security & access" tab
    const securityTabBtn = page.getByRole('button', { name: 'Security & access' });
    if (await securityTabBtn.isVisible()) {
      await securityTabBtn.click();
      await snap('audit-12-account-security-tab.png', 'Account Security & access tab active');
      auditReport.interactionsTested++;
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 5. SUBSCRIPTION & PRICING (/subscription)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Subscription & Pricing (/subscription) ---');
    await page.goto('http://localhost:3000/subscription', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Subscription');
    await checkZeroScroll('Subscription');
    await snap('audit-13-subscription-annually.png', 'Subscription Billed Annually active');

    // Switch to Monthly
    const monthlyBtn = page.getByRole('button', { name: 'Billed Monthly' });
    if (await monthlyBtn.isVisible()) {
      await monthlyBtn.click();
      await snap('audit-14-subscription-monthly.png', 'Subscription Billed Monthly active');
      auditReport.interactionsTested++;
    }

    // Toggle FAQ item
    const faqItem = page.locator('[class*="faqQuestion"]').first();
    if (await faqItem.isVisible()) {
      await faqItem.click();
      await snap('audit-15-subscription-faq-open.png', 'Subscription FAQ accordion item toggled');
      auditReport.interactionsTested++;
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 6. ADMIN CONTENT STUDIO (/admin/content)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Admin Content Studio (/admin/content) ---');
    await page.goto('http://localhost:3000/admin/content', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Admin Content');
    await checkZeroScroll('Admin Content');
    await snap('audit-16-admin-content-tab-content.png', 'Admin Content Studio with Content tab active');

    // Click "Objectives" tab
    const objectivesTab = page.getByRole('tab', { name: /Objectives/i });
    if (await objectivesTab.isVisible()) {
      await objectivesTab.click();
      await snap('audit-17-admin-content-tab-objectives.png', 'Admin Content Studio Objectives tab active');
      auditReport.interactionsTested++;
    }

    // Click "Hints" tab
    const hintsTab = page.getByRole('tab', { name: /Hints/i });
    if (await hintsTab.isVisible()) {
      await hintsTab.click();
      await snap('audit-18-admin-content-tab-hints.png', 'Admin Content Studio Hints tab active');
      auditReport.interactionsTested++;
    }

    // Return to "Content" tab
    const contentTab = page.getByRole('tab', { name: /Content/i });
    if (await contentTab.isVisible()) {
      await contentTab.click();
    }

    // Toggle Chapter Accordion in Explorer Sidebar
    const chapterItem = page.locator('button[class*="chapterHeader"]').first();
    if (await chapterItem.isVisible()) {
      await chapterItem.click();
      await snap('audit-19-admin-content-explorer-toggle.png', 'Admin Content Studio chapter collapsed in Explorer');
      auditReport.interactionsTested++;
      await chapterItem.click(); // re-expand
    }

    // Toggle Activity Rail buttons (Outline / Search)
    const searchRailBtn = page.locator('button[data-tooltip="Search / Outline"]');
    if (await searchRailBtn.isVisible()) {
      await searchRailBtn.click();
      await snap('audit-20-admin-content-rail-search.png', 'Admin Content Studio Search/Outline panel open');
      auditReport.interactionsTested++;
    }

    // Toggle Explorer back
    const explorerRailBtn = page.locator('button[data-tooltip="Explorer"]');
    if (await explorerRailBtn.isVisible()) {
      await explorerRailBtn.click();
    }

    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 7. ADMIN USERS MANAGER (/admin/users)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Admin Users Manager (/admin/users) ---');
    await page.goto('http://localhost:3000/admin/users', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Admin Users');
    await checkZeroScroll('Admin Users');
    await snap('audit-21-admin-users-list.png', 'Admin Users Manager initial list');

    // Click Sort dropdown
    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption({ index: 1 });
      await snap('audit-22-admin-users-sort.png', 'Admin Users Manager sorted view');
      auditReport.interactionsTested++;
    }

    // Open User Profile Menu in Admin
    const adminUsersUserBtn = page.getByRole('button', { name: 'User profile menu' });
    if (await adminUsersUserBtn.isVisible()) {
      await adminUsersUserBtn.click();
      await snap('audit-23-admin-users-user-menu.png', 'Admin Users profile dropdown open (100% unified)');
      auditReport.interactionsTested++;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Ensure menu is closed before interacting with table
    if (await page.locator('[role="menu"]').isVisible()) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }

    // Click "Manage" button on first user row
    const manageBtn = page.locator('button[class*="manageBtn"]').first();
    if (await manageBtn.isVisible()) {
      await manageBtn.click({ force: true });
      await page.waitForTimeout(400);
      await snap('audit-24-admin-users-manage-drawer.png', 'Admin Users Manage Learner drawer open');
      auditReport.interactionsTested++;
      // Close drawer by clicking close button or pressing Escape
      const closeBtn = page.locator('button[class*="modalCloseBtn"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await page.waitForTimeout(300);
    }
    auditReport.pagesChecked++;

    // ----------------------------------------------------
    // 8. ADMIN ACTIVITY HUB (/admin/activity)
    // ----------------------------------------------------
    console.log('\n--- Auditing: Admin Activity Hub (/admin/activity) ---');
    await page.goto('http://localhost:3000/admin/activity', { waitUntil: 'networkidle' });
    await checkHeaderMetrics('Admin Activity');
    await checkZeroScroll('Admin Activity');
    await snap('audit-25-admin-activity-overview-sandbox.png', 'Admin Activity Overview Terminal & Sandbox');

    // Category: API & Reliability
    const apiCatBtn = page.getByRole('button', { name: /API & Reliability/i });
    if (await apiCatBtn.isVisible()) {
      await apiCatBtn.click();
      await snap('audit-26-admin-activity-overview-api.png', 'Admin Activity Overview API & Reliability');
      auditReport.interactionsTested++;
    }

    // Category: System & Security
    const sysCatBtn = page.getByRole('button', { name: /System & Security/i });
    if (await sysCatBtn.isVisible()) {
      await sysCatBtn.click();
      await snap('audit-27-admin-activity-overview-system.png', 'Admin Activity Overview System & Security');
      auditReport.interactionsTested++;
    }

    // Tab: Sessions
    const sessionsTabBtn = page.getByRole('tab', { name: 'Sessions' });
    if (await sessionsTabBtn.isVisible()) {
      await sessionsTabBtn.click();
      await checkZeroScroll('Admin Activity Sessions');
      await snap('audit-28-admin-activity-sessions.png', 'Admin Activity Sessions tab active');
      auditReport.interactionsTested++;
    }

    // Tab: Admin log
    const logTabBtn = page.getByRole('tab', { name: 'Admin log' });
    if (await logTabBtn.isVisible()) {
      await logTabBtn.click();
      await checkZeroScroll('Admin Activity Log');
      await snap('audit-29-admin-activity-admin-log.png', 'Admin Activity Admin log tab active');
      auditReport.interactionsTested++;
    }

    // Open User Profile Menu in Activity
    const activityUserBtn = page.getByRole('button', { name: 'User profile menu' });
    if (await activityUserBtn.isVisible()) {
      await activityUserBtn.click();
      await snap('audit-30-admin-activity-user-menu.png', 'Admin Activity user profile dropdown open');
      auditReport.interactionsTested++;
      await page.keyboard.press('Escape');
    }
    auditReport.pagesChecked++;

    console.log('\n====================================================');
    console.log('             INTERACTIVE AUDIT REPORT               ');
    console.log('====================================================');
    console.log(`Total Pages Audited: ${auditReport.pagesChecked}`);
    console.log(`Total Interactions Executed: ${auditReport.interactionsTested}`);
    console.log(`Total Screenshots Captured: ${auditReport.screenshotsCaptured.length}`);
    console.log(`Runtime Console Errors: ${auditReport.consoleErrors.length}`);
    console.log('\nHeader Heights:');
    console.table(auditReport.headerHeightAudit);
    console.log('\nZero-Scroll Verification (Admin & Windows):');
    console.table(auditReport.zeroScrollAudit);

    const reportPath = path.join(artifactsDir, 'interactive-audit-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), 'utf8');
    console.log(`\nDetailed report written to: ${reportPath}`);

  } finally {
    await browser.close();
    await deleteTestUserSafe(admin);
    console.log('Cleanup complete.');
  }
}

runInteractiveAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
