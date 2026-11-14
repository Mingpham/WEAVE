import type { DraftValidationInput, EligibilityInput, EligibilityMember, EligibilityAssignment, PresenceClaim } from '../src/index.ts';

type Assert<T extends true> = T;
type Without<T, K extends keyof T> = Omit<T, K>;
export type NoCredential = Assert<'user_id' extends keyof EligibilityMember ? false : true>;
export type NeedsAvailability = Assert<Without<EligibilityMember, 'availability'> extends EligibilityMember ? false : true>;
export type NeedsStatus = Assert<Without<EligibilityMember, 'status'> extends EligibilityMember ? false : true>;
export type NeedsHistory = Assert<Without<EligibilityInput, 'assignments'> extends EligibilityInput ? false : true>;
export type NeedsFreshness = Assert<Without<PresenceClaim, 'valid_until'> extends PresenceClaim ? false : true>;
export type KeepsDeclined = Assert<'DECLINED' extends EligibilityAssignment['status'] ? true : false>;
export type KeepsReleased = Assert<'RELEASED' extends EligibilityAssignment['status'] ? true : false>;

// Compile-only examples: the engine must not mutate its caller's snapshot or nested draft.
export function readonlyConsumers(input: EligibilityInput, draft: DraftValidationInput) {
  const member = input.members[0]!;
  // @ts-expect-error Snapshot arrays must not permit mutation.
  input.members.push(member);
  // @ts-expect-error Role tags are nested readonly arrays.
  member.role_tags.push('crew');
  if ('windows' in member.availability) {
    // @ts-expect-error Availability windows are nested readonly records.
    member.availability.windows[0]!.from = '2026-11-14T00:00:00Z';
  }
  // @ts-expect-error Engine receives time; it cannot rewrite supplied time.
  input.now = '2026-11-14T00:00:00Z';
  // @ts-expect-error Draft criteria cannot be modified by validation.
  draft.draft.tasks[0]!.criteria[0]!.critical = false;
  // @ts-expect-error Caller must supply revision-relevant historical assignments.
  const missingHistory: EligibilityInput = { project_id: input.project_id, now: input.now, members: [], tasks: [], presence_claims: [] };
  return missingHistory;
}
