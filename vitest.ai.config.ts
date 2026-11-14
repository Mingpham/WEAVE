export default {
  test: {
    include: [
      'packages/contracts/tests/**/*.test.ts',
      'packages/engine/tests/**/*.test.ts',
      'supabase/functions/_shared/ai/tests/**/*.test.ts',
      'supabase/functions/ai-worker/tests/**/*.test.ts',
      'tests/ai-evals/**/*.test.ts',
    ],
    exclude: ['**/*.integration.test.ts'],
    setupFiles: ['./tests/ai-evals/support/no-network.ts'],
  },
};
