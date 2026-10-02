// The whole lab workflow through the real UI and API: open a lab, find the files
// the lab placed in the terminal's home directory, do what the lab teaches, read
// the flag, paste it in the "Submit flag" box, and see the lab completed.
//
// It needs an API with a working sandbox (Linux/WSL with `npm run runner:start`,
// see backend/RUNNING.md) and a frontend that is not told the sandbox is off.
// It is skipped unless E2E_SANDBOX=1, so the normal suite (SANDBOX_ENABLED=false)
// is unaffected:
//   E2E_SANDBOX=1 npx playwright test specs/workspace.spec.js
const { test, expect } = require('../support/session');
const { adminClient } = require('../support/supabaseAdmin');
const { loadUsers } = require('../support/testUsers');

test.skip(!process.env.E2E_SANDBOX, 'needs a working sandbox: run with E2E_SANDBOX=1 against a Linux/WSL API');
test.use({ asRole: 'learner' });
test.describe.configure({ mode: 'serial' });

let users;
test.beforeAll(() => { users = loadUsers(); });
test.afterEach(async () => { await adminClient.from('progress').delete().eq('user_id', users.learner.id); });

const LAB = (slug) => `/courses/shell-101/labs/${slug}`;

async function boot(page, slug) {
  await page.goto(LAB(slug));
  const terminal = page.getByLabel('Terminal command');
  await expect(terminal).toBeEnabled({ timeout: 20000 });
  return terminal;
}
// Each command adds two rows to the screen (the command itself and its output):
// waiting for both means the command has finished.
async function run(page, terminal, command) {
  const rows = page.locator('[class*="termRow"]');
  const before = await rows.count();
  await terminal.fill(command);
  await terminal.press('Enter');
  await expect(rows).toHaveCount(before + 2);
}
const screen = (page) => page.locator('[class*="termScreen"]');
async function flagFrom(page) {
  const text = await screen(page).innerText();
  const found = text.match(/BASHLAB\{[a-z0-9_]+\}/);
  expect(found, `no flag on the terminal screen:\n${text}`).not.toBeNull();
  return found[0];
}

test('the terminal opens clean: a prompt and nothing else, no placeholder, no boot banner', async ({ page }) => {
  const terminal = await boot(page, 'terminal-fundamentals-navigation');
  await expect(terminal).not.toHaveAttribute('placeholder', /.+/);
  const text = await screen(page).innerText();
  expect(text).not.toMatch(/Booting container|BashLab Cloud Shell|type a bash command/i);
  await expect(page.getByText('student@bashlab:~$').first()).toBeVisible();
});

test('find-it lab: ls hides the flag, ls -la shows its file, cat reads it, submitting it completes the lab', async ({ page }) => {
  const terminal = await boot(page, 'terminal-fundamentals-navigation');
  await run(page, terminal, 'ls');
  await expect(screen(page)).toContainText('welcome.txt');
  await expect(screen(page)).toContainText('MISSION.txt');
  await expect(screen(page)).not.toContainText('.secret_flag');
  await run(page, terminal, 'ls -la');
  await expect(screen(page)).toContainText('.secret_flag');
  await run(page, terminal, 'cat .secret_flag');
  const flag = await flagFrom(page);

  await run(page, terminal, 'cd /var/log');
  await expect(page.getByText('student@bashlab:/var/log$').first()).toBeVisible(); // the directory persists between commands
  await run(page, terminal, 'cd ~');

  await page.getByLabel('Flag').fill('BASHLAB{definitely_wrong}');
  await page.getByRole('button', { name: 'Submit flag' }).click();
  await expect(page.getByText('Wrong flag. Check it and try again.')).toBeVisible();

  await page.getByLabel('Flag').fill(flag);
  await page.getByRole('button', { name: 'Submit flag' }).click();
  await expect(page.getByText('Correct flag. Lab completed!')).toBeVisible();
  await expect(page.getByLabel('Flag')).toBeDisabled();

  const { data } = await adminClient.from('progress').select('status, lessons(slug)').eq('user_id', users.learner.id);
  expect(data).toHaveLength(1);
  expect(data[0].lessons.slug).toBe('terminal-fundamentals-navigation');
  await page.reload();
  await expect(page.getByLabel('Flag')).toBeDisabled(); // still solved after a reload
});

test('do-it lab: check.sh stays quiet until the work is done, then prints the flag', async ({ page }) => {
  const terminal = await boot(page, 'directory-creation-file-manipulation');
  await run(page, terminal, './check.sh');
  await expect(screen(page)).toContainText('missing: project/src');
  await expect(screen(page)).not.toContainText('BASHLAB{');
  await run(page, terminal, 'mkdir -p project/src project/config');
  await run(page, terminal, 'touch project/config/app.json');
  await run(page, terminal, 'cp project/config/app.json project/config/app.json.bak');
  await run(page, terminal, './check.sh');
  const flag = await flagFrom(page);

  await page.getByLabel('Flag').fill(flag);
  await page.getByRole('button', { name: 'Submit flag' }).click();
  await expect(page.getByText('Correct flag. Lab completed!')).toBeVisible();
});

test('Reset wipes the learner\'s work and puts the lab\'s starting files back', async ({ page }) => {
  const terminal = await boot(page, 'directory-creation-file-manipulation');
  await run(page, terminal, 'mkdir -p project');
  await run(page, terminal, 'ls');
  await expect(screen(page)).toContainText('project');
  await page.getByRole('button', { name: 'Restart Instance' }).click();
  await expect(terminal).toBeEnabled({ timeout: 20000 });
  await run(page, terminal, 'ls');
  const lastOutput = page.locator('[class*="termRow"]').last(); // the output of this ls
  await expect(lastOutput).toContainText('check.sh');
  await expect(lastOutput).not.toContainText('project');
});

test('the flag of another lab is refused', async ({ page }) => {
  await boot(page, 'terminal-fundamentals-navigation');
  await page.getByLabel('Flag').fill('BASHLAB{mkdir_touch_cp_all_done}');
  await page.getByRole('button', { name: 'Submit flag' }).click();
  await expect(page.getByText('Wrong flag. Check it and try again.')).toBeVisible();
  const { data } = await adminClient.from('progress').select('status').eq('user_id', users.learner.id);
  expect(data ?? []).toHaveLength(0);
});
