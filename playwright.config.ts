import { defineConfig, devices } from '@playwright/test';

// Defaults to 4173 (the same port excalibur core's sandbox e2e suite uses). Overridable so
// that several excalibur plugin repos can run their e2e suites side by side on one machine
// without `reuseExistingServer` silently latching onto a *sibling* repo's dev server.
const port = Number(process.env.EX_E2E_PORT ?? 4173);

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: true,
  // Mirrors excalibur core's sandbox e2e config: on swiftshader/software-rendered runners a
  // high worker count backs up the GPU command queue and turns into timeouts. 2 is a
  // reasonable speed/stability balance - override with --workers locally if you have headroom.
  workers: 2,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    screenshot: 'off',
    trace: 'off'
  },
  webServer: {
    command: `npx vite example --port ${port} --strictPort`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Copied verbatim from excalibur core's playwright.config.ts - these flags are why
        // the baselines reproduce across machines/OSes. Do not "clean up".
        launchOptions: {
          ignoreDefaultArgs: ['--disable-render-backgrounding', '--disable-remote-fonts', '--font-render-hinting'],
          args: [
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-default-apps',
            '--disable-popup-blocking',
            '--disable-translate',
            '--disable-background-timer-throttling',
            '--disable-dev-shm-usage',
            '--disable-renderer-backgrounding',
            '--disable-device-discovery-notifications',
            '--autoplay-policy=no-user-gesture-required',
            '--mute-audio',
            '--force-device-scale-factor=1',
            '--use-gl=swiftshader'
          ]
        }
      }
    }
  ]
});
