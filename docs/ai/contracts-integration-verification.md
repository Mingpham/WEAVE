# AI / API contracts integration evidence

Base AI commit: `6e5ccb5`. Shared upstream: `origin/fullstack` at `e85f07a`; database at `e4f5bd1`. Scope approved in conversation: reconcile shared contracts/tooling and prepare engine inputs. No branch merge, database mutation or live inference.

## Task 1 — Shared contracts

- Adopted API-owned contract files and existing tests from `e85f07a`; preserved Recovery/AI implementation, subpath exports and runtime dependency Zod 4.6.7. No API route implementation was copied.
- Canonical enums are upstream Zod schemas. Legacy readonly `ENUMS` and `DomainEnumValue` derive from them; no duplicate enum literals. Upstream `DB_ENUMS` and public API exports coexist with AI exports.
- Recovery value exports now work for API consumers alongside `*Schema` names. Persisted actions accept ISO offsets like API inputs; model drafts retain UTC-only timestamps and typed aliases. Stored option rank is positive or null. Recovery ADD_TASK keeps §11.5 bounds (500 description characters, 1–4 criteria), rather than ordinary-task limits.
- RED: four consumer tests failed on missing API-compatible exports. GREEN: `pnpm test` 124/124 across 16 files; `pnpm typecheck:ai`; consumer `tsc` assertions; Deno check of contracts root and worker entrypoint all passed.
- Serialized JSON schemas for all four AI modules compared byte-for-byte equal before/after using `modelJsonSchema`. No prompt/schema version bump or live eval is needed for unchanged model schemas.
- Owner review remains required. This is compatible source contribution, not evidence that remote branches have merged.

## Task 2 — WP-1 engine input types

- Pre-task fetch: database advanced to `4829191`, adding real PostgREST/JWT checks over the foundation migration (handoff reports 52 security tests); inspected commit and handoff. No worker RPC was added. Fullstack remains `e85f07a`.
- `EligibilityInput` uses explicit project scope and caller-supplied time. Member fields derive from `MemberSelf` with credentials/consent excluded; tasks from `TaskView`; assignments from `AssignmentView` with historical statuses retained. Presence claims carry status and expiry from §7.3, so the engine can compute freshness itself.
- `DraftValidationInput` uses canonical `PlanDraft` and project time/role boundaries. Both inputs are deeply readonly. These are compile-time internal projections; they neither validate raw DB responses nor assert completeness/project isolation at runtime. Snapshot builders must enforce those boundaries when implemented.
- RED: compile-only consumer checks failed on missing input exports. GREEN: `pnpm exec tsc --noEmit -p packages/engine/tsconfig.type-tests.json`; `pnpm typecheck:ai`; full tests 124/124; Deno check of engine entrypoint passed. Assertions cover missing availability/status/history/freshness and attempted mutations of nested windows, tags and draft criteria.
- Next business work: §11.3 eligibility/ranking and draft validation/gaps. No algorithm, real snapshot adapter or full future engine input is claimed here.

## Task 3 — Shared tooling and combined consumers

- Adopted fullstack's pnpm 12.18.0, TypeScript 6.0.3, Vitest 4.1.12, ESLint and Prettier configuration, hardcode scan, and CI. Local verification used Node 26.5.0 and Deno 2.9.4; CI targets Node 24. Production dependency Zod remains 4.6.7.
- Default Vitest now has separate `core` and `ai` projects. AI's fetch guard stays scoped to AI tests. Existing API and mock-server test globs remain enabled; scoped `test:ai` remains available. CI checks the API entrypoint when present and always checks the worker/diagnostic CLI. The latter imports code without running inference.
- First dependency installation failed pnpm's minimum-release-age policy: the previous AI lock selected `@rolldown/pluginutils@1.1.1` and `postcss@8.5.33`, published within 24 hours. Regenerated from the pinned fullstack lock using its accepted versions 1.1.0/8.5.32. Supply-chain policy stayed enabled; subsequent frozen install passed.
- Applied the shared formatter to AI-owned files. Comparing each previous TypeScript file after formatting against its working copy confirmed production AI/engine changes in this task are formatting only. Additional test edits make indexed accesses and compile-only assertions compatible with upstream strict typing/lint. All four generated model JSON schemas still equal their pre-integration snapshots.

Commands on this AI branch (all passed):

| Command | Outcome |
|---|---|
| `pnpm install --frozen-lockfile` | Lockfile accepted; no dependency resolution required |
| `pnpm check` | Typecheck, lint, 124 tests in 16 files, hardcode scan passed |
| `pnpm format:check` | All checked files formatted |
| `pnpm typecheck:ai` | Strict AI production typecheck passed |
| `pnpm typecheck:engine` | Readonly/required-field assertions passed |
| `pnpm ai:check` | Worker and diagnostic CLI Deno check passed |
| `git diff --check` | No whitespace errors |

Combined-consumer verification used a temporary archive of fullstack `e85f07a` with the current shared/AI source and tooling overlaid; no `.env`, `.git`, hosted database, or live provider call. API/mock implementation files remained upstream originals. The combined workspace adds the `tools/mock-api` lock importer and its dependencies, so its lock was regenerated with `pnpm install --no-frozen-lockfile`, then verified with `pnpm install --frozen-lockfile`. A real merge must reconcile that importer too.

- `pnpm check`: **149/149 tests in 18 files**, including real API/mock tests and all AI suites; types, lint and hardcode scan passed. `pnpm format:check`, `pnpm api:check`, and `pnpm ai:check` also passed. Deno required permission to download pinned dependency metadata before the checks could finish.
- Discovery regression: a temporary failing AI sentinel made default `pnpm test` exit 1 with the sentinel failure. A second run proved AI fetch is blocked while core fetch works, using `data:` URLs only; **151/151** passed including the two probes. Probes were removed from the temporary checkout after verification. They are not production tests or evidence of a provider call.
- Logs, schema snapshots and the overlay file manifest are preserved in the local, ignored plan workspace. Existing `AGENTS.md` and `.env` were not changed or staged.

## Remaining integration gates

Remote branch audit before Tasks 2 and 3: fullstack `e85f07a`, database `4829191`. Database's new JWT/security test result is reported by that lane, not rerun here. Worker RPCs and their atomic lease/budget/commit behavior remain unavailable; the real adapter, DB concurrency/rollback tests, hosted CI result and owner review remain pending. Temporary combined tests do not constitute a merge or full MVP acceptance.

Next AI & Engine implementation: WP-1 eligibility/ranking and plan-draft validation/gaps, followed by `plan_compose` snapshot/validators with fake model fixtures. Implement the real worker adapter when reviewed RPC signatures and DB integration fixtures exist.

## Final review and concurrent branch changes

An independent fresh reviewer assessed `6e5ccb5..64402b5` and found no Critical, Important or Minor findings. Its independent `pnpm check` passed 124/124 tests plus types/lint/hardcode. Runtime snapshot completeness, future business algorithms, DB atomicity, hosted CI and broad upstream endpoint acceptance were outside this review; the reviewer did not independently repeat the author's overlay/schema checks.

The final fetch discovered concurrent work after the pinned baseline:

- Fullstack `b18271d` moved back to pnpm 10.28.2/Vitest 5.1.0 to match the previously published AI branch. It now keeps DB-owned tuple `ENUMS`/`POL` files and builds Zod enums in `enum-schemas.ts`, with API limits in `limits.ts`. This contribution was already implemented and reviewed against `e85f07a`; its toolchain and shared module arrangement therefore still need reconciliation with that new commit before a real merge. Do not describe the latest branches as conflict-free or fully aligned.
- The complete API/mock runtime delta in `b18271d` is two files: `write-loop.ts` removes parameter properties, and mock-api starts with Node instead of tsx. Updated both in the temporary combined checkout while retaining this contribution's shared contracts/tooling. Frozen install, `pnpm check` (**149/149**) and `pnpm api:check` passed again. This verifies latest runtime consumers against these exports, not all shared files or the other toolchain.
- Database `4a1603a` includes private mutation/idempotency helpers from `3a20a02` plus event/storage race tests. Its handoff reports **62/62** security tests; these were not run by AI. Helpers explicitly exclude worker actor paths, so they do not unblock the worker adapter yet.
- Mobile `1ea4289` adds a visual prototype on top of frontend preview/Android packaging `9b2a391`. Commits inspected; mobile validation was not run here.

Immediate coordination item: choose one shared toolchain and enum/limits module arrangement with API/DB owners, preserving combined AI discovery and strict model schemas. The next business task remains WP-1 engine rules. Existing `.env`, `AGENTS.md`, logs and branches are preserved.
