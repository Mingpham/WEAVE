# WP-0-AI — Execution evidence

Branch: `ai/wp-0-foundation`. Plan approved for inline execution; commit each task and inspect other branches before the next. No push, merge, deployment or hosted database changes authorized by this instruction.

## Task 1 — Server config and test foundation

- Baseline: `caa79f7`; no runnable tests existed.
- Branch audit: fetched origin; `database` at `117a935`, `fullstack` and `main` at `caa79f7`. Reviewed DB runbook/security handoff: local configuration and catalog audit exist, canonical schema/RPC/contracts do not.
- Shared test bootstrap is a contribution for API-owner review: pnpm workspace, Vitest, TypeScript. No mobile or API scaffold; no second contracts package. Align these files with future `fullstack` commits.
- Tooling: Node 26.5.0, pnpm 10.28.2, Vitest 5.1.0, TypeScript 6.0.3, Deno 2.9.4. pnpm 12 native install stalled and was cancelled; pnpm 10 JavaScript CLI installed in a temporary directory. No global install.
- RED: `pnpm exec vitest run --config vitest.ai.config.ts supabase/functions/_shared/ai/tests/config.test.ts` failed with missing `../config.ts` before implementation.
- GREEN: `pnpm test` — 16/16 passing. `pnpm typecheck:ai` and `deno check --config supabase/functions/ai-worker/deno.json supabase/functions/_shared/ai/config.ts` passed.
- `git check-ignore .env` matches; `.env.example` is not ignored. `.env` content was not modified or logged. `git diff --check` produced no errors.
- Unit fetch is blocked by default; adapter tests must explicitly inject a fixture transport. This does not claim an OS-level network sandbox.
- No inference, Supabase startup, business integration, FR/AT acceptance or G0 pass is claimed.

## Dependencies still pending

DB worker RPC signatures and canonical shared domain definitions remain unprovided at this checkpoint. The plan's handoff lists required interfaces; proposed ports are not deployed SQL functions. Task 6 database integration must remain pending until actual contracts are available.

## Task 2 — Recovery/AI contracts and fixtures

- Pre-task audit: database advanced to `88ce73e` (isolated local Auth smoke); reviewed its safety rules and handoff. Fullstack still `caa79f7`; no domain schema/RPC to integrate.
- RED: targeted contract/fixture tests failed on missing schema modules. GREEN: `pnpm test` — 30/30; `pnpm typecheck:ai` and Deno check of `packages/contracts/src/ai/index.ts` passed.
- Typecheck caught an incorrect `ZodString` annotation for Zod UUID; changed the schema factory parameter to `ZodType<string>`, then both TypeScript/Deno passed.
- Shared contribution awaiting API-owner review: Recovery/AI schemas, required primitives and Appendix B `POL` defaults in the one contracts package. No independent contract copy.
- Full engine entity snapshot remains pending canonical domain DTOs; WP-0 currently exposes readonly condition-check input, not a fabricated full EngineInput. Wider input projections will be added alongside domain contracts.
- Fixture snapshots are test metadata only; 8 structural fixtures do not constitute the full evaluation dataset or production module validation.

| Contract group | Authoritative fields |
|---|---|
| Action / ConditionCheck / ProposalOption | §9.4; action field bounds §11.5 |
| PlanComposeOutput | §10.3; Appendix B limits |
| ObservationAnalyzeOutput | §10.4; incident enum §7.2 |
| IncidentAssessOutput / ActionDraft | §10.5; Action with typed aliases |
| EventSummarizeOutput | §10.6 |
| AnalysisJob | §7.1/7.3, lifecycle §8.8; nullable revision preserved |
| POL | Appendix B, no tuned values |

## Task 3 — Pure checks, scoped aliases and validation pipeline

- Pre-task audit: database advanced to `8d9c1ee`, including prerequisite `cd57f3b` with canonical ENUMS/POL; fullstack remains baseline. Read the prerequisite and migration handoff; no business tables/RPC yet.
- Adopted exact enums/policy and existing parity/type tests from `cd57f3b` into the same contracts package; retained our AI exports/Zod and root test tooling. No merge/rebase/cherry-pick. Shared ownership review still required.
- RED: three new test suites failed on missing modules. GREEN: `pnpm test` — 46/46; Node typecheck, engine typecheck, upstream consumer-type assertions and Deno checks passed.
- Pipeline requires all three post-schema hooks; absent hooks return MODULE_NOT_READY. No production module validator was registered. Stage failures do not echo exception payloads; wrong aliases stop the entire response.
- Primitive condition aggregation is not complete recovery validation. Empty conditions are rejected. Alias generation is deterministic, project-scoped and leaves its input unchanged.

## Task 4 — OpenRouter transport and safe logging

- Branch audit: reviewed `7237137` and `8f8dfc8` on database; enum/security groundwork only. Fullstack unchanged; no worker RPC supplied.
- RED: adapter and logging test imports failed before implementation. GREEN: `pnpm test` — 63/63; `pnpm typecheck:ai` and `deno check --config supabase/functions/ai-worker/deno.json supabase/functions/_shared/ai/openrouter.ts supabase/functions/_shared/ai/logging.ts` passed.
- Fetch fixture tests verify schema routing, single attempt, HTTP/error envelopes, truncated output, missing usage, cancellation, fetch/body timeout and redirect refusal. Logs exclude raw content/error bodies and never invent cost.
- OpenRouter request shape checked against the official chat-completions reference. Actual key access/model capabilities are still NOT RUN; no inference request was made in this task.

## Task 5 — Worker orchestration with explicit store ports

- Branch audit: database `8f8dfc8`, fullstack `caa79f7` unchanged.
- RED: process/retry suites failed before implementation. GREEN: `pnpm test` — 78/78, `pnpm typecheck:ai` and Deno check of `supabase/functions/ai-worker/process-job.ts` passed.
- Tests cover duplicate delivery, disabled/exhausted budget, bounded retry, schema retry across invocations, stale revision, unrelated version changes, commit/ack crash, unavailable durable logs, lease recovery/fencing and final-slot budget competition.
- Additional checks pin three computation attempts and original alias identity across reloads. No re-call to model on unrelated version changes.
- Port ruling: successful/stale result and inference log must commit atomically. Lost workers only append audit. After three unrelated version conflicts, worker requests manual recovery; this conservative worker behavior needs DB/product review.
- Production module registry remains empty; no fake handler is registered. Test store is not a database implementation and proves no PostgreSQL atomicity.
