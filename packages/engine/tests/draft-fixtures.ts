import type { DraftArea, DraftResource, DraftTask, PlanDraft } from '../../contracts/src/plan.ts';
import type { DraftValidationInput } from '../src/inputs.ts';
import { id } from './eligibility-fixtures.ts';

export const area = (patch: Partial<DraftArea> = {}): DraftArea => ({
  key: 'hall',
  origin: 'HUMAN',
  locked: false,
  name: 'Main hall',
  notes: null,
  ...patch,
});
export const draftTask = (patch: Partial<DraftTask> = {}): DraftTask => ({
  key: 'setup',
  origin: 'HUMAN',
  locked: false,
  title: 'Arrange tables',
  description: '',
  area_key: 'hall',
  role_tag: 'setup',
  role_required: true,
  start_offset_min: null,
  due_offset_min: 30,
  hard_deadline: false,
  estimated_minutes: 30,
  critical: false,
  stipend_amount: null,
  criteria: [{ description: 'Tables are stable', critical: true, photo_expected: true }],
  depends_on: [],
  needs: [],
  ...patch,
});
export const resource = (patch: Partial<DraftResource> = {}): DraftResource => ({
  key: 'tables',
  origin: 'HUMAN',
  locked: false,
  name: 'Folding tables',
  category: 'furniture',
  kind: 'ITEM',
  quantity: null,
  inventory_state: 'CONFIRMED',
  area_key: 'hall',
  custodian_member_id: null,
  reason: '',
  ...patch,
});
export const draft = (patch: Partial<PlanDraft> = {}): PlanDraft => ({
  areas: [area()],
  role_tags: ['setup'],
  tasks: [draftTask()],
  resources: [resource()],
  questions: [],
  assumptions: [],
  gaps: [],
  ...patch,
});
export const draftInput = (value = draft()): DraftValidationInput => ({
  project: {
    id: id(1),
    starts_at: '2026-11-14T10:00:00Z',
    ends_at: '2026-11-14T12:00:00Z',
    role_tags: [],
  },
  draft: value,
});
