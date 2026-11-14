import { POL } from '../../../packages/contracts/src/policy.ts';
export type RetryClass = 'TRANSIENT' | 'SCHEMA' | 'ID' | 'PERMANENT';

export function nextRetry(
  errorClass: RetryClass,
  attempts: number,
  schemaIdFailures: number,
): { retry: boolean; delayMs: number } {
  if (
    !Number.isSafeInteger(attempts) ||
    attempts < 1 ||
    !Number.isSafeInteger(schemaIdFailures) ||
    schemaIdFailures < 0
  )
    throw new Error('INVALID_RETRY_STATE');
  if (
    attempts >= POL.JOB_MAX_ATTEMPTS ||
    errorClass === 'PERMANENT' ||
    ((errorClass === 'SCHEMA' || errorClass === 'ID') && schemaIdFailures >= 2)
  )
    return { retry: false, delayMs: 0 };
  return { retry: true, delayMs: attempts === 1 ? 2000 : 8000 };
}
