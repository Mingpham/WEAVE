/**
 * Everything the routes need from the outside world. Production wires Supabase adapters
 * (adapters/supabase.ts); tests wire in-memory fakes. Routes never import supabase-js.
 */
import type { MeResponse } from './contracts.ts';

export interface AuthUser {
  id: string;
  isAnonymous: boolean;
  email: string | null;
  /** The caller's JWT, forwarded so reads run under RLS (spec §9.1, §12.1). */
  jwt: string;
}

export interface AuthVerifier {
  /** Returns the user for a valid access token, or null. Never throws for a bad token. */
  verify(jwt: string): Promise<AuthUser | null>;
}

export interface StoredResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyRecord extends StoredResponse {
  requestHash: string;
}

/** `idempotency_keys` (spec §7.3, §9.1). Keyed by (user, key). */
export interface IdempotencyStore {
  get(userId: string, key: string): Promise<IdempotencyRecord | null>;
  /**
   * Saves the response. Returns false if another request saved the same key first
   * (concurrent retry); the caller then replays the stored record.
   */
  put(userId: string, key: string, operation: string, record: IdempotencyRecord): Promise<boolean>;
}

export interface MeRepository {
  /** Memberships in PENDING or APPROVED state, with a project summary (FR-AUTH-05). */
  getMe(user: AuthUser): Promise<MeResponse>;
}

export interface Logger {
  info(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export interface Deps {
  auth: AuthVerifier;
  idempotency: IdempotencyStore;
  me: MeRepository;
  logger: Logger;
  now: () => Date;
  /** Supabase function name; requests arrive as `/{functionName}/v1/...` (spec §9.1). */
  functionName: string;
}
