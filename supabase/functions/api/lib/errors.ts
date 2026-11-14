/** Error type and §9.2 envelope mapping for every route. */
import type { ZodError } from 'zod';
import { DEFAULT_ERROR_MESSAGE, ERROR_HTTP_STATUS } from '../contracts.ts';
import type { ErrorCode, ErrorEnvelope } from '../contracts.ts';

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? DEFAULT_ERROR_MESSAGE[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    this.details = details;
  }

  toEnvelope(): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details === undefined ? {} : { details: this.details }),
      },
    };
  }
}

/** `422 VALIDATION_FAILED` with `details.issues` from Zod (spec §9.2). */
export function validationError(
  error: ZodError,
  where: 'body' | 'query' | 'params' | 'header',
): ApiError {
  return new ApiError('VALIDATION_FAILED', undefined, {
    where,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), code: i.code, message: i.message })),
  });
}
