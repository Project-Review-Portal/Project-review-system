const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 180000, // 3 minutes for comprehensive multi-role journey
  expect: {
    timeout: 15000
  },
  fullyParallel: false, // Run steps in logical sequence
  workers: 1, // Single worker to ensure end-to-end data continuity across roles
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    headless: false, // Run in visible browser UI as requested
    launchOptions: {
      slowMo: 400 // Slow down actions by 400ms so you can comfortably watch each action
    },
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
