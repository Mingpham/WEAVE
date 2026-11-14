import type { PlanComposeOutput } from '../../../packages/contracts/src/ai/index.ts';
import type { AnalysisJob } from '../../../packages/contracts/src/ai/jobs.ts';
import { draft } from '../../../packages/engine/tests/draft-fixtures.ts';
import { id } from '../../../packages/engine/tests/eligibility-fixtures.ts';

export function planContext() {
  return {
    project: {
      id: id(1),
      title: 'Community workshop',
      brief: 'Arrange a hands-on craft workshop with a small volunteer team.',
      venue_name: 'Community room',
      starts_at: '2026-11-14T10:00:00Z',
      ends_at: '2026-11-14T12:00:00Z',
      expected_team_size: 5,
      expected_attendees: 20,
      role_tags: ['setup'],
      status: 'DRAFT' as const,
    },
    draft_id: id(80),
    revision: 1,
    ai_turns_used: 0,
    mode: 'REVISE' as 'DRAFT' | 'REVISE' | 'FINALIZE',
    draft: draft(),
    messages: [{ role: 'ORGANIZER' as const, text: 'Please update the plan.' }],
  };
}
export function planOutput(): PlanComposeOutput {
  return {
    reply: 'The draft is ready for review.',
    areas: [{ key: 'hall', name: 'Main hall', notes: null }],
    role_tags: ['setup'],
    tasks: [
      {
        key: 'setup',
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
        criteria: [{ description: 'Tables are stable', critical: true, photo_expected: true }],
        depends_on: [],
        needs: [],
      },
    ],
    resources: [
      {
        key: 'tables',
        name: 'Folding tables',
        category: 'furniture',
        kind: 'ITEM',
        quantity: null,
        area_key: 'hall',
        reason: '',
      },
    ],
    questions: [],
    assumptions: [],
    change_summary: { added: [], changed: [], removed: [] },
  };
}
export function planJob(): AnalysisJob {
  return {
    id: id(90),
    project_id: id(1),
    subject_id: id(80),
    type: 'PLAN_COMPOSE',
    basis_revision: 1,
    status: 'QUEUED',
    attempts: 0,
    error_code: null,
    created_at: '2026-11-14T09:00:00Z',
    queued_at: '2026-11-14T09:00:00Z',
    started_at: null,
    finished_at: null,
  };
}
