import { describe, it, expect } from 'vitest';
import { EMPTY_PLAN_DRAFT, type PlanDraft } from '../contracts.ts';
import { applyPlanOperations } from './planning.ts';
describe('real manual planning operations', () => {
  it('protects manually edited items and creates acquisition preparation', () => {
    const d = applyPlanOperations(EMPTY_PLAN_DRAFT, [
      {
        op: 'UPSERT',
        collection: 'resources',
        key: 'speaker',
        value: {
          key: 'speaker',
          origin: 'AI',
          locked: false,
          name: 'Speaker',
          category: 'audio',
          kind: 'ITEM',
          quantity: null,
          inventory_state: 'TO_ACQUIRE',
          area_key: null,
          custodian_member_id: null,
          reason: 'Announcements',
        },
      },
    ]);
    expect(d.resources[0]).toMatchObject({ origin: 'HUMAN', locked: true });
    expect(d.tasks[0]?.title).toBe('Acquire Speaker');
    expect(EMPTY_PLAN_DRAFT.tasks).toEqual([]);
  });
  it('removes resource requirements when deleting an unwanted resource', () => {
    const d = applyPlanOperations(EMPTY_PLAN_DRAFT, [
      {
        op: 'UPSERT',
        collection: 'resources',
        key: 'speaker',
        value: {
          key: 'speaker',
          origin: 'AI',
          locked: false,
          name: 'Speaker',
          category: 'audio',
          kind: 'ITEM',
          quantity: null,
          inventory_state: 'TO_ACQUIRE',
          area_key: null,
          custodian_member_id: null,
          reason: 'Announcements',
        },
      },
    ]);
    d.tasks[0]!.needs = [{ resource_key: 'speaker', category: null, hard: true }];
    const next = applyPlanOperations(d as PlanDraft, [
      { op: 'DELETE', collection: 'resources', key: 'speaker' },
    ]);
    expect(next.tasks[0]!.needs).toEqual([]);
    expect(d.tasks[0]!.needs).toHaveLength(1);
  });
});
