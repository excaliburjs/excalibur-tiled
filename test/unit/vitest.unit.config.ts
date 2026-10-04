import * as os from 'os';
import type { ViteUserConfig } from 'vitest/config';
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import baseConfig from '../../vitest.config';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(
  mergeConfig(baseConfig, {
    define: {
      'process': {},
    },
    assetsInclude: [
      './**/*.tx',
      './**/*.tj',
      './**/*.tmx',
      './**/*.tmj',
      './**/*.tsx',
      './**/*.tsj',
    ],
    plugins: [
      nodePolyfills(),
    ],
    test: {
      name: 'unit',
      globals: true,
      // setupFiles: ['./__util__/setup.ts', './__matchers__/expect.ts'],
      include: ['./**/*spec.ts'],
      // this will give each test their own environment. disabling this
      // actually ended up breaking WebGL contexts in some cases
      isolate: true,
      sequence: {
        groupOrder: 0
      },
      browser: {
        enabled: true,
        provider: playwright(),
        headless: process.env.CI === 'true' ? true : undefined,
        instances: [
          {
            browser: 'chromium',
            provide: {
              browser: 'chromium',
              platform: os.platform()
            },
          }
        ]
      }
    }
  } satisfies ViteUserConfig)
);
