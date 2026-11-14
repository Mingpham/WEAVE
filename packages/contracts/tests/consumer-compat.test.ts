import { expect, it } from 'vitest';
import * as contracts from '../src/index.ts';
import { ActionDraftSchema } from '../src/recovery.ts';

const id = '00000000-0000-4000-8000-000000000001';
const option = {
  id: 'code_1',
  source: 'CODE',
  actions: [{ type: 'DEFER_TASK', task_id: id }],
  description: 'Postpone a task',
  validity: 'VALID',
  checks: [],
  effects: {
    unblocks_task_ids: [],
    adds_risk_task_ids: [],
    moves_member_ids: [],
    moves_resource_ids: [],
  },
  rank: null,
  recommended: false,
  tradeoffs: [],
  assumptions: [],
  evidence_claim_ids: [],
};

it('API and AI consumers parse Recovery through their existing package exports', () => {
  const action = { type: 'DEFER_TASK', task_id: id };
  expect(contracts.Action.parse(action)).toEqual(contracts.ActionSchema.parse(action));
  const check = {
    action_index: null,
    code: 'ACTION_COUNT',
    result: 'TRUE',
    message: 'One action',
    claim_ids: [],
    unknown_id: null,
  };
  expect(contracts.ConditionCheck.parse(check)).toEqual(
    contracts.ConditionCheckSchema.parse(check),
  );
  expect(contracts.ProposalOption.parse(option)).toEqual(
    contracts.ProposalOptionSchema.parse(option),
  );
  expect(contracts.PlanDraft.parse(contracts.EMPTY_PLAN_DRAFT).tasks).toEqual([]);
});
it('accepts API input time offsets while model ActionDraft keeps its UTC contract', () => {
  const timestamp = '2026-11-14T12:00:00+07:00';
  expect(
    contracts.Action.safeParse({
      type: 'RESCHEDULE_TASK',
      task_id: id,
      new_start_at: null,
      new_due_at: timestamp,
    }).success,
  ).toBe(true);
  expect(
    ActionDraftSchema.safeParse({
      type: 'RESCHEDULE_TASK',
      task_id: 'T1',
      new_start_at: null,
      new_due_at: timestamp,
    }).success,
  ).toBe(false);
});
it('keeps API ranking one-based and refuses self-authorized validity', () => {
  expect(contracts.ProposalOption.safeParse({ ...option, rank: 1 }).success).toBe(true);
  for (const rank of [0, -1, 1.5])
    expect(contracts.ProposalOption.safeParse({ ...option, rank }).success).toBe(false);
  expect(contracts.ProposalOption.safeParse({ ...option, validity: 'INVALID' }).success).toBe(
    false,
  );
});
it('preserves recovery ADD_TASK limits instead of widening to ordinary task limits', () => {
  const action = {
    type: 'ADD_TASK',
    title: 'Set up tables',
    description: 'x'.repeat(500),
    criteria: ['Tables stable'],
    area_id: null,
    due_at: '2026-11-14T12:00:00Z',
    assignee_member_id: id,
  };
  expect(contracts.Action.safeParse(action).success).toBe(true);
  expect(contracts.Action.safeParse({ ...action, description: 'x'.repeat(501) }).success).toBe(
    false,
  );
  expect(contracts.Action.safeParse({ ...action, criteria: Array(5).fill('Stable') }).success).toBe(
    false,
  );
  expect(contracts.Action.safeParse({ ...action, approved: true }).success).toBe(false);
});
