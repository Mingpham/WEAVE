/** Mutable in-memory state of the mock, created from a validated fixture. */
import { randomUUID } from 'node:crypto';
import type {
  Fixture,
  FixtureInvite,
  FixtureMember,
  FixtureProject,
  FixtureUser,
} from './fixture.ts';

export interface MockState {
  users: FixtureUser[];
  projects: (FixtureProject & { deleted: boolean })[];
  members: FixtureMember[];
  invites: FixtureInvite[];
  areas: Fixture['areas'];
  resources: Fixture['resources'];
  tasks: Fixture['tasks'];
  assignments: Fixture['assignments'];
  incidents: Fixture['incidents'];
  pushTokens: Map<string, { user_id: string; platform: string }>;
  /** Failed invite attempts per user, for SEC-03 / FR-MEM-02 rate limiting. */
  inviteFailures: Map<string, number[]>;
}

export function createState(fixture: Fixture): MockState {
  const copy = structuredClone(fixture);
  return {
    ...copy,
    projects: copy.projects.map((p) => ({ ...p, deleted: false })),
    pushTokens: new Map(),
    inviteFailures: new Map(),
  };
}

export const newId = (): string => randomUUID();
