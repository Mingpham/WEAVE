/** Endpoints #1–2: the signed-in user (FR-AUTH-01…06, FR-NTF-03). */
import { z } from 'zod';
import { Uuid } from '../common.ts';
import { ProjectSummary } from '../entities.ts';
import { MemberRole, MemberStatus } from '../enums.ts';
import { endpoint } from './endpoint.ts';

export const MeUser = z.strictObject({
  id: Uuid,
  is_anonymous: z.boolean(),
  /** Google account email for organizers; null for guests. Never shown to other users. */
  email: z.string().nullable(),
});

/** One membership on SCR-02 My Events, including PENDING ones (FR-AUTH-05). */
export const MeMembership = z.strictObject({
  member_id: Uuid,
  role: MemberRole,
  status: MemberStatus,
  nickname: z.string(),
  project: ProjectSummary,
});

export const MeResponse = z.strictObject({
  user: MeUser,
  memberships: z.array(MeMembership),
});

export const GetMe = endpoint({
  no: 1,
  method: 'GET',
  path: '/me',
  actor: 'USER',
  data: MeResponse,
  milestone: 0,
});

export const PutPushTokenBody = z.strictObject({
  token: z.string().min(1).max(512),
  platform: z.literal('android'),
});

export const PutPushToken = endpoint({
  no: 2,
  method: 'PUT',
  path: '/me/push-token',
  actor: 'USER',
  body: PutPushTokenBody,
  data: z.null(),
  milestone: 3,
});

export type MeUser = z.infer<typeof MeUser>;
export type MeMembership = z.infer<typeof MeMembership>;
export type MeResponse = z.infer<typeof MeResponse>;
export type PutPushTokenBody = z.infer<typeof PutPushTokenBody>;
