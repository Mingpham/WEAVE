import { defineConfig } from 'vitest/config';
import ai from './vitest.ai.config.ts';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          include: [
            'packages/*/src/**/*.test.ts',
            'tools/*/src/**/*.test.ts',
            'supabase/functions/api/**/*.test.ts',
            'tests/**/*.test.ts',
          ],
          exclude: [
            '**/node_modules/**',
            'tests/e2e/**',
            'tests/ai-evals/**',
            '**/*.integration.test.ts',
          ],
        },
      },
      { test: { ...ai.test, name: 'ai' } },
    ],
  },
});
