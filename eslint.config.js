import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'apps/mobile/**',
      'tests/fixtures/mobile/**',
      '**/node_modules/**',
      '.agents/**',
      '.superpowers/**',
      '.worktrees/**',
      'docs/**',
      'coverage/**',
      'apps/mobile/android/**',
      'apps/mobile/.expo/**',
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
    files: ['supabase/functions/**/*.ts', 'tests/ai-evals/live-smoke.ts'],
    languageOptions: {
      globals: { Deno: 'readonly', EdgeRuntime: 'readonly' },
    },
  },
);
