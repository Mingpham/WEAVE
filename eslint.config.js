import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '.agents/**',
      'docs/**',
      'coverage/**',
      'apps/mobile/android/**',
      'apps/mobile/.expo/**',
      // Other lanes' files (kept byte-identical to their branches); linting them is their call.
      'packages/contracts/tests/**',
      'packages/contracts/src/ai/**',
      'packages/engine/**',
      'supabase/functions/ai-worker/**',
      'supabase/functions/_shared/**',
      'tests/security/**',
      'tests/ai-evals/**',
      'vitest.ai.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: { Deno: 'readonly', EdgeRuntime: 'readonly' },
    },
  },
);
