import type {
  AssignmentView,
  ClaimStatus,
  IsoDateTime,
  MemberPresence,
  MemberSelf,
  PlanDraft,
  ProjectView,
  TaskView,
  Uuid,
} from '../../contracts/src/index.ts';

/** Data-only projections: no runtime imports, IO, clock, or inferred missing values. */
export type DeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
  : T;
type Scoped<T> = T & { project_id: Uuid };

export type EligibilityMember = DeepReadonly<
  Scoped<
    Pick<
      MemberSelf,
      | 'id'
      | 'nickname'
      | 'role'
      | 'status'
      | 'role_tags'
      | 'availability'
      | 'presence'
      | 'current_area_id'
    >
  >
>;
export type EligibilityTask = DeepReadonly<
  Scoped<
    Pick<
      TaskView,
      | 'id'
      | 'area_id'
      | 'role_tag'
      | 'role_required'
      | 'start_at'
      | 'due_at'
      | 'estimated_minutes'
      | 'critical'
      | 'status'
    >
  >
>;
/** Includes historical DECLINED/RELEASED records, not only active/my assignments. */
export type EligibilityAssignment = DeepReadonly<
  Scoped<Pick<AssignmentView, 'id' | 'task_id' | 'member_id' | 'status'>>
>;
/** §7.3 claims projection for §11.3 MEMBER_PRESENT; freshness is computed by the engine. */
export type PresenceClaim = Readonly<
  Scoped<{
    id: Uuid;
    subject_type: 'MEMBER';
    subject_id: Uuid;
    key: 'member.presence';
    value: MemberPresence;
    status: ClaimStatus;
    observed_at: IsoDateTime;
    valid_until: IsoDateTime | null;
  }>
>;

/** Server-only input. The future snapshot builder must validate scope and completeness. */
export type EligibilityInput = Readonly<{
  project_id: Uuid;
  now: IsoDateTime;
  members: readonly EligibilityMember[];
  tasks: readonly EligibilityTask[];
  assignments: readonly EligibilityAssignment[];
  presence_claims: readonly PresenceClaim[];
}>;
export type DraftValidationInput = DeepReadonly<{
  project: Pick<ProjectView, 'id' | 'starts_at' | 'ends_at' | 'role_tags'>;
  draft: PlanDraft;
}>;
