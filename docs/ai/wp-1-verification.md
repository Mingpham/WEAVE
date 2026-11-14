# WP-1 AI & Engine — execution evidence

Approved scope: remaining tasks in the progress report, executed inline on `ai/wp-0-foundation`. Baseline `709c784`. Each implementation task is committed and pushed before the next remote-branch audit. Existing `.env`, untracked `AGENTS.md` and local logs are preserved.

## Task 1 — Current contracts/toolchain reconciliation

- Remote audit: fullstack `b18271d`, database `4a1603a`, mobile `1ea4289`; unchanged at start.
- `ENUMS` and `POL` now match DB-owned source byte-for-byte. API Zod types live in `enum-schemas.ts`, additional limits in `limits.ts`, as in current fullstack. Legacy `DB_ENUMS` remains a registry of those same schemas; no repeated literal values. Recovery runtime aliases, AI subpaths, UTC model timestamps and strict bounds are retained.
- Adopted fullstack pnpm 10.28.2 / Vitest 5.1.0 / TypeScript 6.0.3 and base TS configuration. Root checks retain additional strictness; default tests still include isolated AI suites and both CI targets. Only the DB-owned canonical tuple file is exempted from formatting to avoid rewriting another lane's source.
- RED: two new consumer tests failed on missing enum/limits modules. GREEN: `pnpm check` **126/126 tests in 17 files**, strict types, lint and hardcode scan; `pnpm format:check`, `pnpm ai:check`, frozen install and `git diff --check` passed. All four model JSON schemas compare byte-identical before/after.
- Temporary fullstack `b18271d` archive with shared/AI sources overlaid: `pnpm check` **151/151 tests in 19 files**; format, API Deno check and frozen install passed. No `.env`, live inference, database writes or branch merge. Combined lock includes upstream mock-api importer; real integration must retain it.
- Temporary pnpm rebuild needed `CI=true` to replace generated node_modules noninteractively; installation completed without production dependency additions. Root and owner tool versions now match. Owner review/actual merged-branch acceptance remains separate.

## Task 2 — Eligibility and assignment suggestions

- After Task 1 push, fullstack/DB remained unchanged; inspected mobile `7ebf1c7` and `078f9f3` (native build configuration and blocker handoff), with no engine-interface change.
- Added pure `evaluateEligibility`, `rankCandidates` and `suggestAssignments` exports. Seven §11.3 checks return TRUE/FALSE/UNKNOWN, explanatory messages and presence evidence IDs. Ranking follows +3 role, +2 area, +2 ON_SITE, minus active assignment count; nickname then ID gives deterministic ties.
- Greedy suggestions consider OPEN tasks, critical first then due time, and reserve each selected member's load/critical window before the next task. Each OPEN task retains up to three ranked candidates, including an empty list when none qualify. Only the first candidate reserves provisional load. UNKNOWN remains visible as PENDING_VERIFICATION; only FALSE excludes a candidate (final-review correction below). Inputs are never mutated.
- Runtime guards reject malformed projections, project mismatch, duplicate IDs and missing referenced tasks/members. They cannot prove that a caller omitted historical rows; complete server snapshots remain required.
- Boundary decisions: half-open intervals allow adjacent tasks; adjacent availability windows may jointly cover a task; null area IDs earn no location bonus; claim expiry is exclusive and future observations are not fresh; an already-started task remains urgent for NOT_ARRIVED members. Nickname sorting uses deterministic code-point order, with ID only breaking equal nicknames. These decisions need owner review if product expects a locale-specific ordering or different time boundaries.
- RED: targeted suite failed before the implementation module existed. GREEN: **37 focused tests**, full `pnpm check` **163/163 in 18 files**, `pnpm typecheck:engine`, `pnpm format:check`, Deno check of engine exports and `git diff --check` passed. Frozen fixtures prove inputs remain unchanged. No API route or persistent assignment is created by suggestions.

## Outstanding work

Real worker DB integration remains pending. DB worker RPCs are absent at the audited SHA; private member mutation helpers do not implement WorkerStore. Production entrypoint remains `INTEGRATION_PENDING` until that dependency is satisfied and tested.

## Task 3 — Draft validation and gaps

- After Task 2 push, fetched all lanes: fullstack `b18271d`, DB `4a1603a`, mobile `078f9f3` unchanged.
- Added pure `validateDraft` and `computeDraftGaps`. Checks cover canonical field structure, cross-collection key uniqueness, area names/role tags/question IDs, references, exclusive resource/category needs, cycles across HARD and SOFT dependencies, entity caps, criteria and time windows. Missing role/area can remain a review gap; dangling non-null references cannot.
- Due offsets include -20,160 minutes and event duration +1,440 minutes; start must precede due. Empty manual drafts remain valid. Existing gaps are ignored and all five gap kinds rebuilt from validated data without mutating the input.
- Category-based contention is a conservative warning about possible shared allocation, not a resource-capacity optimizer; supply quantity and alternatives are not treated as an automatic reservation. Adjacent windows do not overlap. Area names are unique ignoring case after canonical trimming. Caller must still validate custodians against the complete project member snapshot/DB before persistence.
- RED: targeted test import failed before implementation. GREEN: **29 focused tests**, full `pnpm check` **192/192 in 19 files**, format, Deno engine and diff checks passed. These are engine tests; publication transaction/route and Android review acceptance are not claimed.

## Task 4 — Plan composition with the fake worker flow

- Pre-task fetch: fullstack `b18271d`, DB `4a1603a`, mobile `078f9f3` unchanged; Task 3 was pushed first.
- Added opt-in `planComposeHandler`, module validators, snapshot builder and prompt `plan-compose-wp1-v1`. Production registry remains empty. The handler verifies project/draft/revision against the claimed job; validation preserves that scope when reloading after a version conflict.
- Model snapshots project only required event/draft fields, exclude DB identity/custodian IDs/stipend amounts/unknown metadata, keep untrusted text in user data, and retain at most the latest 12 messages. Existing draft keys are local draft identifiers, not entity UUID aliases. Snapshot caps: 4 questions, 8 assumptions, 4,000 characters per message/answer and 500 per assumption; omissions set `truncated`. These are provisional snapshot bounds requiring quality evaluation before live rollout. Provider/model/token settings are unchanged.
- Locked areas/tasks/resources are restored before references/business validation. Existing origin/inventory/custodian/stipend fields survive; new resources are UNVERIFIED and new tasks have no stipend. Change summaries and gaps are recomputed from actual merged drafts. Question IDs are deterministic per next revision; matching existing questions retain answer/status.
- FINALIZE permits text normalization (including criterion wording) and missing area completion only; item sets, scheduling, requirements, quantities and criterion flags remain unchanged, with no new questions. DRAFT requires no prior tasks; 12 prior AI turns prevents another call. The future adapter must supply the number of turns used before this job, so a retry is not counted as another user turn.
- The internal `PLAN_DRAFT` delta carries draft ID, expected revision, EDITING status, validated draft, reply, computed summary and prompt version. DB persistence is not implemented. Expected preparation failures terminate without model/budget use; plan business failures retry within three job attempts. Schema/ID retry limits remain unchanged. Failed output leaves the existing draft untouched; unrelated state-version changes do not re-call the model.
- RED: module/worker tests failed before implementation. The first GREEN attempt exposed a full-project-versus-projection mismatch; explicit `projectForDraft` fixed that boundary without relaxing engine validation. GREEN: **31 focused tests**, full `pnpm check` **223/223 in 21 files**, format/diff and Deno worker/module/CLI checks passed. Existing fixture handlers were updated only to forward the newly supplied claimed job argument.
- [Versioned offline evaluation](./plan-compose-wp1-eval.json) records prompt source hash, all case names/results and **zero live inference calls**. This establishes business-rule and worker behavior with synthetic data; it does not establish live model quality, RPC atomicity or publication acceptance.
- Formatting follow-up: the final format process returned one snapshot-builder chain-layout warning after the first task commit/push. Compared formatter output (whitespace only), applied the second pass and reran `pnpm format:check` successfully before proceeding to Task 5. The initial format result was not a pass; the successful follow-up supersedes it.

## Task 5 — Real database adapter dependency audit

After Task 4 and its formatting follow-up were pushed, fetched again: fullstack `b18271d`, database `4a1603a`, mobile `078f9f3` unchanged. Inspected every migration function and the DB runbook. Four migrations provide enums, membership, event/idempotency storage and private member mutation helpers. The runbook explicitly excludes worker actor paths. No real worker RPC signatures, queue operations, lease state, budget reservation or plan-result transaction are available.

**Task 5 is blocked by that dependency, not complete.** No SQL names were invented and no production store was bound. The user was asked whether an additional branch/commit contains the missing contracts while independent review/combined verification continued.

Required handoff remains the WorkerStore table in [AI/DB contracts](./2026-11-14-ai-engine-handoff.md), supplemented with the WP-1 plan delta in that handoff. Local engine/fake-worker success does not establish PostgreSQL transaction, RLS, concurrency, deployment, G0 or Android acceptance.

## Final review and database history audit

A fresh read-only reviewer inspected `709c784..cc74889`. No Critical or Minor findings; two Important findings were confirmed and fixed in one regression pass:

1. Task 2's original one-result-per-task plan conflicted with FR-TASK-04 / endpoint #22. `suggestAssignments` now returns `{ task_id, candidates }` for every OPEN task, retaining up to three ranked evaluations and empty lists. Only the first candidate reserves load/clashes before the next task. Four regression assertions failed on the old behavior; all 38 eligibility cases passed after the first fix.
2. Literal fresh-claim existence could turn a confirmed UNAVAILABLE claim into positive arrival evidence. Conservative precedence now makes explicit member UNAVAILABLE or fresh CONFIRMED UNAVAILABLE FALSE. For urgent NOT_ARRIVED members, only consistent fresh ON_SITE values establish TRUE; negative/mixed evidence remains UNKNOWN. Expired/future/inactive claims still cannot establish readiness. Nine new assertions failed before the fix; all **48 eligibility cases passed** afterward. This tightens the ambiguous §11.3 wording; future claim projection integration must preserve or explicitly revise this precedence.

Following the user's instruction, fetched the entire `database` history again. HEAD advanced to `ac537fa` via `65bef8d` (private-helper regressions), `d6514a3` (resource table) and `ac537fa` (storage history tests). Inspected those commits and scanned all **22 reachable revisions**, including historical SQL paths. Exactly five migration paths and nine private helper functions exist in that history; none provides worker queue/claim/lease/budget/context/result RPCs. Searching history for the worker operations and queue/job identifiers also found no implementation. The new HANDOFF still explicitly requires dedicated worker contracts and denies service_role EXECUTE on the member mutation helpers. Fullstack `b18271d` and mobile `078f9f3` remain unchanged. Task 5 remains dependent on DB contracts; no historical RPC was overlooked or substituted with a private member helper.

Reviewer exclusions and executor rulings:

| Area | Decision and remaining cost |
|---|---|
| RPC atomicity, RLS, fencing, deployment | Pending actual adapter/local DB tests; fake-store results cannot support a production claim. |
| Live model and snapshot truncation quality | Defer to versioned live evaluation; synthetic tests cannot establish semantic quality or context sufficiency. |
| Resource quantities/alternatives | Keep documented conservative contention warnings; feasible allocations may still be flagged. |
| Omitted assignment history/custodian scope | Authoritative snapshot and persistence must supply/check them; incomplete input could mislead the engine. |
| Wording equivalence | FINALIZE structural guards stand; changed prose still needs organizer review and quality evaluation. |
| IDs/secrets embedded in free text | Structured identifiers/secrets are excluded; arbitrary user-authored text is not semantically redacted, so text voluntarily supplied can reach the provider. |

Temporary combined fullstack verification before review fixes passed **248/248 tests in 23 files**, format, API/AI Deno checks and engine compile assertions. Initial offline install could not find cached packages and rebuilt dependencies while checks were running; those format/Deno failures were environmental. Restored both checkouts sequentially with `pnpm install --frozen-lockfile --ignore-scripts`, then reran all affected checks successfully. No source/lock change or new dependency was required. Latest pre-fix remote `cc74889` passed all three [CI jobs](https://github.com/lh6104/WEAVE/actions/runs/43566860797), including secret scan.


Post-review verification on the final source tree:

- `pnpm exec vitest run packages/engine/tests/eligibility.test.ts`: **48/48**.
- `pnpm check`: **234/234 tests, 21 files**, types, AI types, lint and hardcode scan passed.
- `pnpm format:check`, `pnpm typecheck:engine`, `pnpm ai:check`, `git diff --check`: passed.
- Temporary fullstack `b18271d` plus final shared/AI sources: `pnpm check` **259/259 tests, 23 files**; `pnpm format:check` and `pnpm ai:check` passed. API Deno check and frozen install had already passed on the same unchanged API/dependency sources.
- Final diff contains only eligibility implementation/regressions, plan correction and this evidence. `AGENTS.md` and `.env` remain untouched. No extra live call, SQL migration, merge or deployment was performed.

The two Important findings are covered by failing-then-passing regressions; no second review was requested. Four implementation tasks are delivered. The fifth task's audit/review is done, but its real adapter remains blocked on DB-owned worker RPCs. G0/G1/G2 and production acceptance are not claimed.

Remote verification: `31ad69ca8031e5b2792937217a346340079385cd` is present on `origin/ai/wp-0-foundation`; [post-review CI](https://github.com/lh6104/WEAVE/actions/runs/43568683478) completed successfully. Final fetch found no further commits beyond database `ac537fa`, fullstack `b18271d` and mobile `078f9f3`. Only the pre-existing untracked `AGENTS.md` remains outside Git.
