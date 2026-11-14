/**
 * Read models returned by the API (spec §9.4 Snapshot and the §7.3 columns behind it).
 * These are views, not table rows: fields are filtered by role per spec §3 before leaving `api`.
 */
import { z } from 'zod';
import {
  Availability,
  CurrencyCode,
  IsoDateTime,
  NavTarget,
  Nickname,
  ProjectSettings,
  RoleTag,
  TimeZone,
  Uuid,
} from './common.ts';
import {
  AssignmentStatus,
  ClaimStatus,
  CriterionState,
  DependencyKind,
  IncidentOrigin,
  IncidentStatus,
  IncidentType,
  InventoryState,
  MemberPresence,
  MemberRole,
  MemberStatus,
  ProjectStatus,
  Readiness,
  RequestKind,
  RequestStatus,
  ResourceCondition,
  ResourceKind,
  Severity,
  SubmissionStatus,
  TaskOrigin,
  TaskRisk,
  TaskStatus,
} from './enums.ts';

// ---------- Project ----------

export const ProjectSummary = z.strictObject({
  id: Uuid,
  title: z.string(),
  status: ProjectStatus,
  venue_name: z.string().nullable(),
  starts_at: IsoDateTime,
  ends_at: IsoDateTime,
  timezone: TimeZone,
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;

export const ProjectView = ProjectSummary.extend({
  brief: z.string(),
  expected_team_size: z.number().int(),
  expected_attendees: z.number().int().nullable(),
  currency: CurrencyCode,
  state_version: z.number().int().nonnegative(),
  role_tags: z.array(RoleTag),
  /** Owner only (§9.4); null for participants. */
  settings: ProjectSettings.nullable(),
  owner_nickname: Nickname,
  closed_at: IsoDateTime.nullable(),
});
export type ProjectView = z.infer<typeof ProjectView>;

// ---------- Members ----------

export const MemberPublic = z.strictObject({
  id: Uuid,
  nickname: Nickname,
  role: MemberRole,
  role_tags: z.array(RoleTag),
  presence: MemberPresence,
  current_area_id: Uuid.nullable(),
});
export type MemberPublic = z.infer<typeof MemberPublic>;

export const MemberSelf = MemberPublic.extend({
  status: MemberStatus,
  availability: Availability,
  consent_at: IsoDateTime.nullable(),
  consent_version: z.string().nullable(),
  version: z.number().int().positive(),
});
export type MemberSelf = z.infer<typeof MemberSelf>;

/** A join request awaiting the owner's decision (owner only). */
export const MemberPending = z.strictObject({
  id: Uuid,
  nickname: Nickname,
  role_tags: z.array(RoleTag),
  availability: Availability,
  requested_at: IsoDateTime,
  version: z.number().int().positive(),
});
export type MemberPending = z.infer<typeof MemberPending>;

export const Invite = z.strictObject({
  code: z.string(),
  deep_link: z.string(),
  expires_at: IsoDateTime,
});
export type Invite = z.infer<typeof Invite>;

// ---------- Areas, resources ----------

export const Area = z.strictObject({
  id: Uuid,
  name: z.string(),
  notes: z.string().nullable(),
});
export type Area = z.infer<typeof Area>;

/** Claim label shown next to a projected value (FR-CLM-05). `null` = Unknown. */
export const ClaimLabel = z.strictObject({
  claim_id: Uuid,
  status: ClaimStatus,
  observed_at: IsoDateTime,
});
export type ClaimLabel = z.infer<typeof ClaimLabel>;

export const ResourceView = z.strictObject({
  id: Uuid,
  name: z.string(),
  category: z.string(),
  kind: ResourceKind,
  quantity: z.number().int().nullable(),
  inventory_state: InventoryState,
  condition: ResourceCondition,
  condition_claim: ClaimLabel.nullable(),
  area_id: Uuid.nullable(),
  location_claim: ClaimLabel.nullable(),
  custodian_member_id: Uuid.nullable(),
  notes: z.string().nullable(),
  version: z.number().int().positive(),
});
export type ResourceView = z.infer<typeof ResourceView>;

// ---------- Tasks ----------

export const CriterionView = z.strictObject({
  id: Uuid,
  position: z.number().int().nonnegative(),
  description: z.string(),
  critical: z.boolean(),
  photo_expected: z.boolean(),
  state: CriterionState,
});
export type CriterionView = z.infer<typeof CriterionView>;

export const TaskDependencyView = z.strictObject({ task_id: Uuid, kind: DependencyKind });

export const TaskNeedView = z.strictObject({
  resource_id: Uuid.nullable(),
  category: z.string().nullable(),
  hard: z.boolean(),
});

export const RiskReason = z.strictObject({
  incident_id: Uuid.nullable(),
  cause: z.string(),
  via_task_id: Uuid.nullable(),
});

export const TaskView = z.strictObject({
  id: Uuid,
  title: z.string(),
  description: z.string(),
  area_id: Uuid.nullable(),
  role_tag: RoleTag.nullable(),
  role_required: z.boolean(),
  start_at: IsoDateTime.nullable(),
  due_at: IsoDateTime,
  hard_deadline: z.boolean(),
  estimated_minutes: z.number().int().positive(),
  critical: z.boolean(),
  stipend_amount: z.number().int().nonnegative().nullable(),
  status: TaskStatus,
  risk: TaskRisk,
  risk_reasons: z.array(RiskReason),
  origin: TaskOrigin,
  criteria: z.array(CriterionView),
  /** Predecessors of this task. */
  depends_on: z.array(TaskDependencyView),
  needs: z.array(TaskNeedView),
  assignee_member_id: Uuid.nullable(),
  version: z.number().int().positive(),
});
export type TaskView = z.infer<typeof TaskView>;

export const AssignmentView = z.strictObject({
  id: Uuid,
  task_id: Uuid,
  member_id: Uuid,
  status: AssignmentStatus,
  respond_by: IsoDateTime,
  responded_at: IsoDateTime.nullable(),
  is_recovery: z.boolean(),
  version: z.number().int().positive(),
});
export type AssignmentView = z.infer<typeof AssignmentView>;

// ---------- Requests, submissions, incidents ----------

export const QuickReply = z.strictObject({ label: z.string(), claim_value: z.string() });

export const InformationRequestView = z.strictObject({
  id: Uuid,
  kind: RequestKind,
  incident_id: Uuid.nullable(),
  resource_id: Uuid.nullable(),
  question: z.string(),
  why_you: z.string().nullable(),
  quick_replies: z.array(QuickReply),
  allow_photo: z.boolean(),
  status: RequestStatus,
  expires_at: IsoDateTime,
  version: z.number().int().positive(),
});
export type InformationRequestView = z.infer<typeof InformationRequestView>;

export const SubmissionSummary = z.strictObject({
  id: Uuid,
  task_id: Uuid,
  status: SubmissionStatus,
  submitted_at: IsoDateTime,
  ai_check_available: z.boolean(),
});
export type SubmissionSummary = z.infer<typeof SubmissionSummary>;

/**
 * Incident row in the snapshot. Participants who are not involved get only
 * title + status + affected tasks (spec §3); the detail fields are then null.
 */
export const IncidentSummary = z.strictObject({
  id: Uuid,
  type: IncidentType,
  status: IncidentStatus,
  title: z.string(),
  affected_task_ids: z.array(Uuid),
  origin: IncidentOrigin.nullable(),
  severity: Severity.nullable(),
  readiness: Readiness.nullable(),
  safety: z.boolean().nullable(),
  revision: z.number().int().positive().nullable(),
  detected_at: IsoDateTime.nullable(),
});
export type IncidentSummary = z.infer<typeof IncidentSummary>;

// ---------- Attention queue (FR-FEED-01) ----------

export const AttentionGroup = z.enum([
  'ACT_NOW',
  'BLOCKED_AT_RISK',
  'NEEDS_VERIFICATION',
  'AWAITING_REVIEW',
  'FYI',
]);
export type AttentionGroup = z.infer<typeof AttentionGroup>;

/** Item kinds derived from the FR-FEED-01 bullet list. Naming is a contracts decision (spec-gaps.md). */
export const AttentionKind = z.enum([
  'INCIDENT_SUSPECTED',
  'INCIDENT_READY_FOR_APPROVAL',
  'INCIDENT_NO_VALID_OPTION',
  'INCIDENT_ESCALATED',
  'ACTION_FAILED',
  'INCIDENT_OPEN',
  'CRITICAL_TASK_UNASSIGNED',
  'INCIDENT_AWAITING_PROBE',
  'CLAIM_CONFLICTED',
  'RESOURCE_UNVERIFIED_NO_TARGET',
  'SUBMISSION_AWAITING_REVIEW',
  'JOIN_REQUEST',
  'RESOLUTION_SUGGESTION',
  'ADD_RESOURCE_SUGGESTION',
  'NEEDS_ASSIGNEE',
  'OFFER_DECLINED',
  'TASK_UNASSIGNED',
]);
export type AttentionKind = z.infer<typeof AttentionKind>;

export const AttentionItem = z.strictObject({
  id: z.string(),
  group: AttentionGroup,
  kind: AttentionKind,
  title: z.string(),
  why: z.string(),
  primary_action: z.string(),
  due_at: IsoDateTime.nullable(),
  target: NavTarget,
});
export type AttentionItem = z.infer<typeof AttentionItem>;

export const SnapshotCounters = z.strictObject({
  tasks_by_status: z.record(z.string(), z.number().int().nonnegative()),
  blocked: z.number().int().nonnegative(),
  at_risk: z.number().int().nonnegative(),
  open_incidents: z.number().int().nonnegative(),
  on_site: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
});
export type SnapshotCounters = z.infer<typeof SnapshotCounters>;

/** `GET /v1/projects/{pid}/snapshot` (spec §9.4). Owner-only arrays are empty for participants. */
export const Snapshot = z.strictObject({
  project: ProjectView,
  me: MemberSelf,
  members: z.array(MemberPublic),
  areas: z.array(Area),
  resources: z.array(ResourceView),
  tasks: z.array(TaskView),
  my_assignments: z.array(AssignmentView),
  my_requests: z.array(InformationRequestView),
  my_submissions: z.array(SubmissionSummary),
  incidents: z.array(IncidentSummary),
  invite: Invite.nullable(),
  pending_members: z.array(MemberPending),
  attention: z.array(AttentionItem),
  counters: SnapshotCounters,
});
export type Snapshot = z.infer<typeof Snapshot>;
