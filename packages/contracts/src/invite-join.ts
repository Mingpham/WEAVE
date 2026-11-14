import { z } from 'zod';

export const InviteCode = z.string().regex(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
export const InviteActionRequest = z.strictObject({ action: z.enum(['CREATE', 'DISABLE']) });
export const ResolveInviteRequest = z.strictObject({ code: InviteCode });
const Availability = z.union([
  z.strictObject({ whole_event: z.literal(true) }),
  z.strictObject({ windows: z.array(z.strictObject({ from: z.iso.datetime(), to: z.iso.datetime() })
    .refine(w => Date.parse(w.to) > Date.parse(w.from), { path: ['to'], message: 'Window must end after it starts' })).min(1) }),
]);
export const JoinInviteRequest = z.strictObject({
  code: InviteCode,
  nickname: z.string().trim().min(2).max(24),
  role_tags: z.array(z.string().min(1)),
  availability: Availability,
  consent_version: z.string().min(1),
});
export const InviteActionResponse = z.strictObject({
  data: z.strictObject({ code: InviteCode.nullable(), expires_at: z.iso.datetime().nullable(), deep_link: z.string().nullable() }),
  meta: z.strictObject({ state_version: z.number().int().nonnegative() }),
});
export const ResolveInviteResponse = z.strictObject({
  data: z.strictObject({ project_title: z.string(), organizer_nickname: z.string(), consent_version: z.string(), role_tags: z.array(z.string()) }),
});
export const JoinInviteResponse = z.strictObject({
  data: z.strictObject({ project_id: z.uuid(), member_id: z.uuid(), status: z.enum(['PENDING', 'APPROVED']) }),
  meta: z.strictObject({ state_version: z.number().int().nonnegative() }),
});
export type JoinInviteRequest = z.infer<typeof JoinInviteRequest>;
