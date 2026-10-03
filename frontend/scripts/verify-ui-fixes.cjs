const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { createTestUser, deleteTestUserSafe } = require('../tests/e2e/support/supabaseAdmin');

const artifactsDir = '/home/light/.gemini/antigravity-cli/brain/1452835d-ecd2-4990-8c8e-966c5ec35541';
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('================================================================');
  console.log('    VERIFYING RESPONSIVE TABS, USERS TABLE & MODAL Z-INDEX      ');
  console.log('================================================================');

  let admin = null;
  let browser = null;

  try {
    console.log('1. Provisioning admin user for UI verification...');
    admin = await createTestUser({ role: 'admin', prefix: 'uifix' });
    console.log(`Admin user: ${admin.email}`);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('2. Logging in as admin...');
    await page.goto(`${BASE_URL}/login`);
    const main = page.locator('main');
    await main.getByLabel('Email address').fill(admin.email);
    await main.getByLabel('Password', { exact: true }).fill(admin.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'));
    console.log('Login successful.');

    // -------------------------------------------------------------------------
    // TEST 1: Admin Content Responsive Layout & Overlap Check
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Admin Content Tabs Across Responsive Viewports ---');
    const viewports = [
      { name: '1920x1080_desktop', width: 1920, height: 1080 },
      { name: '1440x900_laptop', width: 1440, height: 900 },
      { name: '1280x800_compact_laptop', width: 1280, height: 800 },
      { name: '1024x768_tablet_landscape', width: 1024, height: 768 },
      { name: '800x600_narrow_window', width: 800, height: 600 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/admin/content`);
      await page.waitForLoadState('networkidle');

      const hintsTab = await page.$('button[title="Hints & Tips"]');
      const diffSelect = await page.$('select[aria-label="Lesson Difficulty"]');

      if (hintsTab && diffSelect) {
        const hintsBox = await hintsTab.boundingBox();
        const diffBox = await diffSelect.boundingBox();

        if (hintsBox && diffBox) {
          const overlap = !(hintsBox.x + hintsBox.width <= diffBox.x || diffBox.x + diffBox.width <= hintsBox.x);
          console.log(`Viewport ${vp.name}: Hints right=${Math.round(hintsBox.x + hintsBox.width)}, Diff left=${Math.round(diffBox.x)}, Overlap=${overlap}`);
          if (overlap) {
            console.error(`  ❌ OVERLAP DETECTED at ${vp.name}!`);
          } else {
            console.log(`  ✅ PASS: No overlap at ${vp.name} (Clear separation)`);
          }
        }
      }

      const shotPath = path.join(artifactsDir, `audit-responsive-content-${vp.name}.png`);
      await page.screenshot({ path: shotPath });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Admin Users Table & Manage Modal & Delete Confirmation Dialog
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Admin Users Table Cleanliness & Delete Dialog z-index ---');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/admin/users`);
    await page.waitForLoadState('networkidle');

    // 2.1 Verify NO "Make admin" or "Lock" buttons exist in table rows
    const actionCellButtons = await page.$$eval('[class*="actionCell"] button', btns => btns.map(b => b.textContent.trim()));
    console.log('Action cell buttons in table rows:', [...new Set(actionCellButtons)]);

    const hasOutsideMakeAdmin = actionCellButtons.some(t => t.includes('Make admin') || t.includes('Make learner'));
    const hasOutsideLock = actionCellButtons.some(t => t === 'Lock' || t === 'Unlock');

    if (!hasOutsideMakeAdmin && !hasOutsideLock && actionCellButtons.every(t => t === 'Manage')) {
      console.log('  ✅ PASS: Table rows only contain "Manage" button. Outside role/lock buttons removed!');
    } else {
      console.error('  ❌ FAIL: Found unwanted outside action buttons in table rows:', actionCellButtons);
    }

    const shotCleanTable = path.join(artifactsDir, 'audit-users-clean-table.png');
    await page.screenshot({ path: shotCleanTable });
    console.log(`  📸 Captured clean table: audit-users-clean-table.png`);

    // 2.2 Click Manage button on a non-admin/learner row (so Delete is enabled)
    const targetRow = page.locator('[class*="userRow"]').filter({ hasNotText: admin.email }).first();
    await targetRow.getByRole('button', { name: 'Manage' }).click();
    await page.waitForSelector('[class*="modalDialog"]');
    console.log('  Manage User modal opened successfully for target user.');

    const shotManageModal = path.join(artifactsDir, 'audit-users-manage-modal.png');
    await page.screenshot({ path: shotManageModal });
    console.log(`  📸 Captured Manage modal: audit-users-manage-modal.png`);

    // 2.3 Verify role & lock controls exist inside the modal
    const modalButtons = await page.$$eval('[class*="modalDialog"] button', btns => btns.map(b => b.textContent.trim()));
    console.log('Buttons inside Manage User modal:', modalButtons);

    const hasModalRole = modalButtons.some(t => t.includes('Make admin') || t.includes('Make learner') || t.includes('Admin') || t.includes('Learner'));
    const hasModalLock = modalButtons.some(t => t.includes('Lock') || t.includes('Unlock'));
    const hasModalDelete = modalButtons.some(t => t.includes('Delete User'));

    if (hasModalRole && hasModalLock && hasModalDelete) {
      console.log('  ✅ PASS: Manage User modal contains Role, Lock, and Delete actions!');
    } else {
      console.error('  ❌ FAIL: Missing expected buttons in modal:', modalButtons);
    }

    // 2.4 Click "Delete User" inside Manage User modal
    const deleteBtn = page.locator('[class*="modalDialog"]').getByRole('button', { name: 'Delete User' });
    await expect(deleteBtn).toBeEnabled();
    await deleteBtn.click();
    await page.waitForSelector('[class*="dialog"]');
    console.log('  Delete User confirmation dialog (ReasonDialog) opened.');

    // 2.5 Verify z-index: ReasonDialog MUST be on top of Manage User modal
    const dialogZIndex = await page.$eval('[class*="backdrop"]', el => window.getComputedStyle(el).zIndex);
    const modalZIndex = await page.$eval('[class*="modalBackdrop"]', el => window.getComputedStyle(el).zIndex);
    console.log(`  Z-Index comparison: ReasonDialog backdrop=${dialogZIndex} vs Manage Modal=${modalZIndex}`);

    if (parseInt(dialogZIndex) > parseInt(modalZIndex)) {
      console.log(`  ✅ PASS: ReasonDialog z-index (${dialogZIndex}) > Manage Modal (${modalZIndex})! Renders ON TOP!`);
    } else {
      console.error(`  ❌ FAIL: ReasonDialog z-index (${dialogZIndex}) <= Manage Modal (${modalZIndex})! Renders UNDER!`);
    }

    const shotDeleteOnTop = path.join(artifactsDir, 'audit-users-delete-dialog-on-top.png');
    await page.screenshot({ path: shotDeleteOnTop });
    console.log(`  📸 Captured Delete confirmation on top: audit-users-delete-dialog-on-top.png`);

  } finally {
    if (browser) await browser.close();
    if (admin) await deleteTestUserSafe(admin);
    console.log('\nAudit test cleanup complete.');
  }
}

function expect(locator) {
  return {
    toBeEnabled: async () => {
      const isEnabled = await locator.isEnabled();
      if (!isEnabled) throw new Error('Locator is not enabled!');
    }
  };
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
