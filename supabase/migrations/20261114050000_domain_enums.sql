-- WP-0-DB: canonical domain types, specification v0.3 §7.2.
-- Dependency: packages/contracts canonical enum commit (Mingpham review required).
-- No tables, RLS policies, RPCs or business inference are introduced here.

create type public.project_status as enum (
  'DRAFT',
  'ACTIVE',
  'CLOSED'
);

create type public.member_role as enum (
  'OWNER',
  'PARTICIPANT'
);

create type public.member_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REMOVED',
  'LEFT'
);

create type public.member_presence as enum (
  'NOT_ARRIVED',
  'ON_SITE',
  'UNAVAILABLE'
);

create type public.resource_kind as enum (
  'ITEM',
  'SUPPLY'
);

create type public.inventory_state as enum (
  'CONFIRMED',
  'REPORTED',
  'UNVERIFIED',
  'TO_ACQUIRE'
);

create type public.resource_condition as enum (
  'OK',
  'FAILED',
  'MISSING',
  'LOW',
  'UNKNOWN'
);

create type public.task_status as enum (
  'OPEN',
  'OFFERED',
  'ACCEPTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'DEFERRED',
  'CANCELLED'
);

create type public.task_risk as enum (
  'NONE',
  'AT_RISK',
  'BLOCKED'
);

create type public.task_origin as enum (
  'PLAN',
  'MANUAL',
  'RECOVERY'
);

create type public.dependency_kind as enum (
  'HARD',
  'SOFT'
);

create type public.criterion_state as enum (
  'PENDING',
  'MET',
  'NOT_MET'
);

create type public.assignment_status as enum (
  'OFFERED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'RELEASED',
  'COMPLETED'
);

create type public.observation_kind as enum (
  'TASK_SUBMISSION',
  'PROGRESS_NOTE',
  'INCIDENT_REPORT',
  'RESOURCE_REPORT',
  'GENERAL_NOTE',
  'PROBE_RESPONSE',
  'RESOLUTION_CONFIRMATION'
);

create type public.analysis_status as enum (
  'PENDING',
  'DONE',
  'FAILED',
  'SKIPPED'
);

create type public.media_status as enum (
  'PENDING',
  'READY',
  'DELETED'
);

create type public.submission_status as enum (
  'AWAITING_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SUPERSEDED'
);

create type public.assessment_verdict as enum (
  'SUPPORTED',
  'INSUFFICIENT',
  'CONFLICTED',
  'NOT_ASSESSED'
);

create type public.claim_subject as enum (
  'RESOURCE',
  'MEMBER',
  'TASK',
  'AREA',
  'PROJECT'
);

create type public.claim_status as enum (
  'REPORTED',
  'SUPPORTED',
  'CONFLICTED',
  'SUPERSEDED',
  'STALE',
  'CONFIRMED',
  'REJECTED'
);

create type public.claim_source as enum (
  'AI_EXTRACTED',
  'STRUCTURED',
  'OWNER'
);

create type public.evidence_relation as enum (
  'SUPPORTS',
  'CONTRADICTS'
);

create type public.incident_type as enum (
  'MEMBER_UNAVAILABLE',
  'RESOURCE_PROBLEM',
  'TASK_DELAYED',
  'HANDOFF_FAILED',
  'CONFLICTING_INFO',
  'PLAN_CHANGE',
  'OTHER'
);

create type public.incident_origin as enum (
  'PARTICIPANT_REPORT',
  'AI_INFERRED',
  'ORGANIZER_CREATED',
  'SYSTEM_RULE'
);

create type public.incident_status as enum (
  'SUSPECTED',
  'OPEN',
  'RECOVERING',
  'RESOLVED',
  'DISMISSED'
);

create type public.readiness as enum (
  'ASSESSING',
  'NEEDS_VERIFICATION',
  'READY_FOR_APPROVAL',
  'NO_VALID_OPTION',
  'ESCALATE_TO_HUMAN'
);

create type public.severity as enum (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

create type public.link_entity as enum (
  'TASK',
  'RESOURCE',
  'MEMBER',
  'AREA',
  'OBSERVATION',
  'CLAIM_SLOT'
);

create type public.link_role as enum (
  'TRIGGER',
  'AFFECTED',
  'CONTEXT',
  'CANDIDATE',
  'EVIDENCE'
);

create type public.unknown_status as enum (
  'OPEN',
  'ANSWERED',
  'UNANSWERABLE',
  'DROPPED'
);

create type public.request_kind as enum (
  'FACT_CHECK',
  'RESOURCE_CHECK',
  'RESOLUTION_CHECK'
);

create type public.request_status as enum (
  'PENDING',
  'ANSWERED',
  'CANNOT_CHECK',
  'DECLINED',
  'EXPIRED',
  'CANCELLED'
);

create type public.request_source as enum (
  'AI',
  'TEMPLATE',
  'OWNER'
);

create type public.proposal_source as enum (
  'ENGINE',
  'MANUAL'
);

create type public.proposal_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'STALE',
  'SUPERSEDED'
);

create type public.option_validity as enum (
  'VALID',
  'PENDING_VERIFICATION',
  'INVALID'
);

create type public.condition_result as enum (
  'TRUE',
  'FALSE',
  'UNKNOWN'
);

create type public.action_type as enum (
  'REASSIGN_TASK',
  'SWAP_RESOURCE',
  'RESCHEDULE_TASK',
  'DEFER_TASK',
  'ADD_TASK'
);

create type public.action_status as enum (
  'PENDING',
  'IN_PROGRESS',
  'DONE',
  'FAILED',
  'CANCELLED'
);

create type public.draft_status as enum (
  'EDITING',
  'COMPOSING',
  'PUBLISHED'
);

create type public.ledger_status as enum (
  'PENDING',
  'PAID_OUTSIDE',
  'VOID'
);

create type public.job_type as enum (
  'PLAN_COMPOSE',
  'OBSERVATION_ANALYZE',
  'INCIDENT_ASSESS',
  'EVENT_SUMMARIZE'
);

create type public.job_status as enum (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'DISCARDED_STALE',
  'DEAD'
);

create type public.inference_outcome as enum (
  'OK',
  'SCHEMA_INVALID',
  'ID_NOT_ALLOWED',
  'POLICY_REJECTED',
  'TIMEOUT',
  'HTTP_ERROR',
  'STALE_DISCARDED'
);

create type public.actor_kind as enum (
  'MEMBER',
  'SYSTEM',
  'AI_WORKER'
);

create type public.log_visibility as enum (
  'ALL',
  'OWNER',
  'INVOLVED'
);

create type public.push_status as enum (
  'PENDING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

create type public.suggestion_kind as enum (
  'ADD_RESOURCE',
  'RESOLVE_INCIDENT'
);

create type public.suggestion_status as enum (
  'PENDING',
  'ACCEPTED',
  'DISMISSED'
);
