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
- Greedy suggestions consider OPEN tasks, critical first then due time, and reserve each selected member's load/critical window before the next task. UNKNOWN remains visible as PENDING_VERIFICATION; only FALSE excludes a candidate. Inputs are never mutated.
- Runtime guards reject malformed projections, project mismatch, duplicate IDs and missing referenced tasks/members. They cannot prove that a caller omitted historical rows; complete server snapshots remain required.
- Boundary decisions: half-open intervals allow adjacent tasks; adjacent availability windows may jointly cover a task; null area IDs earn no location bonus; claim expiry is exclusive and future observations are not fresh; an already-started task remains urgent for NOT_ARRIVED members. Nickname sorting uses deterministic code-point order, with ID only breaking equal nicknames. These decisions need owner review if product expects a locale-specific ordering or different time boundaries.
- RED: targeted suite failed before the implementation module existed. GREEN: **37 focused tests**, full `pnpm check` **163/163 in 18 files**, `pnpm typecheck:engine`, `pnpm format:check`, Deno check of engine exports and `git diff --check` passed. Frozen fixtures prove inputs remain unchanged. No API route or persistent assignment is created by suggestions.

## Outstanding work

Draft validation/gaps and fake-model plan composition are next. DB worker RPCs are absent at the audited SHA; private member mutation helpers do not implement WorkerStore. Production entrypoint remains `INTEGRATION_PENDING` until that dependency is satisfied and tested.
