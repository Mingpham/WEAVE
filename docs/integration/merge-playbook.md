# Merge playbook: lane branches → `main`

Prepared by the integrator (API & integration lane) from a full **merge rehearsal** on
2026-11-14: every lane branch merged into a copy of `main`, conflicts resolved, and every
lane's checks run on the result. Branch heads used:

| Branch | Owner | Head |
|---|---|---|
| `database` | lh6104 | `ac537fa` |
| `ai/wp-0-foundation` | TranTungDuong02082006 | `8bff2f5` |
| `mob/wp-0-mobile-foundation` | dkozTA | `078f9f3` |
| `fullstack` | Mingpham | `b18271d` |

Result after resolution: format, `typecheck`, `typecheck:ai`, `typecheck:engine`, lint,
`check:hardcode`, `api:check` and `ai:check` all pass; **258 / 258 tests pass** (23 files).
The mobile app's own suite was not run in the rehearsal: no mobile file overlaps another
branch, so its result is the same as on its own branch.

Re-run the rehearsal when any branch moves; the file lists below will change.

## Merge order

1. `database` → clean.
2. `ai/wp-0-foundation` → 5 conflicts (below).
3. `mob/wp-0-mobile-foundation` → clean.
4. `fullstack` → 17 conflicts, 3 of which repeat step 2's and resolve the same way.

Turn on `git config rerere.enabled true` first: the integrator's checkout has the rehearsal's
19 resolutions recorded and replays them where the conflicting hunks are unchanged.

## Step 2: `database` + `ai/wp-0-foundation`

| File | Take | Why |
|---|---|---|
| `packages/contracts/tests/spec.test.ts` | AI side | Same test, Prettier-formatted and safe under `noUncheckedIndexedAccess` |
| `packages/contracts/tests/types.ts` | AI side | Same assertions, exported so lint does not flag unused types |
| `packages/contracts/tsconfig.json` | AI side | Extends the shared base; root tsconfig already type-checks `tests/types.ts` |
| `packages/contracts/src/index.ts` | AI side | Exports everything the DB side exports, plus AI and API modules |
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
3. **Format two Markdown files** with Prettier: `packages/contracts/README.md`,
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
