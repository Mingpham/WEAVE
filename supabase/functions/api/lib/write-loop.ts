/**
 * Write pattern of spec §11.0: read with state_version V → compute derived changes with the
 * engine → call the RPC with expected_state_version V. If the RPC reports a version mismatch,
 * re-read and redo from the start, up to 3 attempts, then 409 VERSION_CONFLICT. The user
 * never sees the internal retries.
 */
import { ApiError } from './errors.ts';

/** Thrown by an RPC adapter when `projects.state_version` no longer equals the expected V. */
export class StateVersionMismatch extends Error {
  // Plain fields (no parameter properties) so Node's built-in type stripping can run this file.
  readonly expected: number;
  readonly current: number;

  constructor(expected: number, current: number) {
    super(`state_version mismatch: expected ${expected}, current ${current}`);
    this.name = 'StateVersionMismatch';
    this.expected = expected;
    this.current = current;
  }
}

export const WRITE_LOOP_MAX_ATTEMPTS = 3;

export async function withStateVersionRetry<T>(
  attempt: (attemptNo: number) => Promise<T>,
  maxAttempts = WRITE_LOOP_MAX_ATTEMPTS,
): Promise<T> {
  let last: StateVersionMismatch | undefined;
  for (let n = 1; n <= maxAttempts; n++) {
    try {
      return await attempt(n);
    } catch (err) {
      if (!(err instanceof StateVersionMismatch)) throw err;
      last = err;
    }
  }
  throw new ApiError('VERSION_CONFLICT', undefined, {
    current: { state_version: last?.current ?? null },
  });
}
