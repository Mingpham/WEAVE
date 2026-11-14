/**
 * Endpoint definition helper. Every route in spec §9.3 is declared once with its method,
 * path template, actor, schemas and concurrency rules; `api`, `tools/mock-api` and the
 * mobile client all read the same definition.
 */
import { z } from 'zod';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Spec §9.3 actor column: O owner · P participant · M approved member · U any signed-in user. */
export type Actor =
  | 'OWNER'
  | 'PARTICIPANT'
  | 'MEMBER'
  | 'USER'
  | 'USER_GOOGLE'
  | 'SELF_OR_OWNER'
  | 'ASSIGNEE'
  | 'INVITEE'
  | 'TARGET_MEMBER'
  | 'SUBMITTER'
  | 'UPLOADER'
  | 'BY_VISIBILITY'
  | 'PARTICIPANT_OR_PENDING';

export interface EndpointDef<
  Body extends z.ZodType = z.ZodType,
  Query extends z.ZodType = z.ZodType,
  Data extends z.ZodType = z.ZodType,
> {
  /** Row number in spec §9.3. */
  readonly no: number;
  readonly method: HttpMethod;
  /** Path under `/v1`, with `{param}` placeholders, e.g. `/projects/{pid}/snapshot`. */
  readonly path: string;
  readonly actor: Actor;
  readonly body: Body | null;
  readonly query: Query | null;
  readonly data: Data;
  /** `ver` column: body must carry expected_version / expected_revision. */
  readonly versioned: boolean;
  /** Milestone that delivers the route (spec §15.4). */
  readonly milestone: number;
}

export function endpoint<B extends z.ZodType, Q extends z.ZodType, D extends z.ZodType>(def: {
  no: number;
  method: HttpMethod;
  path: string;
  actor: Actor;
  body?: B;
  query?: Q;
  data: D;
  versioned?: boolean;
  milestone: number;
}): EndpointDef<B, Q, D> {
  return {
    no: def.no,
    method: def.method,
    path: def.path,
    actor: def.actor,
    body: def.body ?? null,
    query: def.query ?? null,
    data: def.data,
    versioned: def.versioned ?? false,
    milestone: def.milestone,
  };
}

/** Mutations need `X-Idempotency-Key` (spec §9.1). */
export function isMutation(method: HttpMethod): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key';
export const IdempotencyKey = z.uuidv4();

/** Base path of the deployed function (spec §9.1). */
export const API_BASE_PATH = '/functions/v1/api';
export const API_VERSION_PREFIX = '/v1';

/** Expected version / revision fields used by `ver` endpoints. */
export const ExpectedVersion = z.number().int().positive();
export const ExpectedRevision = z.number().int().positive();

export type BodyOf<E> = E extends EndpointDef<infer B, z.ZodType, z.ZodType> ? z.infer<B> : never;
export type QueryOf<E> = E extends EndpointDef<z.ZodType, infer Q, z.ZodType> ? z.infer<Q> : never;
export type DataOf<E> = E extends EndpointDef<z.ZodType, z.ZodType, infer D> ? z.infer<D> : never;
