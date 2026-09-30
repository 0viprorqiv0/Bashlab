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
  // The frontend and the backend API (auth, profile) must both be up; the API
  // runs without the Docker sandbox (SANDBOX_ENABLED=false in backend/.env).
  webServer: [
    { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120000 },
    { command: 'npm run start:api', cwd: '../backend', url: 'http://127.0.0.1:3001/health', reuseExistingServer: true, timeout: 60000,
      // The suite logs in far more often per minute than any real user; the per-account brute-force limit stays at its default.
      env: { AUTH_RATE_LIMIT_GENERAL: '5000', AUTH_RATE_LIMIT_SENSITIVE: '5000' } },
  ],
});
