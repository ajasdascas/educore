import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'https://onlineu.mx/educore';

export default defineConfig({
  testDir: './qa/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './qa/traces/test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'qa/reports/playwright-html', open: 'never' }],
    ['json', { outputFile: 'qa/reports/playwright-results.json' }],
  ],
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
