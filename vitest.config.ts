import { defineConfig } from 'vitest/config';

// API & integration lane tests plus the shared contracts tests. The AI lane keeps its own
// suite in vitest.ai.config.ts (`pnpm test:ai`).
export default defineConfig({
  test: {
    include: [
      'packages/contracts/src/**/*.test.ts',
      'packages/contracts/tests/**/*.test.ts',
      'tools/*/src/**/*.test.ts',
      'supabase/functions/api/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**'],
  },
});
