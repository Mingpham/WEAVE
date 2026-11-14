/**
 * Every endpoint defined so far, in spec §9.3 order. Endpoints of later milestones are added
 * by contracts PRs before their routes (rule W-6). `PENDING_ENDPOINTS` lists the rest so the
 * gap stays visible.
 */
import type { EndpointDef } from './endpoint.ts';
import {
  InviteAction,
  Join,
  LeaveProject,
  MemberDecision,
  RemoveMember,
  ResolveInvite,
  UpdateMember,
} from './membership.ts';
import { CreateProject, DeleteProject, GetSnapshot, UpdateProject } from './projects.ts';
import { GetMe, PutPushToken } from './session.ts';

export const ENDPOINTS = [
  GetMe,
  PutPushToken,
  CreateProject,
  GetSnapshot,
  UpdateProject,
  DeleteProject,
  InviteAction,
  ResolveInvite,
  Join,
  MemberDecision,
  UpdateMember,
  RemoveMember,
  LeaveProject,
] as const satisfies readonly EndpointDef[];

/** §9.3 rows not yet defined in contracts: [row, method + path, milestone]. */
export const PENDING_ENDPOINTS: readonly [number, string, number][] = [
  [6, 'POST /projects/{pid}/close', 5],
  [15, 'GET /projects/{pid}/plan', 2],
  [16, 'POST /projects/{pid}/plan/compose', 2],
  [17, 'PATCH /projects/{pid}/plan', 2],
  [18, 'POST /projects/{pid}/plan/publish', 2],
  [19, 'POST /projects/{pid}/tasks', 3],
  [20, 'PATCH /tasks/{tid}', 3],
  [21, 'POST /tasks/{tid}/status', 3],
  [22, 'GET /projects/{pid}/assignment-suggestions', 3],
  [23, 'POST /projects/{pid}/offers', 3],
  [24, 'POST /assignments/{aid}/respond', 3],
  [25, 'POST /assignments/{aid}/release', 3],
  [26, 'POST /tasks/{tid}/start', 3],
  [27, 'POST /projects/{pid}/areas · PATCH|DELETE /areas/{id}', 2],
  [28, 'POST /projects/{pid}/resources · PATCH /resources/{rid}', 2],
  [29, 'POST /media/upload-intent', 3],
  [30, 'POST /media/{id}/complete', 3],
  [31, 'GET /media/{id}/url', 3],
  [32, 'POST /projects/{pid}/observations', 3],
  [33, 'POST /tasks/{tid}/submissions', 3],
  [34, 'POST /submissions/{sid}/evidence', 3],
  [35, 'GET /submissions/{sid}', 3],
  [36, 'POST /submissions/{sid}/review', 3],
  [37, 'POST /claims/{cid}/resolve', 3],
  [38, 'POST /projects/{pid}/incidents', 4],
  [39, 'GET /incidents/{iid}', 4],
  [40, 'POST /incidents/{iid}/status', 4],
  [41, 'PATCH /incidents/{iid}', 4],
  [42, 'POST /incidents/{iid}/requests', 4],
  [43, 'POST /incidents/{iid}/unknowns/{uid}/answer', 4],
  [44, 'POST /requests/{rid}/respond', 4],
  [45, 'POST /requests/{rid}/cancel', 4],
  [46, 'POST /proposals/{id}/decide', 5],
  [47, 'POST /incidents/{iid}/manual-decision', 5],
  [48, 'POST /suggestions/{id}/decision', 5],
  [49, 'GET /projects/{pid}/timeline', 4],
  [50, 'GET /me/inbox · POST /me/inbox/read', 3],
  [51, 'GET /projects/{pid}/report', 5],
  [52, 'GET /projects/{pid}/settlement(.csv)', 5],
  [53, 'PATCH /ledger/{id}', 5],
];
