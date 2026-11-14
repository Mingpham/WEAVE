/**
 * Mock handlers for milestone 0–1 endpoints. Business rules follow spec §3, §5.2, §5.3 and
 * §8.1 closely enough to walk the join flow end to end; they are NOT the real RPCs (those
 * live in the DB lane). Endpoints not implemented here return 404 NOT_FOUND.
 */
import type { Hono } from 'hono';
import {
  CONSENT_VERSION,
  CreateProject,
  DEFAULT_PROJECT_SETTINGS,
  DeleteProject,
  GetSnapshot,
  INVITE_CODE_ALPHABET,
  InviteAction,
  Join,
  LeaveProject,
  MemberDecision,
  POL,
  PutPushToken,
  RemoveMember,
  ResolveInvite,
  UpdateMember,
  UpdateProject,
} from '@weave/contracts';
import type { EventType, MemberSelf, ProjectView, Snapshot, TaskStatus } from '@weave/contracts';
import type { Env } from '../../../supabase/functions/api/lib/context.ts';
import { ApiError } from '../../../supabase/functions/api/lib/errors.ts';
import { register } from '../../../supabase/functions/api/lib/route.ts';
import type { AuthUser } from '../../../supabase/functions/api/ports.ts';
import type { FixtureMember } from './fixture.ts';
import type { MockState } from './store.ts';
import { newId } from './store.ts';

type Project = MockState['projects'][number];

export interface MockHooks {
  /** Called after each committed change, like the realtime signal (FR-NTF-01). */
  onSignal?: (projectId: string, stateVersion: number, eventType: EventType) => void;
}

export function registerMockRoutes(
  app: Hono<Env>,
  s: MockState,
  now: () => Date,
  hooks: MockHooks = {},
): void {
  const iso = () => now().toISOString();

  const project = (pid: string | undefined): Project => {
    const p = s.projects.find((x) => x.id === pid && !x.deleted);
    if (!p) throw new ApiError('NOT_FOUND');
    return p;
  };
  const memberOf = (p: Project, user: AuthUser) =>
    s.members.find((m) => m.project_id === p.id && m.user_id === user.id);

  /** 404 for non-members so existence is not leaked (spec §9.2); 403 for PENDING (AT-05). */
  const requireApproved = (p: Project, user: AuthUser): FixtureMember => {
    const m = memberOf(p, user);
    if (!m || !['PENDING', 'APPROVED'].includes(m.status)) throw new ApiError('NOT_FOUND');
    if (m.status !== 'APPROVED') throw new ApiError('FORBIDDEN');
    return m;
  };
  const requireOwner = (p: Project, user: AuthUser): FixtureMember => {
    const m = requireApproved(p, user);
    if (m.role !== 'OWNER') throw new ApiError('FORBIDDEN');
    return m;
  };
  const requireOpen = (p: Project) => {
    if (p.status === 'CLOSED') throw new ApiError('PROJECT_CLOSED');
  };
  const commit = (p: Project, eventType: EventType): number => {
    p.state_version += 1;
    hooks.onSignal?.(p.id, p.state_version, eventType);
    return p.state_version;
  };
  const ownerNickname = (p: Project) =>
    s.members.find((m) => m.project_id === p.id && m.role === 'OWNER')?.nickname ?? 'Organizer';

  const projectView = (p: Project, asOwner: boolean): ProjectView => {
    const { owner_user_id: _o, deleted: _d, settings, ...rest } = p;
    return { ...rest, settings: asOwner ? settings : null, owner_nickname: ownerNickname(p) };
  };
  const memberSelf = (m: FixtureMember): MemberSelf => {
    const { project_id: _p, user_id: _u, requested_at: _r, ...self } = m;
    return self;
  };
  const activeInvite = (p: Project) =>
    s.invites.find(
      (i) => i.project_id === p.id && !i.disabled && Date.parse(i.expires_at) > now().getTime(),
    );

  /** FR-MEM-02: wrong, expired and disabled codes all return the same INVITE_INVALID; 429 after the limit. */
  const resolveCode = (user: AuthUser, code: string): Project => {
    const windowStart = now().getTime() - 600_000;
    const failures = (s.inviteFailures.get(user.id) ?? []).filter((t) => t > windowStart);
    if (failures.length >= POL.JOIN_ATTEMPTS_PER_10_MIN) throw new ApiError('RATE_LIMITED');
    const invite = s.invites.find(
      (i) => i.code === code && !i.disabled && Date.parse(i.expires_at) > now().getTime(),
    );
    const p = invite && s.projects.find((x) => x.id === invite.project_id && !x.deleted);
    if (!p || p.status === 'CLOSED') {
      failures.push(now().getTime());
      s.inviteFailures.set(user.id, failures);
      throw new ApiError('INVITE_INVALID');
    }
    return p;
  };

  // #2
  register(app, PutPushToken, async ({ c, body }) => {
    s.pushTokens.set(body.token, { user_id: c.get('user').id, platform: body.platform });
    return { data: null, stateVersion: 0 };
  });

  // #3 — organizers must have a Google (non-anonymous) account (FR-AUTH-03, AT-02).
  register(app, CreateProject, async ({ c, body }) => {
    const user = c.get('user');
    if (user.isAnonymous)
      throw new ApiError('FORBIDDEN', 'Sign in with Google to organize an event.');
    const p: Project = {
      id: newId(),
      owner_user_id: user.id,
      title: body.title,
      brief: body.brief,
      venue_name: body.venue_name ?? null,
      starts_at: new Date(body.starts_at).toISOString(),
      ends_at: new Date(body.ends_at).toISOString(),
      timezone: body.timezone,
      expected_team_size: body.expected_team_size,
      expected_attendees: body.expected_attendees ?? null,
      currency: body.currency ?? 'VND',
      status: 'DRAFT',
      state_version: 0,
      role_tags: [],
      settings: { ...DEFAULT_PROJECT_SETTINGS },
      closed_at: null,
      deleted: false,
    };
    // Spec gap: FR-EVT-01 has no owner nickname field; derive one (docs/contracts/spec-gaps.md).
    const nickname = (user.email?.split('@')[0] ?? 'Organizer').slice(0, 24).padEnd(2, '_');
    const owner: FixtureMember = {
      id: newId(),
      project_id: p.id,
      user_id: user.id,
      nickname,
      role: 'OWNER',
      status: 'APPROVED',
      role_tags: [],
      presence: 'NOT_ARRIVED',
      current_area_id: null,
      availability: { whole_event: true },
      consent_at: iso(),
      consent_version: CONSENT_VERSION,
      version: 1,
      requested_at: iso(),
    };
    s.projects.push(p);
    s.members.push(owner);
    const v = commit(p, 'PROJECT_CREATED');
    return {
      data: { project: projectView(p, true), me: memberSelf(owner) },
      stateVersion: v,
      status: 201,
    };
  });

  // #4 — snapshot filtered by role (spec §3, §9.4).
  register(app, GetSnapshot, async ({ c, params }) => {
    const p = project(params.pid);
    const me = requireApproved(p, c.get('user'));
    const isOwner = me.role === 'OWNER';
    const inProject = <T extends { project_id: string }>(xs: T[]) =>
      xs.filter((x) => x.project_id === p.id).map(({ project_id: _p, ...rest }) => rest);
    const approved = s.members.filter((m) => m.project_id === p.id && m.status === 'APPROVED');
    const tasks = p.status === 'DRAFT' ? [] : inProject(s.tasks);
    const tasksByStatus: Partial<Record<TaskStatus, number>> = {};
    for (const t of tasks) tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
    const incidents = inProject(s.incidents).map((i) =>
      isOwner
        ? i
        : {
            ...i,
            origin: null,
            severity: null,
            readiness: null,
            safety: null,
            revision: null,
            detected_at: null,
          },
    );
    const invite = isOwner ? activeInvite(p) : undefined;
    const snapshot: Snapshot = {
      project: projectView(p, isOwner),
      me: memberSelf(me),
      members: approved.map(({ id, nickname, role, role_tags, presence, current_area_id }) => ({
        id,
        nickname,
        role,
        role_tags,
        presence,
        current_area_id,
      })),
      areas: inProject(s.areas),
      resources: inProject(s.resources),
      tasks,
      my_assignments: inProject(s.assignments).filter((a) => a.member_id === me.id),
      my_requests: [],
      my_submissions: [],
      incidents,
      invite: invite
        ? {
            code: invite.code,
            deep_link: `weave://join?code=${invite.code}`,
            expires_at: invite.expires_at,
          }
        : null,
      pending_members: isOwner
        ? s.members
            .filter((m) => m.project_id === p.id && m.status === 'PENDING')
            .map(({ id, nickname, role_tags, availability, requested_at, version }) => ({
              id,
              nickname,
              role_tags,
              availability,
              requested_at,
              version,
            }))
        : [],
      attention: [],
      counters: {
        tasks_by_status: tasksByStatus,
        blocked: tasks.filter((t) => t.risk === 'BLOCKED').length,
        at_risk: tasks.filter((t) => t.risk === 'AT_RISK').length,
        open_incidents: incidents.filter((i) => !['RESOLVED', 'DISMISSED'].includes(i.status))
          .length,
        on_site: approved.filter((m) => m.presence === 'ON_SITE').length,
        members: approved.length,
        unread: 0,
      },
    };
    return { data: snapshot, stateVersion: p.state_version };
  });

  // #5 — FR-EVT-04: start/end only editable in DRAFT.
  register(app, UpdateProject, async ({ c, params, body }) => {
    const p = project(params.pid);
    requireOwner(p, c.get('user'));
    requireOpen(p);
    if ((body.starts_at || body.ends_at) && p.status !== 'DRAFT') {
      throw new ApiError('CONSTRAINT_VIOLATION', 'Event times can only change while planning.', {
        checks: ['TIMES_EDITABLE_ONLY_IN_DRAFT'],
      });
    }
    const starts = body.starts_at ? new Date(body.starts_at).toISOString() : p.starts_at;
    const ends = body.ends_at ? new Date(body.ends_at).toISOString() : p.ends_at;
    if (Date.parse(ends) <= Date.parse(starts)) {
      throw new ApiError('VALIDATION_FAILED', 'ends_at must be after starts_at.');
    }
    Object.assign(p, {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.brief !== undefined && { brief: body.brief }),
      ...(body.venue_name !== undefined && { venue_name: body.venue_name }),
      ...(body.role_tags !== undefined && { role_tags: body.role_tags }),
      starts_at: starts,
      ends_at: ends,
      settings: { ...p.settings, ...body.settings },
    });
    const v = commit(p, 'PROJECT_UPDATED');
    return { data: projectView(p, true), stateVersion: v };
  });

  // #7 — FR-EVT-06: soft delete after typing the exact title.
  register(app, DeleteProject, async ({ c, params, body }) => {
    const p = project(params.pid);
    requireOwner(p, c.get('user'));
    if (body.confirm_title !== p.title) {
      throw new ApiError('CONSTRAINT_VIOLATION', 'Type the event name exactly to delete it.', {
        checks: ['CONFIRM_TITLE_MATCHES'],
      });
    }
    const v = commit(p, 'PROJECT_DELETED');
    p.deleted = true;
    return { data: null, stateVersion: v };
  });

  // #8 — FR-MEM-01: at most one live code; CREATE replaces it.
  register(app, InviteAction, async ({ c, params, body }) => {
    const p = project(params.pid);
    requireOwner(p, c.get('user'));
    requireOpen(p);
    for (const i of s.invites) if (i.project_id === p.id) i.disabled = true;
    if (body.action === 'DISABLE') {
      return { data: null, stateVersion: commit(p, 'INVITE_DISABLED') };
    }
    let code = '';
    do {
      code = Array.from({ length: 6 }, () =>
        INVITE_CODE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)),
      ).join('');
    } while (s.invites.some((i) => i.code === code && !i.disabled));
    const expires_at = new Date(now().getTime() + POL.INVITE_TTL_HOURS * 3_600_000).toISOString();
    s.invites.push({ project_id: p.id, code, expires_at, disabled: false });
    const v = commit(p, 'INVITE_CREATED');
    return { data: { code, deep_link: `weave://join?code=${code}`, expires_at }, stateVersion: v };
  });

  // #9
  register(app, ResolveInvite, async ({ c, body }) => {
    const p = resolveCode(c.get('user'), body.code);
    return {
      data: {
        project_id: p.id,
        project_title: p.title,
        organizer_nickname: ownerNickname(p),
        venue_name: p.venue_name,
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        timezone: p.timezone,
        consent_version: CONSENT_VERSION,
        role_tags: p.role_tags,
      },
      stateVersion: 0,
    };
  });

  // #10 — FR-MEM-02/03, §8.1.
  register(app, Join, async ({ c, body }) => {
    const user = c.get('user');
    const p = resolveCode(user, body.code);
    if (body.consent_version !== CONSENT_VERSION) {
      throw new ApiError('VALIDATION_FAILED', 'Please review the latest consent text.', {
        where: 'body',
        issues: [{ path: 'consent_version', code: 'custom', message: 'Outdated consent version' }],
      });
    }
    const existing = memberOf(p, user);
    if (existing?.status === 'REMOVED') throw new ApiError('FORBIDDEN');
    if (existing && ['PENDING', 'APPROVED'].includes(existing.status)) {
      throw new ApiError('INVALID_TRANSITION', "You've already asked to join this event.");
    }
    const active = s.members.filter(
      (m) => m.project_id === p.id && ['PENDING', 'APPROVED'].includes(m.status),
    );
    if (active.length >= POL.MAX_MEMBERS) throw new ApiError('LIMIT_EXCEEDED');
    const norm = body.nickname.trim().toLowerCase();
    if (active.some((m) => m.nickname.trim().toLowerCase() === norm)) {
      throw new ApiError('CONSTRAINT_VIOLATION', 'That nickname is taken in this event.', {
        checks: ['NICKNAME_UNIQUE'],
      });
    }
    const status = p.settings.auto_approve_members ? 'APPROVED' : 'PENDING';
    const fields = {
      nickname: body.nickname.trim(),
      role: 'PARTICIPANT' as const,
      status,
      role_tags: body.role_tags,
      presence: 'NOT_ARRIVED' as const,
      current_area_id: null,
      availability: body.availability,
      consent_at: iso(),
      consent_version: body.consent_version,
      requested_at: iso(),
    } satisfies Partial<FixtureMember>;
    let member: FixtureMember;
    if (existing) {
      // REJECTED / LEFT may request again: the row goes back to PENDING (§8.1).
      Object.assign(existing, fields, { version: existing.version + 1 });
      member = existing;
    } else {
      member = { id: newId(), project_id: p.id, user_id: user.id, version: 1, ...fields };
      s.members.push(member);
    }
    const v = commit(p, status === 'APPROVED' ? 'MEMBER_APPROVED' : 'MEMBER_JOIN_REQUESTED');
    return { data: { project_id: p.id, member: memberSelf(member) }, stateVersion: v, status: 201 };
  });

  const memberById = (mid: string | undefined) => {
    const m = s.members.find((x) => x.id === mid);
    if (!m) throw new ApiError('NOT_FOUND');
    return { m, p: project(m.project_id) };
  };

  // #11 — owner decides on a PENDING request.
  register(app, MemberDecision, async ({ c, params, body }) => {
    const { m, p } = memberById(params.mid);
    requireOwner(p, c.get('user'));
    requireOpen(p);
    if (m.version !== body.expected_version) {
      throw new ApiError('VERSION_CONFLICT', undefined, {
        current: { version: m.version, status: m.status },
      });
    }
    if (m.status !== 'PENDING') throw new ApiError('INVALID_TRANSITION');
    m.status = body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    m.version += 1;
    const v = commit(p, body.decision === 'APPROVE' ? 'MEMBER_APPROVED' : 'MEMBER_REJECTED');
    return { data: { member_id: m.id, status: m.status, version: m.version }, stateVersion: v };
  });

  // #12 — self edits own profile; owner may only change another member's role_tags.
  register(app, UpdateMember, async ({ c, params, body }) => {
    const { m, p } = memberById(params.mid);
    const caller = requireApproved(p, c.get('user'));
    requireOpen(p);
    const isSelf = caller.id === m.id;
    if (!isSelf) {
      if (caller.role !== 'OWNER') throw new ApiError('NOT_FOUND');
      const keys = Object.keys(body);
      if (keys.some((k) => k !== 'role_tags')) {
        throw new ApiError('FORBIDDEN', "You can only change another member's role tags.");
      }
    }
    if (
      body.current_area_id &&
      !s.areas.some((a) => a.id === body.current_area_id && a.project_id === p.id)
    ) {
      throw new ApiError('NOT_FOUND', "That area doesn't exist in this event.");
    }
    if (body.nickname !== undefined) {
      const norm = body.nickname.trim().toLowerCase();
      const taken = s.members.some(
        (x) =>
          x.project_id === p.id &&
          x.id !== m.id &&
          ['PENDING', 'APPROVED'].includes(x.status) &&
          x.nickname.trim().toLowerCase() === norm,
      );
      if (taken)
        throw new ApiError('CONSTRAINT_VIOLATION', 'That nickname is taken in this event.', {
          checks: ['NICKNAME_UNIQUE'],
        });
      m.nickname = body.nickname.trim();
    }
    if (body.role_tags !== undefined) m.role_tags = body.role_tags;
    if (body.availability !== undefined) m.availability = body.availability;
    const presenceChanged = body.presence !== undefined && body.presence !== m.presence;
    if (body.presence !== undefined) m.presence = body.presence;
    if (body.current_area_id !== undefined) m.current_area_id = body.current_area_id;
    m.version += 1;
    const v = commit(p, presenceChanged ? 'MEMBER_PRESENCE_CHANGED' : 'MEMBER_UPDATED');
    return { data: memberSelf(m), stateVersion: v };
  });

  const releaseAssignments = (m: FixtureMember) => {
    for (const a of s.assignments) {
      if (a.member_id === m.id && (a.status === 'OFFERED' || a.status === 'ACCEPTED')) {
        a.status = 'RELEASED';
        a.version += 1;
        const t = s.tasks.find((x) => x.id === a.task_id);
        if (t && t.status !== 'APPROVED' && t.status !== 'CANCELLED') {
          t.status = 'OPEN';
          t.assignee_member_id = null;
          t.version += 1;
        }
      }
    }
  };

  // #13 — FR-MEM-06.
  register(app, RemoveMember, async ({ c, params }) => {
    const { m, p } = memberById(params.mid);
    requireOwner(p, c.get('user'));
    requireOpen(p);
    if (m.role === 'OWNER' || m.status !== 'APPROVED') throw new ApiError('INVALID_TRANSITION');
    m.status = 'REMOVED';
    m.version += 1;
    releaseAssignments(m);
    const v = commit(p, 'MEMBER_REMOVED');
    return { data: null, stateVersion: v };
  });

  // #14 — participant leaves, or a pending request is cancelled. Owner cannot leave.
  register(app, LeaveProject, async ({ c, params }) => {
    const p = project(params.pid);
    const m = memberOf(p, c.get('user'));
    if (!m || !['PENDING', 'APPROVED'].includes(m.status)) throw new ApiError('NOT_FOUND');
    if (m.role === 'OWNER')
      throw new ApiError('FORBIDDEN', "The organizer can't leave their own event.");
    m.status = 'LEFT';
    m.version += 1;
    releaseAssignments(m);
    const v = commit(p, 'MEMBER_LEFT');
    return { data: null, stateVersion: v };
  });
}
