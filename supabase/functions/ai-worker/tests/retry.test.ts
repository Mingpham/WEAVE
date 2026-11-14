import { expect, it } from 'vitest';
import { nextRetry } from '../retry.ts';

it('INV-08 bounds retry and preserves schema failure history across restarts', () => {
  expect(nextRetry('TRANSIENT', 1, 0)).toEqual({ retry: true, delayMs: 2000 });
  expect(nextRetry('TRANSIENT', 2, 0)).toEqual({ retry: true, delayMs: 8000 });
  expect(nextRetry('TRANSIENT', 3, 0)).toEqual({ retry: false, delayMs: 0 });
  expect(nextRetry('SCHEMA', 1, 1)).toEqual({ retry: true, delayMs: 2000 });
  expect(nextRetry('ID', 2, 2)).toEqual({ retry: false, delayMs: 0 });
  expect(nextRetry('PERMANENT', 1, 0)).toEqual({ retry: false, delayMs: 0 });
});
