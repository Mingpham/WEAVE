import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {alias: {'@': fileURLToPath(new URL('./src', import.meta.url))}},
  esbuild: {jsx: 'automatic', jsxImportSource: 'react'},
  test: {pool: 'threads', maxWorkers: 1, minWorkers: 1},
});
