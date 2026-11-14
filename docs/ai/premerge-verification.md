# AI pre-merge verification — 2026-11-14

## Scope and source revisions

This check fixes the ITEM quantity defect and rehearses integration in an isolated local clone. It does not merge or push another lane, deploy, invoke a live model, or apply SQL migrations. Existing `.env` and `AGENTS.md` remain untouched.

| Lane | Source commit |
|---|---|
| AI | `f422b565399f770c5f8709810f97fcef88d69e2c` |
| Database | `0a81896b73e4fc41b9af03190ae668b0fb792fa3` |
| Fullstack | `8a75e8b58d794eaf3a870792a39a995f5eeaeab7` |
| Mobile | `078f9f3326519438514fffeb3e511791fc3a1ff6` |

## Quantity regression

FR-RES-01 / §7.3 and `resources_supply_quantity` require ITEM quantity to be null. The engine now reports `INVALID_RESOURCE_QUANTITY` at the resource field before a derived write. Three tests failed on the prior implementation. The fix passes 66 focused tests and 244 total tests. Tests cover manual ITEM 0/3 rejection, SUPPLY null/0/positive preservation, model-output rejection and locked-object restoration before business validation. Model JSON schema and prompt remain unchanged; no prompt-version bump is needed for this engine-only rule.

`pnpm check`, `pnpm format:check`, `pnpm typecheck:engine`, `pnpm ai:check` and `git diff --check` passed. [CI for the code fix](https://github.com/lh6104/WEAVE/actions/runs/43570341982) passed. The offline plan evaluation has 36/36 passing cases, no live inference.

## Integration procedure

Follow `docs/integration/merge-playbook.md` from fullstack. Rehearsed DB → AI → Mobile → Fullstack in a temporary clone. Resolved five DB/AI conflicts and seventeen API conflicts using the playbook's per-file choices, preserving DB test scripts and AI exports/checks. One explicit integration adjustment aligns contracts TypeScript from DB 6.0.2 to the root/API/AI compiler 6.0.3; no production dependency is added. Root package scripts include API serve and AI checks. The root lockfile is regenerated from the combined manifests and `pnpm install --frozen-lockfile --offline` passed; the mobile lockfile stays unchanged.

Root tooling excludes the independently installed mobile package and its fixtures. A separate mobile CI job runs its frozen install, types, lint and tests. These changes belong to the integrator's resolved tree, not to deployment configuration. The accompanying integration patch will apply after conflict resolution; inspect it before applying. It includes the generated root lockfile for these exact revisions; regenerate that lockfile if manifests change.

## Boundaries

A successful source rehearsal does not establish PostgreSQL/RLS acceptance, Android APK/device behavior or production AI readiness. DB-specific tests and native builds are outside this pre-merge AI fix. Worker entrypoint remains fail-closed until real worker RPCs exist. The contracts link for future mobile API hooks and authoritative DB idempotency entrypoints still belong to their owning lanes; private member helpers are not directly callable service-role worker RPCs.


## Combined root results

- `pnpm check`: **268/268 tests in 23 files**, core/AI types, lint and hardcode scan passed.
- `pnpm format:check`, `pnpm typecheck:engine`, `pnpm api:check`, `pnpm ai:check`, `git diff --check`: passed.
- DB canonical `enums.ts` and `policy.ts` remain byte-identical to the DB source revision.
- Root install initially stalled on registry metadata resets; offline installation identified uncached DB compiler 6.0.2. A direct CDN attempt also timed out. The final compiler alignment above removes duplicate root compiler versions and installs successfully from cache. An early check before dependencies finished failed with `tsc: command not found`; only the complete rerun is counted as passing.

Apply [integration fix-ups](./integration-fixups.patch) only to the resolved combined tree described above:

```sh
git apply --check docs/ai/integration-fixups.patch
git apply docs/ai/integration-fixups.patch
pnpm install --frozen-lockfile
pnpm check && pnpm format:check && pnpm typecheck:engine && pnpm api:check && pnpm ai:check
```

The patch was generated from the rehearsal diff, including the pnpm-generated lockfile; it was not manually composed. Reverse-apply checking on the rehearsed tree confirms its exact content. The added mobile CI job is prepared for the integrated branch; it has not been executed by GitHub Actions on this temporary clone.


## Mobile check remains blocked by dependency downloads

`CI=true pnpm install --ignore-workspace --frozen-lockfile` in `apps/mobile` did not complete. It reached 900/913 added packages, then repeatedly received ECONNRESET/ETIMEDOUT on registry tarballs including TypeScript 5.9.3, Hermes, debugger frontend, lightningcss and material-symbols fonts. The install was interrupted after repeated retries; downloaded cache and temporary checkout are retained. No mobile typecheck/lint/test result is claimed, and no Android build was attempted. Do not treat unchanged source as proof that the mobile suite passes.

Reproduction on the resolved integrated tree:

```sh
cd apps/mobile
CI=true pnpm install --ignore-workspace --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
```

For this local attempt, the preserved checkout is `/private/tmp/weave-premerge-7bpqentc`. This is a diagnostic artifact location, not application configuration. The compiler adjustment and integration fix-ups are proposals for the integrator's merge commit, not changes already applied to `main`.

## Verdict

The AI quantity defect is fixed, committed and pushed; its 244-test suite and hosted CI pass. The resolved combined root passes 268 tests and all stated static checks. Before signing off the entire integrated merge, apply/review the supplied fix-ups and complete the separate mobile checks when package downloads work. Real worker integration remains a later dependency on DB RPCs. No other branch or `main` was changed.
