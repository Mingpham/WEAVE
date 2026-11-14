/**
 * Shape of the mock's seed data. Built from the contracts' own schemas so a fixture that
 * drifts from `packages/contracts` fails validation in CI (spec §15.5).
 */
import { z } from 'zod';
import {
  Area,
  AssignmentView,
  IncidentSummary,
  IsoDateTime,
  MemberSelf,
  ProjectSettings,
  ProjectView,
  ResourceView,
  TaskView,
  Uuid,
} from '@weave/contracts';

export const FixtureUser = z.strictObject({
  id: Uuid,
  /** Bearer token the mock accepts for this user, e.g. `mock-organizer`. */
  token: z.string().min(1),
  is_anonymous: z.boolean(),
  email: z.string().nullable(),
});

export const FixtureProject = ProjectView.omit({ owner_nickname: true, settings: true }).extend({
  owner_user_id: Uuid,
  settings: ProjectSettings,
});

const projectScope = { project_id: Uuid };

export const FixtureMember = MemberSelf.extend({
  ...projectScope,
  user_id: Uuid,
  requested_at: IsoDateTime,
});

export const FixtureInvite = z.strictObject({
  project_id: Uuid,
  code: z.string(),
  expires_at: IsoDateTime,
  disabled: z.boolean(),
});

export const Fixture = z.strictObject({
  users: z.array(FixtureUser),
  projects: z.array(FixtureProject),
  members: z.array(FixtureMember),
  invites: z.array(FixtureInvite),
  areas: z.array(Area.extend(projectScope)),
  resources: z.array(ResourceView.extend(projectScope)),
  tasks: z.array(TaskView.extend(projectScope)),
  assignments: z.array(AssignmentView.extend(projectScope)),
  incidents: z.array(IncidentSummary.extend(projectScope)),
});

export type FixtureUser = z.infer<typeof FixtureUser>;
export type FixtureProject = z.infer<typeof FixtureProject>;
export type FixtureMember = z.infer<typeof FixtureMember>;
export type FixtureInvite = z.infer<typeof FixtureInvite>;
export type Fixture = z.infer<typeof Fixture>;
