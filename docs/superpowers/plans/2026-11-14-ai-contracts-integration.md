# AI Contracts and Tooling Integration Plan

> **For agentic workers:** Use `executing-plans` inline; commit each task and inspect remote branches before the next. User authorized implementation after the progress report. Keep existing branch and logs; do not merge other branches or modify `.env` / `AGENTS.md`.

**Goal:** Make the AI foundation compatible with fullstack contracts/tooling and prepare typed inputs for WP-1.

**Architecture:** Adopt shared API contracts from `origin/fullstack` at `e85f07a`, retain AI schemas and compatibility exports, and use one canonical enum source. Verify API compatibility in a temporary archive overlay without changing Git ancestry or importing API product code into this lane.

**Tech Stack:** Existing TypeScript 6.0.3/Zod 4.6.7; align dev tooling with fullstack pnpm 12.18.0/Vitest 4.1.12/ESLint/Prettier. No new production dependency.

**Spec:** `docs/WEAVE_MVP_Specification.md` §§7, 9.4, 10, 11.3, 15; previous WP-0 plan and `docs/ai/2026-11-14-ai-engine-handoff.md`. This implements the next task approved in conversation, not later business modules or SQL RPCs.

## Global Constraints

- Native inline work; no repeated approval request for this scope. Use a fresh final reviewer as required by executing-plans.
- Maintain all current AI strictness and worker tests. Do not silently change model schemas/prompts or run more live inference.
- Shared contracts are a reviewable contribution for API/DB owners, not a claim of owner sign-off.
- Use current branch `ai/wp-0-foundation`; explicit task commits. Push this branch after validation under the user's standing remote-publication instruction; no force-push/merge/rebase.
- Preserve API datetime input compatibility; keep model timestamps UTC. Do not infer an engine snapshot from role-filtered API views.
- DB worker integration remains pending until actual RPC contracts exist. Do not invent signatures, migrations or successful adapters.

## Review Focus

1. Root and AI subpath exports must compile for existing API and worker consumers; Task 1 uses runtime and type consumer checks.
2. Canonical enums must preserve all PostgreSQL names/values and readonly legacy consumers; Task 1 runs spec parity and type assertions.
3. Recovery aliases must retain UUID/alias separation, action bounds and model UTC schema; Task 1 adds offset/rank/bounds regressions and compares generated model schemas.
4. WP-1 engine inputs must be readonly and include member availability/status, assignment history and presence-claim freshness without user credentials; Task 2 uses compile-time consumer examples.
5. Default CI must include AI tests without live networking, while API tests may use injected fetch; Task 3 checks discovered test suites and runs a temporary fullstack overlay.

### Task 1: Reconcile shared contracts

**Files:** `packages/contracts/src/{enums,policy,common,entities,plan,recovery,errors,event-types,realtime,index}.ts`, `src/api/*`, existing AI jobs/primitives, package metadata, contracts tests, integration evidence.

**Interfaces:** Preserve upstream `Action`, `ConditionCheck`, `ProposalOption`, `DB_ENUMS`, all API exports; retain `*Schema`, `ENUMS`, `DomainEnumValue`, `./ai`, `./enums`, `./policy`. `ENUMS` is derived from canonical Zod enum options, never a second literal source.

- [ ] Write/run consumer regressions: import upstream recovery values and API schemas alongside AI; offset datetimes accepted by persisted Action while ActionDraft remains UTC; rank must be positive or null; ADD_TASK retains §11.5 bounds; unexpected fields rejected. Expected RED on missing exports before adoption.
- [ ] Adopt API-owned contract files and their tests at pinned upstream SHA; reconcile Recovery locally, share UUID/enum schemas, retain unchanged model JSON schema. Add type-only reexports to avoid JobType export collisions.
- [ ] Run `pnpm test`, targeted upstream contracts tests, AI Node typecheck, consumer typecheck and Deno contracts/worker check. Expected all pass; compare all four model schemas with pre-change snapshots.
- [ ] Record source attribution/decisions, review diff and commit `[WP-0-AI] Align shared contracts with fullstack consumers`.

### Task 2: Define readonly WP-1 engine inputs

**Files:** `packages/engine/src/{inputs,index}.ts`, `packages/engine/tests/input-types.ts`, dedicated typecheck config, evidence.

**Interfaces:** `EligibilityInput` contains project_id, supplied now, readonly members/tasks/assignments/presence_claims. Member/task/assignment field types come from canonical shared views/enums; explicit project scope and presence-claim metadata come from §7.3. `DraftValidationInput` carries readonly PlanDraft and project bounds. These are internal types, not a route payload or complete future engine snapshot.

- [ ] Write compile-time consumers proving required availability/status/history/freshness and nested readonly fields; remove those fields or mutate arrays under `@ts-expect-error`. Expected RED before types exist.
- [ ] Implement type-only projections; no runtime IO, new validation behavior, algorithm, or fake default for omitted data.
- [ ] Run dedicated TypeScript assertions, engine typecheck, full tests, and Deno import check. Expected pass; document mapping to source fields and next WP-1 rules.
- [ ] Commit `[WP-0-AI] Define readonly inputs for WP-1 engine rules`.

### Task 3: Align tooling and verify combined consumers

**Files:** root package/lock/workspace/TS/Vitest/ESLint/Prettier config, AI configs, shared hardcode script/fixture, `.github/workflows/ci.yml`, integration verification docs; format only newly adopted/shared and AI-owned code as required by common formatter.

**Interfaces:** `pnpm test` discovers API/contracts/engine/AI/evals; `test:ai` remains scoped. AI project setup blocks unmocked fetch without altering API tests. `check` includes type/lint/unit/hardcode; worker/CLI Deno checks separate. Shared CI tests AI and API when the latter exists; missing real DB integration is never represented as passing.

- [ ] Adopt pinned dev tool versions; install in task-local tools if system pnpm absent. Preserve Zod runtime dependency and existing package scripts/exports.
- [ ] Configure distinct Vitest projects and Node/Deno includes; test discovery must contain upstream contracts plus every previous AI suite. Run representative failure sentinels in disposable copies to verify AI tests cannot silently disappear.
- [ ] Run frozen install, format check, typecheck, lint, full tests, hardcode scan and offline Deno checks. Fix actual integration failures without weakening validation or ignoring owned source.
- [ ] Build a disposable archive of upstream fullstack, overlay shared/AI changes, install using pinned tooling and run upstream API/mock tests with AI, Node checks and both Deno entrypoints. No `.env`, Git merge, hosted DB or live provider call.
- [ ] Record exact results and pending DB/owner gates, commit, fresh final review, regression-fix important findings, then push current AI branch and verify remote SHA.
