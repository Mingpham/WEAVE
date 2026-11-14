/** Endpoints #3–5, #7: project lifecycle (FR-EVT-01…07, FR-SET-01). */
import { z } from 'zod';
import { CurrencyCode, IsoDateTime, ProjectSettings, RoleTag, TimeZone } from '../common.ts';
import { MemberSelf, ProjectView, Snapshot } from '../entities.ts';
import { LIMITS } from '../limits.ts';
import { POL } from '../policy.ts';
import { endpoint } from './endpoint.ts';

const HOUR_MS = 3_600_000;

const Title = z.string().trim().min(LIMITS.PROJECT_TITLE.min).max(LIMITS.PROJECT_TITLE.max);
const Brief = z.string().trim().min(LIMITS.PROJECT_BRIEF.min).max(LIMITS.PROJECT_BRIEF.max);
const VenueName = z.string().trim().max(120).nullable();

/** FR-EVT-01: `ends_at > starts_at`, duration at most 72 hours. */
function validWindow(v: { starts_at?: string | undefined; ends_at?: string | undefined }): boolean {
  if (v.starts_at === undefined || v.ends_at === undefined) return true;
  const start = Date.parse(v.starts_at);
  const end = Date.parse(v.ends_at);
  return end > start && end - start <= LIMITS.PROJECT_MAX_DURATION_HOURS * HOUR_MS;
}
const WINDOW_MESSAGE = {
  message: `ends_at must be after starts_at and at most ${LIMITS.PROJECT_MAX_DURATION_HOURS} hours later`,
  path: ['ends_at'],
};

export const CreateProjectBody = z
  .strictObject({
    title: Title,
    brief: Brief,
    venue_name: VenueName.optional(),
    starts_at: IsoDateTime,
    ends_at: IsoDateTime,
    timezone: TimeZone,
    expected_team_size: z.number().int().min(LIMITS.TEAM_SIZE_MIN).max(POL.MAX_MEMBERS),
    expected_attendees: z.number().int().nonnegative().nullable().optional(),
    currency: CurrencyCode.optional(),
  })
  .refine(validWindow, WINDOW_MESSAGE);

export const CreateProjectData = z.strictObject({
  project: ProjectView,
  me: MemberSelf,
});

export const CreateProject = endpoint({
  no: 3,
  method: 'POST',
  path: '/projects',
  actor: 'USER_GOOGLE',
  body: CreateProjectBody,
  data: CreateProjectData,
  milestone: 1,
});

export const GetSnapshot = endpoint({
  no: 4,
  method: 'GET',
  path: '/projects/{pid}/snapshot',
  actor: 'MEMBER',
  data: Snapshot,
  milestone: 1,
});

/**
 * FR-EVT-04: title, venue_name, brief editable in DRAFT and ACTIVE; starts_at / ends_at
 * only in DRAFT (enforced server-side). `settings` is a partial update of the flags.
 */
export const UpdateProjectBody = z
  .strictObject({
    title: Title.optional(),
    brief: Brief.optional(),
    venue_name: VenueName.optional(),
    starts_at: IsoDateTime.optional(),
    ends_at: IsoDateTime.optional(),
    settings: ProjectSettings.partial().optional(),
    role_tags: z.array(RoleTag).max(30).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' })
  .refine(validWindow, WINDOW_MESSAGE);

export const UpdateProject = endpoint({
  no: 5,
  method: 'PATCH',
  path: '/projects/{pid}',
  actor: 'OWNER',
  body: UpdateProjectBody,
  data: ProjectView,
  milestone: 1,
});

export const DeleteProjectBody = z.strictObject({ confirm_title: z.string() });

export const DeleteProject = endpoint({
  no: 7,
  method: 'DELETE',
  path: '/projects/{pid}',
  actor: 'OWNER',
  body: DeleteProjectBody,
  data: z.null(),
  milestone: 1,
});

export type CreateProjectBody = z.infer<typeof CreateProjectBody>;
export type CreateProjectData = z.infer<typeof CreateProjectData>;
export type UpdateProjectBody = z.infer<typeof UpdateProjectBody>;
export type DeleteProjectBody = z.infer<typeof DeleteProjectBody>;
