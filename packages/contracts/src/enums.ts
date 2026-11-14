/**
 * Every enum from spec §7.2. Names and values MUST match the Postgres enums / CHECK
 * constraints exactly (spec §7.1). Changing a value here requires a matching migration.
 */
import { z } from 'zod';

export const ProjectStatus = z.enum(['DRAFT', 'ACTIVE', 'CLOSED']);
export const MemberRole = z.enum(['OWNER', 'PARTICIPANT']);
export const MemberStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'LEFT']);
export const MemberPresence = z.enum(['NOT_ARRIVED', 'ON_SITE', 'UNAVAILABLE']);
export const ResourceKind = z.enum(['ITEM', 'SUPPLY']);
export const InventoryState = z.enum(['CONFIRMED', 'REPORTED', 'UNVERIFIED', 'TO_ACQUIRE']);
export const ResourceCondition = z.enum(['OK', 'FAILED', 'MISSING', 'LOW', 'UNKNOWN']);
export const TaskStatus = z.enum([
  'OPEN',
  'OFFERED',
  'ACCEPTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'DEFERRED',
  'CANCELLED',
]);
export const TaskRisk = z.enum(['NONE', 'AT_RISK', 'BLOCKED']);
export const TaskOrigin = z.enum(['PLAN', 'MANUAL', 'RECOVERY']);
export const DependencyKind = z.enum(['HARD', 'SOFT']);
export const CriterionState = z.enum(['PENDING', 'MET', 'NOT_MET']);
export const AssignmentStatus = z.enum([
  'OFFERED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'RELEASED',
  'COMPLETED',
]);
export const ObservationKind = z.enum([
  'TASK_SUBMISSION',
  'PROGRESS_NOTE',
  'INCIDENT_REPORT',
  'RESOURCE_REPORT',
  'GENERAL_NOTE',
  'PROBE_RESPONSE',
  'RESOLUTION_CONFIRMATION',
]);
export const AnalysisStatus = z.enum(['PENDING', 'DONE', 'FAILED', 'SKIPPED']);
export const MediaStatus = z.enum(['PENDING', 'READY', 'DELETED']);
export const SubmissionStatus = z.enum([
  'AWAITING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SUPERSEDED',
]);
export const AssessmentVerdict = z.enum([
  'SUPPORTED',
  'INSUFFICIENT',
  'CONFLICTED',
  'NOT_ASSESSED',
]);
export const ClaimSubject = z.enum(['RESOURCE', 'MEMBER', 'TASK', 'AREA', 'PROJECT']);
export const ClaimStatus = z.enum([
  'REPORTED',
  'SUPPORTED',
  'CONFLICTED',
  'SUPERSEDED',
  'STALE',
  'CONFIRMED',
  'REJECTED',
]);
export const ClaimSource = z.enum(['AI_EXTRACTED', 'STRUCTURED', 'OWNER']);
export const EvidenceRelation = z.enum(['SUPPORTS', 'CONTRADICTS']);
export const IncidentType = z.enum([
  'MEMBER_UNAVAILABLE',
  'RESOURCE_PROBLEM',
  'TASK_DELAYED',
  'HANDOFF_FAILED',
  'CONFLICTING_INFO',
  'PLAN_CHANGE',
  'OTHER',
]);
export const IncidentOrigin = z.enum([
  'PARTICIPANT_REPORT',
  'AI_INFERRED',
  'ORGANIZER_CREATED',
  'SYSTEM_RULE',
]);
export const IncidentStatus = z.enum(['SUSPECTED', 'OPEN', 'RECOVERING', 'RESOLVED', 'DISMISSED']);
export const Readiness = z.enum([
  'ASSESSING',
  'NEEDS_VERIFICATION',
  'READY_FOR_APPROVAL',
  'NO_VALID_OPTION',
  'ESCALATE_TO_HUMAN',
]);
export const Severity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const LinkEntity = z.enum([
  'TASK',
  'RESOURCE',
  'MEMBER',
  'AREA',
  'OBSERVATION',
  'CLAIM_SLOT',
]);
export const LinkRole = z.enum(['TRIGGER', 'AFFECTED', 'CONTEXT', 'CANDIDATE', 'EVIDENCE']);
export const UnknownStatus = z.enum(['OPEN', 'ANSWERED', 'UNANSWERABLE', 'DROPPED']);
export const RequestKind = z.enum(['FACT_CHECK', 'RESOURCE_CHECK', 'RESOLUTION_CHECK']);
export const RequestStatus = z.enum([
  'PENDING',
  'ANSWERED',
  'CANNOT_CHECK',
  'DECLINED',
  'EXPIRED',
  'CANCELLED',
]);
export const RequestSource = z.enum(['AI', 'TEMPLATE', 'OWNER']);
export const ProposalSource = z.enum(['ENGINE', 'MANUAL']);
export const ProposalStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'STALE', 'SUPERSEDED']);
export const OptionValidity = z.enum(['VALID', 'PENDING_VERIFICATION', 'INVALID']);
export const ConditionResult = z.enum(['TRUE', 'FALSE', 'UNKNOWN']);
export const ActionType = z.enum([
  'REASSIGN_TASK',
  'SWAP_RESOURCE',
  'RESCHEDULE_TASK',
  'DEFER_TASK',
  'ADD_TASK',
]);
export const ActionStatus = z.enum(['PENDING', 'IN_PROGRESS', 'DONE', 'FAILED', 'CANCELLED']);
export const DraftStatus = z.enum(['EDITING', 'COMPOSING', 'PUBLISHED']);
export const LedgerStatus = z.enum(['PENDING', 'PAID_OUTSIDE', 'VOID']);
export const JobType = z.enum([
  'PLAN_COMPOSE',
  'OBSERVATION_ANALYZE',
  'INCIDENT_ASSESS',
  'EVENT_SUMMARIZE',
]);
export const JobStatus = z.enum([
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'DISCARDED_STALE',
  'DEAD',
]);
export const InferenceOutcome = z.enum([
  'OK',
  'SCHEMA_INVALID',
  'ID_NOT_ALLOWED',
  'POLICY_REJECTED',
  'TIMEOUT',
  'HTTP_ERROR',
  'STALE_DISCARDED',
]);
export const ActorKind = z.enum(['MEMBER', 'SYSTEM', 'AI_WORKER']);
export const LogVisibility = z.enum(['ALL', 'OWNER', 'INVOLVED']);
export const PushStatus = z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']);
export const SuggestionKind = z.enum(['ADD_RESOURCE', 'RESOLVE_INCIDENT']);
export const SuggestionStatus = z.enum(['PENDING', 'ACCEPTED', 'DISMISSED']);

/**
 * Text enums that live in table columns rather than §7.2 (spec §7.3).
 * plan_messages.role, incident_unknowns.source.
 */
export const PlanMessageRole = z.enum(['ORGANIZER', 'AI', 'SYSTEM']);
export const UnknownSource = z.enum(['PRECONDITION', 'AI']);

/** Every §7.2 enum, keyed by its Postgres type name. Used by the DB-sync test (spec §7.1). */
export const DB_ENUMS = {
  project_status: ProjectStatus,
  member_role: MemberRole,
  member_status: MemberStatus,
  member_presence: MemberPresence,
  resource_kind: ResourceKind,
  inventory_state: InventoryState,
  resource_condition: ResourceCondition,
  task_status: TaskStatus,
  task_risk: TaskRisk,
  task_origin: TaskOrigin,
  dependency_kind: DependencyKind,
  criterion_state: CriterionState,
  assignment_status: AssignmentStatus,
  observation_kind: ObservationKind,
  analysis_status: AnalysisStatus,
  media_status: MediaStatus,
  submission_status: SubmissionStatus,
  assessment_verdict: AssessmentVerdict,
  claim_subject: ClaimSubject,
  claim_status: ClaimStatus,
  claim_source: ClaimSource,
  evidence_relation: EvidenceRelation,
  incident_type: IncidentType,
  incident_origin: IncidentOrigin,
  incident_status: IncidentStatus,
  readiness: Readiness,
  severity: Severity,
  link_entity: LinkEntity,
  link_role: LinkRole,
  unknown_status: UnknownStatus,
  request_kind: RequestKind,
  request_status: RequestStatus,
  request_source: RequestSource,
  proposal_source: ProposalSource,
  proposal_status: ProposalStatus,
  option_validity: OptionValidity,
  condition_result: ConditionResult,
  action_type: ActionType,
  action_status: ActionStatus,
  draft_status: DraftStatus,
  ledger_status: LedgerStatus,
  job_type: JobType,
  job_status: JobStatus,
  inference_outcome: InferenceOutcome,
  actor_kind: ActorKind,
  log_visibility: LogVisibility,
  push_status: PushStatus,
  suggestion_kind: SuggestionKind,
  suggestion_status: SuggestionStatus,
} as const;

export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type MemberRole = z.infer<typeof MemberRole>;
export type MemberStatus = z.infer<typeof MemberStatus>;
export type MemberPresence = z.infer<typeof MemberPresence>;
export type ResourceKind = z.infer<typeof ResourceKind>;
export type InventoryState = z.infer<typeof InventoryState>;
export type ResourceCondition = z.infer<typeof ResourceCondition>;
export type TaskStatus = z.infer<typeof TaskStatus>;
export type TaskRisk = z.infer<typeof TaskRisk>;
export type TaskOrigin = z.infer<typeof TaskOrigin>;
export type DependencyKind = z.infer<typeof DependencyKind>;
export type CriterionState = z.infer<typeof CriterionState>;
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;
export type ObservationKind = z.infer<typeof ObservationKind>;
export type AnalysisStatus = z.infer<typeof AnalysisStatus>;
export type MediaStatus = z.infer<typeof MediaStatus>;
export type SubmissionStatus = z.infer<typeof SubmissionStatus>;
export type AssessmentVerdict = z.infer<typeof AssessmentVerdict>;
export type ClaimSubject = z.infer<typeof ClaimSubject>;
export type ClaimStatus = z.infer<typeof ClaimStatus>;
export type ClaimSource = z.infer<typeof ClaimSource>;
export type EvidenceRelation = z.infer<typeof EvidenceRelation>;
export type IncidentType = z.infer<typeof IncidentType>;
export type IncidentOrigin = z.infer<typeof IncidentOrigin>;
export type IncidentStatus = z.infer<typeof IncidentStatus>;
export type Readiness = z.infer<typeof Readiness>;
export type Severity = z.infer<typeof Severity>;
export type LinkEntity = z.infer<typeof LinkEntity>;
export type LinkRole = z.infer<typeof LinkRole>;
export type UnknownStatus = z.infer<typeof UnknownStatus>;
export type RequestKind = z.infer<typeof RequestKind>;
export type RequestStatus = z.infer<typeof RequestStatus>;
export type RequestSource = z.infer<typeof RequestSource>;
export type ProposalSource = z.infer<typeof ProposalSource>;
export type ProposalStatus = z.infer<typeof ProposalStatus>;
export type OptionValidity = z.infer<typeof OptionValidity>;
export type ConditionResult = z.infer<typeof ConditionResult>;
export type ActionType = z.infer<typeof ActionType>;
export type ActionStatus = z.infer<typeof ActionStatus>;
export type DraftStatus = z.infer<typeof DraftStatus>;
export type LedgerStatus = z.infer<typeof LedgerStatus>;
export type JobType = z.infer<typeof JobType>;
export type JobStatus = z.infer<typeof JobStatus>;
export type InferenceOutcome = z.infer<typeof InferenceOutcome>;
export type ActorKind = z.infer<typeof ActorKind>;
export type LogVisibility = z.infer<typeof LogVisibility>;
export type PushStatus = z.infer<typeof PushStatus>;
export type SuggestionKind = z.infer<typeof SuggestionKind>;
export type SuggestionStatus = z.infer<typeof SuggestionStatus>;
export type PlanMessageRole = z.infer<typeof PlanMessageRole>;
export type UnknownSource = z.infer<typeof UnknownSource>;

/** Legacy tuple consumers share the canonical Zod enums; values are never declared twice. */
export const ENUMS = Object.freeze(
  Object.fromEntries(Object.entries(DB_ENUMS).map(([name, schema]) => [name, Object.freeze([...schema.options])])),
) as { readonly [Name in keyof typeof DB_ENUMS]: readonly z.infer<(typeof DB_ENUMS)[Name]>[] };
export type DomainEnumName = keyof typeof DB_ENUMS;
export type DomainEnumValue<Name extends DomainEnumName> = z.infer<(typeof DB_ENUMS)[Name]>;
