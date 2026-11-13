import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT || 4173);

// Run through `npm run e2e`, which first exports the web build with known endpoints.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/artifacts',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],
  webServer: {
    command: 'node e2e/serve.mjs',
    url: `http://127.0.0.1:${port}`,
    env: { E2E_PORT: String(port) },
    reuseExistingServer: !process.env.CI,
  },
});
