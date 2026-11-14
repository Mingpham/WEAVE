/** Endpoints #8–14: invites, joining, member decisions (FR-MEM-01…07). */
import { z } from 'zod';
import {
  Availability,
  InviteCode,
  IsoDateTime,
  Nickname,
  RoleTag,
  TimeZone,
  Uuid,
} from '../common.ts';
import { Invite, MemberSelf } from '../entities.ts';
import { MemberPresence, MemberStatus } from '../enums.ts';
import { ExpectedVersion, endpoint } from './endpoint.ts';

export const InviteActionBody = z.strictObject({ action: z.enum(['CREATE', 'DISABLE']) });

export const InviteAction = endpoint({
  no: 8,
  method: 'POST',
  path: '/projects/{pid}/invites',
  actor: 'OWNER',
  body: InviteActionBody,
  /** The new invite for CREATE; null after DISABLE. */
  data: Invite.nullable(),
  milestone: 1,
});

export const ResolveInviteBody = z.strictObject({ code: InviteCode });

export const ResolveInviteData = z.strictObject({
  project_id: Uuid,
  project_title: z.string(),
  organizer_nickname: z.string(),
  venue_name: z.string().nullable(),
  starts_at: IsoDateTime,
  ends_at: IsoDateTime,
  timezone: TimeZone,
  consent_version: z.string(),
  role_tags: z.array(RoleTag),
});

export const ResolveInvite = endpoint({
  no: 9,
  method: 'POST',
  path: '/invites/resolve',
  actor: 'USER',
  body: ResolveInviteBody,
  data: ResolveInviteData,
  milestone: 1,
});

/** `"Other"` is a UI choice; it is sent as an empty role_tags list plus nothing else. */
export const JoinBody = z.strictObject({
  code: InviteCode,
  nickname: Nickname,
  role_tags: z.array(RoleTag).max(10),
  availability: Availability,
  consent_version: z.string().min(1).max(32),
});

export const JoinData = z.strictObject({
  project_id: Uuid,
  member: MemberSelf,
});

export const Join = endpoint({
  no: 10,
  method: 'POST',
  path: '/invites/join',
  actor: 'USER',
  body: JoinBody,
  data: JoinData,
  milestone: 1,
});

export const MemberDecisionBody = z.strictObject({
  decision: z.enum(['APPROVE', 'REJECT']),
  expected_version: ExpectedVersion,
});

export const MemberDecisionData = z.strictObject({
  member_id: Uuid,
  status: MemberStatus,
  version: z.number().int().positive(),
});

export const MemberDecision = endpoint({
  no: 11,
  method: 'POST',
  path: '/members/{mid}/decision',
  actor: 'OWNER',
  body: MemberDecisionBody,
  data: MemberDecisionData,
  versioned: true,
  milestone: 1,
});

/**
 * FR-MEM-05. A member edits their own profile and on-site state; the owner may only change
 * `role_tags` of another member (enforced server-side). `unavailable_reason` only with
 * `presence = UNAVAILABLE`.
 */
export const UpdateMemberBody = z
  .strictObject({
    nickname: Nickname.optional(),
    role_tags: z.array(RoleTag).max(10).optional(),
    availability: Availability.optional(),
    presence: MemberPresence.optional(),
    unavailable_reason: z.string().trim().max(200).optional(),
    current_area_id: Uuid.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })
  .refine((v) => v.unavailable_reason === undefined || v.presence === 'UNAVAILABLE', {
    message: 'unavailable_reason requires presence = UNAVAILABLE',
    path: ['unavailable_reason'],
  });

export const UpdateMember = endpoint({
  no: 12,
  method: 'PATCH',
  path: '/members/{mid}',
  actor: 'SELF_OR_OWNER',
  body: UpdateMemberBody,
  data: MemberSelf,
  milestone: 1,
});

export const RemoveMemberBody = z.strictObject({ reason: z.string().trim().max(200).optional() });

export const RemoveMember = endpoint({
  no: 13,
  method: 'POST',
  path: '/members/{mid}/remove',
  actor: 'OWNER',
  body: RemoveMemberBody,
  data: z.null(),
  milestone: 1,
});

export const LeaveProject = endpoint({
  no: 14,
  method: 'POST',
  path: '/projects/{pid}/leave',
  actor: 'PARTICIPANT_OR_PENDING',
  body: z.strictObject({}),
  data: z.null(),
  milestone: 1,
});

export type InviteActionBody = z.infer<typeof InviteActionBody>;
export type ResolveInviteBody = z.infer<typeof ResolveInviteBody>;
export type ResolveInviteData = z.infer<typeof ResolveInviteData>;
export type JoinBody = z.infer<typeof JoinBody>;
export type JoinData = z.infer<typeof JoinData>;
export type MemberDecisionBody = z.infer<typeof MemberDecisionBody>;
export type MemberDecisionData = z.infer<typeof MemberDecisionData>;
export type UpdateMemberBody = z.infer<typeof UpdateMemberBody>;
export type RemoveMemberBody = z.infer<typeof RemoveMemberBody>;
