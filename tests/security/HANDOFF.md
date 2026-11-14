# CODEX-A handoff

WP-0-DB supporting audit is independent of RPC implementation. The user explicitly moved work to `database`, where the initial audit was incorporated as `776fd9c`. Do not merge migration-dependent application tests to main ahead of their migrations. Incorporate with the matching migration PR and run against Supabase local. No migration bugs can yet be reported because none exist at baseline `caa79f7`.

## Contract gaps to resolve

1. Supply migration commit, actual schema mapping and all RPC signatures promised by WP-0-DB, including return shapes, SQLSTATE/error mapping and execute grants. No RPC signatures are assumed here.
2. Supply local Supabase setup and Vitest workspace conventions from the API owner. Agree on isolated fixture creation and cleanup; do not share CODEX-A's running database without coordination.
3. Clarify §3/FR-MEM-04 versus §12.2: pending members must see project title while direct projects SELECT requires approved membership. A field projection alone cannot recover a row hidden by RLS. Supply a narrowly authorized read contract (RPC/view/API orchestration to be agreed), without inventing its signature or broadening projects RLS to expose brief/settings.
4. Spec gap: §12.2 author/recipient/involved branches omit explicit approved-membership guards, while INV-07 and AT-07 require immediate revocation on removal. The conservative test expectation follows INV-07/AT-07: removal revokes even former-author access. CODEX-A must explicitly apply the membership/deletion guards and request a matrix clarification in a separate spec PR; no spec file is changed here. No migration defect has been observed yet.
5. Resolve DB-06 service_role grants: the catalog audit checks anon/authenticated only. Specify which worker RPC may update observations.analysis_status and how project deletion is authorized without granting other append-only mutations. Do not blanket-whitelist service_role DELETE as a project-deletion exception.
6. Antigravity selection is now discovered via `agy --model claude-sonnet-4-6`; a tool-free review completed. OpenCode fallback review also completed. See README for accepted findings and validation evidence.

## Behavioral regression queue (all NOT IMPLEMENTED / NOT RUN)

| Requirements | Tests to add using real contracts | Dependency |
|---|---|---|
| INV-07, FR-MEM-04/06, AT-05/06/07, SEC-09 | Positive owner/member controls and cross-project, pending, removed denial for every §12.2 table using direct PostgREST JWTs; soft-deleted project returns empty | WP-0 schema + fixtures |
| INV-07, FR-EVD-02, AT-23 | Unrelated participant cannot read private observations/media/events or obtain signed URL; signed URL expires; direct Storage denied; private Realtime authorization | WP-3 media RPC + API + Realtime |
| FR-AUTH-03, FR-EVT-01, AT-02 | Anonymous authenticated user cannot create project; approved participant cannot perform owner-only operations | WP-1 RPC + API |
| INV-05, FR-EVT-03, DB-09, AT-11/18 | Same-key replay creates one mutation/job; changed payload key conflict; exactly one version increment and atomic log; failed mutation leaves all unchanged | Actual idempotency/RPC contracts |
| INV-01, DB-01/02/03/04/05/10/11, AT-12/14/21/46 | Invalid transitions; stale expected version; two independent sessions competing for assignments; cross-project FK; owner review gates and one payout; closed-project writes denied | WP-1/2/3 RPC |
| INV-06, DB-06 | Attempt actual UPDATE/DELETE on each append-only table, including column grants; worker allowed only analysis_status; unauthorized worker RPC denied | Schema + worker RPC |
| INV-04, DB-07/08/09, AT-32/33/34/40 | Incident revision/proposal invalidation atomic; stale approval creates no actions; unrelated state change preserves valid proposal | WP-4/5 RPC + engine result contract |

For every denial, first prove the fixture is visible to an authorized user so an empty table cannot falsely pass. Check permitted reads and mutations as well as denials. Concurrency tests must use separate sessions. Compare before/after rows, event logs, jobs and state_version for rollback tests. Do not count catalog checks as completion of these cases.

Seed and metrics changes are deferred: there is no current schema/runtime to validate seed repeatability, and metrics belongs to WP-6-DB. Reference-scenario API seed is owned by the API workstream (§15.3).

## Current completed package

Audit regression harness: `python3 tests/security/test_catalog.py -v`, 18/18 passing on real PostgreSQL 17. These are tests of the catalog validator with intentionally minimal isolated fixtures; they do not complete any acceptance test or DB business invariant. Docker context `default` works; the earlier desktop-linux socket failure is not evidence that Docker is unavailable.

The enum/policy contracts and CODEX-A's first enum-only migration are now available. Behavioral integration still requires the business-table migration and canonical RPC/request contracts. Then run the catalog audit on Supabase local, and build the positive/negative direct PostgREST matrix against actual fixture contracts. Do not use the linked hosted production project for this test harness.

## Supporting environment continuation

Added `local_auth_smoke.py` for an isolated reduced Supabase stack: anonymous
signup/user lookup/refresh, runtime provider settings and PostgREST readiness.
Related requirements: FR-AUTH-02/03 and WP-0-DB environment preparation; none is
claimed complete. No canonical application table, enum or RPC was invented.
Readiness is not RLS evidence. See README for commands and actual run boundaries.

The supporting regression command now passes 19/19. A real local HTTP regression
caught automatic credential forwarding on redirects; the smoke client now
refuses redirects (SEC-02). OpenCode's earlier catalog review and a tool-free
Antigravity Sonnet review were inspected; the latter's speculative claim that
local `status` contacts the hosted API was not accepted without evidence.

Local startup checkpoint (2026-11-14): the isolated core `supabase start`
attempt timed out after 420 seconds while pulling
`supabase/postgres:17.11.0.018`; no core container became ready.
The standalone smoke command failed setup, executed zero test cases, and is
reported as NOT RUN rather than passed. The HTTP-client and catalog regressions
remain independently verified. A fresh runtime run is required after the image
is available; full business security tests additionally require actual schema
and canonical contracts.

## CODEX-A enum slice incorporated

`database` includes contracts `cd57f3b` and migration `8d9c1ee`. The six enum
checks are now tracked at `tests/security/test_domain_enums.py`, included in the
standard 25-test security regression command. No migration or contracts source
was changed by CODEX-B. This replaces reliance on `/tmp/weave-domain-enums-test.py`.

CODEX-A has finished enum groundwork only, not WP-0-DB or the DB workstream.
Next paired slice: projects/members/areas tables, cross-project keys and membership
helpers with RLS. Supply actual fixture fields and RPC/read contracts before
CODEX-B writes positive/negative cross-project, PENDING and REMOVED tests. The
pending-member title projection and removed-author matrix gaps remain open.
Keep contracts review by Mingpham as a prerequisite to merging into main.
