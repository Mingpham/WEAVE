# Mobile UI completion tasks

Scope confirmed by dkozTA: keep the existing ownership split; finish Mobile UI first. Work on `mob/wp-0-mobile-foundation`, commit completed tasks individually. Do not substitute fixture data for real service results.

| Task | Scope | Status |
|---|---|---|
| UI-00 | NativeWind web initialization | Completed; focused delayed-CSS check passed; commit `6f66481` |
| UI-01 | Product routes, navigation, auth/join entry and typed presentation handoff; remove preview entry from app | UI source complete; included in the product-routing commit containing this document |
| UI-02 | Onboarding/event/profile input controls and validation | UI source complete; `7c42b44` |
| UI-03 | Planning/resources editing, selection, empty states and confirmations | UI source complete; `66c0dcd` |
| UI-04 | Work/review/evidence terminal states, accessible controls and failure recovery | UI source complete; `5a9b985` |
| UI-05 | Incident/recovery direct answers, confirmations and final shared-state integration | UI source complete; `504e2a2` |

## Branch information checked

After `git fetch origin --prune`:

- `origin/main`: `caa79f7`, specification baseline.
- `origin/fullstack`: `b18271d`, canonical contracts, API foundation and mock API. No `apps/mobile/src/lib` or SCR-17/19/20/26 source exists on this branch.
- `origin/ai/wp-0-foundation`: `5e2107f`, engine eligibility/assignment work plus AI/recovery contracts.
- `origin/database`: `4a1603a`, database foundation/isolation work.

These branches were inspected with `git show`/`git ls-tree`; no branch checkout, merge, rebase, shared-workspace or owner-source edits were made. Mobile presentation follows the current canonical field constraints where available. The data adapter, runtime policy values and server validation remain team-owned.

## Integration boundary

Product routes render real presentation bindings supplied by the team data provider. Missing bindings produce an unavailable/error state, never an empty successful result or a simulated mutation. Fixtures remain development/test assets outside product routing. Removing a preview entry is not evidence of backend integration.

The team still supplies session restoration/auth actions, query/mutation/upload/persistence/realtime hooks, and four owner screens. No Mobile UI task will be marked as a real-service acceptance pass without those dependencies and device evidence.

## Delivery evidence and limit

The source for these six UI tasks is committed independently. TypeScript passed after final changes; full ESLint passed before the last small changes and affected-file lint passed afterward. Six behavior-test files passed (16 tests); the exported web artifact passed the no-fixture boundary check. No dependency or shared workspace change was needed.

These task statuses describe Mobile UI source completion. They do not close the real integration, Android visual/device acceptance or APK requirements. The last native build failed; no new build was started. Full screen inventory, interfaces and remaining acceptance work are in `FRONTEND_STATUS.md`; current run commands are in `README.md`.
