import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * V1 Acceptance Criteria Testing
 * Base URL: http://agentic.test (via Caddy reverse proxy)
 * Fallback: http://localhost:3010
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially to avoid state conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for deterministic state
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    // Use localhost for tests (agentic.test requires Caddy proxy)
    baseURL: process.env.BASE_URL || 'http://localhost:3010',

    // Capture traces on failure
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Reasonable timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run dev server before tests if not already running
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3010',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
