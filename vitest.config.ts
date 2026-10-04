import * as path from 'path';
import type { ViteUserConfig } from 'vitest/config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    target: 'es2018',
  },
  // our image urls have always been relative from root in tests. would be nice to
  // have a better place of where served files go for tests and then we just use /images/xyz.png
  publicDir: __dirname,
  resolve: {
    alias: {
      "@excalibur-tiled": path.resolve(__dirname, './src/')
    }
  },
  test: {
    api: { host: '127.0.0.1' },
    silent: 'passed-only',
    clearMocks: true,
    reporters: [
      ['default', { summary: false }]
    ],
    // enable with --coverage param
    coverage: {
      include: ['src/**/*.ts'],
      provider: 'istanbul',
      reporter: [
        ['html'],
        ['lcov', { projectRoot: __dirname }],
        ['text-summary'],
      ],
      reportsDirectory: path.join(__dirname, 'coverage')
    },
    projects: [
      path.resolve(__dirname, './test/unit/vitest.unit.config.ts')
    ]
  }
} satisfies ViteUserConfig);

declare module 'vitest' {
  export interface ProvidedContext {
    browser: 'chromium' | 'firefox' | 'webkit';
    platform: NodeJS.Platform;
  }
}
