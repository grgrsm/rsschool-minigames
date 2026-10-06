import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Pure logic tests run in Node. DOM tests opt in per file with
      // `// @vitest-environment jsdom` once a DOM simulator is installed.
      environment: 'node',
      include: ['src/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        // Every application file is measured, even if no test imports it yet.
        include: ['src/**/*.ts'],
        exclude: [
          // Test files are not application code.
          'src/**/*.test.ts',
          // Ambient type declarations: no runtime code.
          'src/**/*.d.ts',
          // Firebase SDK bootstrap: only reads env variables and initializes the SDK,
          // it contains no application logic.
          'src/firebase/firebase.ts',
        ],
      },
    },
  }),
);
