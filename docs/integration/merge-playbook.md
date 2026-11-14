# Merge playbook: lane branches → `main`

Prepared by the integrator (API & integration lane) from full **merge rehearsals** on
2026-11-14: every lane branch merged into a copy of `main`, conflicts resolved, and every
lane's checks run on the result. Latest rehearsal (rehearsal 2), branch heads used:

| Branch | Owner | Head |
|---|---|---|
| `database` | lh6104 | `d20c5b7` |
| `ai/wp-0-foundation` | TranTungDuong02082006 | `f422b56` |
| `mob/wp-0-mobile-foundation` | dkozTA | `2d24fb6` |
| `fullstack` | Mingpham | `8a75e8b` |

Result after resolution: format, `typecheck`, `typecheck:ai`, `typecheck:engine`, lint,
`check:hardcode`, `api:check` and `ai:check` all pass; **271 / 271 tests pass** (24 files).
In rehearsal 2, `rerere` replayed 19 of the 22 conflicts from rehearsal 1; the other 3 changed
because `database` added `packages/contracts/src/create-project.ts` (see M-5).
The mobile app's own suite was not run in the rehearsal: no mobile file overlaps another
branch, so its result is the same as on its own branch.

Re-run the rehearsal when any branch moves; the file lists below will change.

## Merge order

1. `database` → clean.
2. `ai/wp-0-foundation` → 5 conflicts (below).
3. `mob/wp-0-mobile-foundation` → clean.
4. `fullstack` → 17 conflicts, 3 of which repeat step 2's and resolve the same way.

Turn on `git config rerere.enabled true` first: the integrator's checkout has 22 recorded
resolutions and replays them where the conflicting hunks are unchanged. Always regenerate
`pnpm-lock.yaml` with `pnpm install` even when `rerere` stages an old one.

## Step 2: `database` + `ai/wp-0-foundation`

| File | Take | Why |
|---|---|---|
| `packages/contracts/tests/spec.test.ts` | AI side | Same test, Prettier-formatted and safe under `noUncheckedIndexedAccess` |
| `packages/contracts/tests/types.ts` | AI side | Same assertions, exported so lint does not flag unused types |
| `packages/contracts/tsconfig.json` | AI side | Extends the shared base; root tsconfig already type-checks `tests/types.ts` |
| `packages/contracts/src/index.ts` | AI side + DB side's `create-project.ts` export | AI side exports everything else the DB side exports |
| `packages/contracts/package.json` | Union | AI side + DB side's `test` script and `devDependencies` |

## Step 4: + `fullstack`

| File | Take | Why |
|---|---|---|
| `packages/contracts/src/primitives.ts`, `recovery.ts` | Merged tree (AI) | AI & Engine lane owns them |
| `packages/contracts/package.json`, `src/index.ts` | Merged tree | Already the union from step 2 |
| `packages/contracts/src/contracts.test.ts` | `fullstack` | API lane's file, newer version |
| `.github/workflows/ci.yml` | Merged tree (AI) | `fullstack` jobs + AI checks |
| `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierignore` | Merged tree (AI), then the fix-ups below | `fullstack` + AI additions |
| `package.json` | Union | Merged-tree scripts + `api:serve` from `fullstack` |
| `.gitignore` | `fullstack` | Merged-tree lines + `fullstack` additions |
| `README.md` | `fullstack` + an "AI & Engine lane" section from the AI side | Integrator owns the README |
| `pnpm-lock.yaml` | Regenerate: `pnpm install` | Lockfiles are never hand-merged |

## Fix-ups to include in the final merge commit

These are not text conflicts; the merged tree is wrong without them.

1. **Keep `apps/mobile` out of the root workspace.** The mobile app has its own
   `pnpm-lock.yaml` and installs with `--ignore-workspace` (apps/mobile/README.md), but
   `pnpm-workspace.yaml` includes `apps/*`. Add `- '!apps/mobile'`.
2. **Root tools skip mobile-owned files**, which `apps/mobile` checks with its own toolchain:
   - `.prettierignore`: `apps/mobile`, `tests/fixtures/mobile`
   - `eslint.config.js` ignores: `apps/mobile/**`, `tests/fixtures/mobile/**` (ESLint 10 otherwise
     loads `apps/mobile/eslint.config.cjs`, which needs `eslint-config-expo`)
   - `tsconfig.json` exclude: `apps/**`, `tests/fixtures/mobile/**` (they need JSX settings)
3. **Format four DB-lane files** with Prettier: `packages/contracts/README.md`,
   `packages/contracts/src/create-project.ts`, `packages/contracts/tests/create-project.test.ts`,
   `tests/security/HANDOFF.md`.
4. **Add a mobile CI job** that runs, in `apps/mobile`:
   `pnpm install --ignore-workspace --frozen-lockfile`, then `typecheck`, `lint`, `test`.

## Verify after merging

```bash
pnpm install
pnpm format:check && pnpm typecheck && pnpm typecheck:ai && pnpm typecheck:engine
pnpm lint && pnpm test && pnpm check:hardcode && pnpm api:check && pnpm ai:check
cd apps/mobile && pnpm install --ignore-workspace --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test
```

## Team decisions needed before or right after the merge

| # | Topic | Options | Integrator's recommendation |
|---|---|---|---|
| M-1 | `apps/mobile/src/lib` (API client, hooks) must import `@weave/contracts`, but the app sits outside the workspace | (a) link it: `"@weave/contracts": "link:../../packages/contracts"` in the mobile package; (b) move the app into the workspace with Expo's monorepo setup | (a): keeps the mobile lane's isolated install, one line in its `package.json` |
| M-2 | Idempotency exists twice: DB lane's SQL `begin_idempotent_request` / `save_idempotent_response`, and the `api` middleware store | Keep one | Use the DB lane's SQL functions; the `api` middleware calls them (API lane, WP-1) |
| M-3 | Root tooling and `packages/contracts` were edited on three branches | Integrator owns root config and contracts (spec §15.2, §15.6) | Other lanes propose changes as `contracts/` or integration PRs after the merge |
| M-4 | Who formats files owned by other lanes | Each lane runs `pnpm format` on its own files, or the root ignores them | Each lane formats its own files once the shared Prettier config is on `main` |
| M-5 | Endpoint #3 has two contracts: `fullstack` `CreateProject` (`api/projects.ts`, returns `{project, me}`) and `database` `CreateProjectRequest` / `CreateProjectResponse` (`create-project.ts`, returns `{project_id, owner_member_id, plan_draft_id}`) | Keep one | Keep one endpoint definition in `api/projects.ts`; adopt the DB side's response shape and its `Intl` time-zone check, then delete `create-project.ts` after the merge |
