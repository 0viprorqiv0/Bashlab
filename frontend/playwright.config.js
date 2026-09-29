const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  // Shared Supabase state (admin_logs, user roles, "last active admin" count)
  // across spec files — serialize workers so tests can't race each other.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'tests/e2e/report' }]],
  globalTeardown: './tests/e2e/global-teardown.js',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /specs\/.*\.spec\.js/,
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
