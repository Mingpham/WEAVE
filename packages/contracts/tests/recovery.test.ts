import { expect, it } from 'vitest';
import { ActionSchema, ActionDraftSchema, ConditionCheckSchema, ProposalOptionSchema } from '../src/recovery.ts';

const id = '00000000-0000-4000-8000-000000000001';
it('FR-REC-01 accepts the five action variants with canonical UUIDs', () => {
  const actions = [
    { type: 'REASSIGN_TASK', task_id: id, to_member_id: id },
    { type: 'SWAP_RESOURCE', for_task_id: id, for_area_id: null, from_resource_id: null, to_resource_id: id, carrier_member_id: null },
    { type: 'RESCHEDULE_TASK', task_id: id, new_start_at: null, new_due_at: '2026-11-14T12:00:00Z' },
    { type: 'DEFER_TASK', task_id: id },
    { type: 'ADD_TASK', title: 'Set up a table', description: '', criteria: ['Table is stable'], area_id: null, due_at: '2026-11-14T12:00:00Z', assignee_member_id: id },
  ];
  for (const action of actions) expect(ActionSchema.parse(action)).toEqual(action);
  expect(ActionSchema.safeParse({ type: 'APPROVE_TASK', task_id: id }).success).toBe(false);
});
it('INV-03 separates model aliases from persistent identifiers', () => {
  const draft = { type: 'REASSIGN_TASK', task_id: 'T1', to_member_id: 'M2' };
  expect(ActionDraftSchema.safeParse(draft).success).toBe(true);
  expect(ActionSchema.safeParse(draft).success).toBe(false);
  expect(ActionDraftSchema.safeParse({ ...draft, to_member_id: 'T2' }).success).toBe(false);
});
it('FR-REC-03 rejects invalid stored options and malformed condition results', () => {
  const check = { action_index: null, code: 'ACTION_COUNT', result: 'TRUE', message: 'One action', claim_ids: [], unknown_id: null };
  expect(ConditionCheckSchema.parse(check)).toEqual(check);
  expect(ConditionCheckSchema.safeParse({ ...check, result: 'MAYBE' }).success).toBe(false);
  const option = { id: 'code_1', source: 'CODE', actions: [{ type: 'DEFER_TASK', task_id: id }], description: 'Postpone a task', validity: 'VALID', checks: [check], effects: { unblocks_task_ids: [], adds_risk_task_ids: [], moves_member_ids: [], moves_resource_ids: [] }, rank: null, recommended: false, tradeoffs: [], assumptions: [], evidence_claim_ids: [] };
  expect(ProposalOptionSchema.parse(option)).toEqual(option);
  expect(ProposalOptionSchema.safeParse({ ...option, validity: 'INVALID' }).success).toBe(false);
});
