# WP-1 AI & Engine Implementation Plan

> **For agentic workers:** Execute inline with `executing-plans` and TDD. The user approved all remaining tasks in the preceding report and requires a remote push after each task, followed by a remote-branch audit before the next task.

**Goal:** Reconcile current shared ownership, deliver WP-1 deterministic eligibility and draft rules, run plan composition with a fake model, and finish the real worker adapter if DB contracts become available.

**Architecture:** Pure engine functions consume readonly canonical data. Plan composition builds a minimal model snapshot, preserves human-owned data, and uses the existing validation/worker ports. SQL remains DB-owned; an absent RPC is a dependency, not permission to invent one.

**Tech Stack:** TypeScript/Zod, pnpm 10.28.2 and Vitest 5.1.0 from fullstack `b18271d`, Deno 2, existing model port. No new production dependency.

**Spec:** `docs/WEAVE_MVP_Specification.md` FR-PLAN-01…07, FR-TASK-04, §§10.2–10.3, 10.7–10.8, 11.2–11.3, 15.4; approved next-task report in conversation.

## Global Constraints

- Keep current `ai/wp-0-foundation` checkout under the established arrangement; no concurrent writers. Do not alter `.env` or existing untracked `AGENTS.md`.
- User approval covers implementation, task commits and pushes; no further design/finish approval loop. No merge/rebase/force-push, hosted DB mutation or deployment.
- Fetch and inspect other lanes before each next task. Record exact SHAs, checks and remaining dependencies in `docs/ai/wp-1-verification.md`.
- Keep model output schemas unchanged. New plan prompt gets its own version and deterministic fixture evaluation; no extra live calls without an explicit need.
- Preserve input data; pass time explicitly. Reject scope/reference errors instead of inventing missing entities. No engine function performs IO.
- Preserve verification logs. One fresh final reviewer; fix important findings with regression tests, commit and push fixes.

## Review Focus

1. Shared ENUMS/POL match the DB-owned values and latest API imports, while AI schemas/strict checks and default AI discovery remain intact.
2. Eligibility correctly handles stale/future presence claims, declined history, boundary-touching windows, completed tasks and sequential suggested load without mutating inputs.
3. Draft validation covers cross-collection key collisions, all reference classes, dependency cycles, negative preparation offsets and deterministic gaps including resource contention.
4. Composition restores locked objects and human inventory/custodian/stipend data before business validation; FINALIZE cannot silently add/remove or reschedule work.
5. Model snapshots exclude IDs/secrets/human money, cap message history, keep untrusted text outside the system prompt, and cannot register a fake production adapter.

### Task 1: Reconcile the latest owning-lane contracts and tooling

**Files:** root package/lock/workspace/TS configs; `packages/contracts/src/{enums,enum-schemas,policy,limits,index,common,entities,plan,recovery,primitives}.ts`, API import sites and tests; README/evidence.

**Interfaces:** DB `ENUMS`/`POL` stay canonical tuples/constants, Zod values/types live in `enum-schemas.ts`, API limits in `limits.ts`. Preserve root exports, AI subpaths, Recovery aliases and strict model schemas. Retain the existing core/AI Vitest projects and AI CI steps.

- [x] Add consumer checks importing `enum-schemas.ts` and `limits.ts`; verify canonical enum parity and Recovery behavior. Run targeted tests, expected RED on missing modules.
- [x] Adopt pinned owner files, redirect AI imports, derive legacy `DB_ENUMS` compatibility map without duplicated values. Align pnpm/Vitest/TS base to fullstack, preserve stronger root checks and AI discovery.
- [x] Run frozen install, `pnpm check`, `pnpm format:check`, `pnpm ai:check`; compare all four model JSON schemas. Verify current API consumers in a temporary overlay, no `.env` copy. Expected all pass.
- [x] Commit/push `[WP-0-AI] Reconcile latest shared contracts and toolchain`; confirm remote SHA, then fetch before Task 2.

### Task 2: Eligibility, ranking and greedy assignment suggestions

**Files:** `packages/engine/src/{eligibility,index}.ts`, `packages/engine/tests/{eligibility.test,eligibility-fixtures}.ts`.

**Interfaces:** `evaluateEligibility(input: EligibilityInput, taskId: string, memberId: string): EligibilityEvaluation`; `rankCandidates(input, taskId): EligibilityEvaluation[]`; `suggestAssignments(input): AssignmentSuggestion[]`. Results carry task/member IDs, seven typed checks, aggregate validity and numeric score; suggestions retain every OPEN task with up to three ranked candidates and reserve only the first candidate for the next task (final review correction to match FR-TASK-04 / endpoint #22).

- [x] Tests: approved participant only; UNAVAILABLE false, urgent NOT_ARRIVED without fresh claim unknown; role match; availability union covers window; active load <2; overlapping critical assignment; any DECLINED/RELEASED history; score +3/+2/+2 minus active load, nickname tie; critical/due task order and provisional clashes. Reject wrong scope, dangling/duplicate IDs and invalid windows. Freeze fixtures. Expected RED before functions exist.
- [x] Implement pure functions; half-open overlap permits adjacent tasks, active assignment statuses OFFERED/ACCEPTED on unfinished tasks, no wall clock. Reject unknown IDs/scope rather than filtering incomplete data silently. An empty candidate list is valid; only no OPEN tasks yields an empty suggestion list.
- [x] Run focused tests, engine compile assertions, full `pnpm check` and Deno check. Expected pass; record spec-gap interpretations.
- [x] Commit/push `[WP-1-AI] Implement eligibility and assignment suggestions`; fetch before Task 3.

### Task 3: Validate drafts and compute code-owned gaps

**Files:** `packages/engine/src/{draft,index}.ts`, `packages/engine/tests/{draft.test,draft-fixtures}.ts`.

**Interfaces:** `validateDraft(input: DraftValidationInput): DraftValidationResult` returns parsed canonical draft or typed issues; `computeDraftGaps(input): PlanGap[]` accepts a valid draft and ignores model-supplied gaps.

- [x] Tests: duplicate/malformed keys, dangling area/task/resource/question/role refs, self/cyclic dependencies, exclusive resource-or-category needs, limits and 1–8 criteria; due offsets inclusive -20160 to event duration+1440, strict start<due; five gap kinds, shared resource overlaps and category candidates; no input mutation. Expected RED.
- [x] Implement schema plus graph/reference/policy checks and deterministic gap messages. Resolve gaps from current draft, never trust caller-supplied gaps. Time windows use explicit start or due minus duration.
- [x] Run focused tests, full checks and Deno. Expected pass.
- [x] Commit/push `[WP-1-AI] Validate plan drafts and compute gaps`; fetch before Task 4.

### Task 4: Plan composition with fake-model end-to-end tests

**Files:** `supabase/functions/_shared/ai/{plan-compose,prompts/plan-compose}.ts`, worker ports as needed for a typed plan delta, plan tests and `tests/ai-evals/plan_compose/*`.

**Interfaces:** Typed plan context (project, draft/revision/turns, mode, last messages); minimal snapshot builder; canonical `planComposeValidators`; opt-in `planComposeHandler` using the real worker with fake ModelPort/store in tests. Production registry remains unbound until the real store exists.

- [x] Tests: valid draft composition, invalid/duplicate keys and cycles, restore removed/changed locked objects, retain inventory/custodian/stipend, new resource UNVERIFIED, mode/turn limits, FINALIZE no additions/removals/schedule/criteria changes and no questions, rebuilt gaps, 12-message cap, forbidden snapshot fields, injection text as data, fake worker commit and failed-output preservation. Expected RED.
- [x] Implement versioned prompt and minimal snapshot; preserve original identity and human fields, run schema→references→policy→business, derive typed plan draft update. No new model schema or live inference. Record prompt fixture eval version/results.
- [x] Run module fixtures, fake worker flow, full suite, lint/types and Deno. Expected pass.
- [x] Commit/push `[WP-1-AI] Add validated plan composition with fake worker flow`; fetch before Task 5.

### Task 5: Integrate the real worker only against supplied RPC contracts

**Files:** worker adapter/tests if contracts exist; otherwise `docs/ai/wp-1-verification.md` and existing AI/DB handoff.

**Interfaces:** Existing WorkerStore requires actual queue/claim/lease/budget/context/atomic commit/retry/failure/ack/recovery RPCs, including fencing and persistent schema-failure counts. Private member mutation helpers do not provide worker semantics.

- [x] Fetch latest DB branch and inspect migrations/runbook/signatures; compare each WorkerStore operation and plan delta requirement.
- [ ] If supplied: add failing adapter/integration tests against local DB, implement typed mapping, verify rollback/concurrency/retry/stale/budget before binding production registry. If absent: record exact missing contracts and keep Task 5 explicitly dependency-blocked; no invented SQL or fake success.
- [ ] Run all applicable checks, fresh final review, commit/push evidence and any verified fixes. Confirm remote SHA and CI. Report completed tasks separately from external dependencies; never claim G0 or full MVP acceptance.
