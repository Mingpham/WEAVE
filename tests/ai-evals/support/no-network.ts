import { beforeEach, afterEach, vi } from 'vitest';

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('Network is disabled in unit tests; inject a fetch fixture');
  });
});
afterEach(() => vi.unstubAllGlobals());
