import { describe, expect, it } from 'vitest';
import { CreateProjectRequest, CreateProjectResponse } from '../src/create-project.ts';
const input = {
  title: 'Event',
  brief: 'x'.repeat(40),
  starts_at: '2026-11-14T00:00:00Z',
  ends_at: '2026-11-15T00:00:00Z',
  timezone: 'UTC',
  expected_team_size: 5,
};
describe('FR-EVT-01 create project contract', () => {
  it('accepts valid input and defaults currency', () =>
    expect(CreateProjectRequest.parse(input).currency).toBe('VND'));
  it('rejects authority fields and invalid ranges', () => {
    for (const patch of [
      { user_id: 'x' },
      { expected_team_size: 51 },
      { timezone: 'not/a-zone' },
      { ends_at: input.starts_at },
      { ends_at: '2026-11-18T00:00:00Z' },
    ]) {
      expect(CreateProjectRequest.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
  it('validates the creation envelope', () =>
    expect(
      CreateProjectResponse.safeParse({
        data: { project_id: 'x', owner_member_id: 'x', plan_draft_id: 'x' },
        meta: { state_version: 1 },
      }).success,
    ).toBe(false));
});
