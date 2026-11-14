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

| Requirements                                    | Tests to add using real contracts                                                                                                                                                  | Dependency                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| INV-07, FR-MEM-04/06, AT-05/06/07, SEC-09       | Positive owner/member controls and cross-project, pending, removed denial for every §12.2 table using direct PostgREST JWTs; soft-deleted project returns empty                    | WP-0 schema + fixtures              |
| INV-07, FR-EVD-02, AT-23                        | Unrelated participant cannot read private observations/media/events or obtain signed URL; signed URL expires; direct Storage denied; private Realtime authorization                | WP-3 media RPC + API + Realtime     |
| FR-AUTH-03, FR-EVT-01, AT-02                    | Anonymous authenticated user cannot create project; approved participant cannot perform owner-only operations                                                                      | WP-1 RPC + API                      |
| INV-05, FR-EVT-03, DB-09, AT-11/18              | Same-key replay creates one mutation/job; changed payload key conflict; exactly one version increment and atomic log; failed mutation leaves all unchanged                         | Actual idempotency/RPC contracts    |
| INV-01, DB-01/02/03/04/05/10/11, AT-12/14/21/46 | Invalid transitions; stale expected version; two independent sessions competing for assignments; cross-project FK; owner review gates and one payout; closed-project writes denied | WP-1/2/3 RPC                        |
| INV-06, DB-06                                   | Attempt actual UPDATE/DELETE on each append-only table, including column grants; worker allowed only analysis_status; unauthorized worker RPC denied                               | Schema + worker RPC                 |
| INV-04, DB-07/08/09, AT-32/33/34/40             | Incident revision/proposal invalidation atomic; stale approval creates no actions; unrelated state change preserves valid proposal                                                 | WP-4/5 RPC + engine result contract |

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

## Next paired package: foundation security SQL

`tests/security/foundation_security.sql` is ready for CODEX-A's three-table
foundation slice described at `8f8dfc8`. It uses no invented RPC signatures and
creates no substitute business schema. Fixtures follow the specified columns
and canonical enums. Positive controls precede denials, and removal is checked
as both an initial status and an actual change after a successful read.

Validation: missing-table prerequisite failure reproduced against the real enum
migration; the remainder has NOT RUN. Existing supporting suite: 25/25 passed.
This is test-first preparation, not migration acceptance. Do not merge to main
without pairing with the real foundation migration and running on Supabase local.

CODEX-A handoff: supply the migration commit, then run this SQL and the standard
supporting suite. Confirm member/area normalization is automatic for inserts
that omit normalized fields; the checkpoint explicitly requires normalization.
The non-approved self-membership exception follows §12.2, while project/area
rows remain protected. No pending project-title read RPC is assumed. Report any
fixture/contract mismatch instead of weakening RLS assertions. No migration
files were modified by CODEX-B.

Review follow-up: a tool-free Antigravity review claimed SET LOCAL ROLE inside a
DO block would not affect RLS. Disposable PostgreSQL 17 probes verified role
switch/reset, transaction-local claim visibility and RLS filtering across a
repeated DO loop; that claim was rejected. This verifies the test technique,
not the pending WEAVE policies. Other speculative review concerns about
transaction-local fixtures persisting on a failed psql connection were rejected:
all fixture writes are in a single uncommitted transaction.

## Foundation review and HTTP/JWT handoff

LEADER-A/B queue communication is verified. B reported its scope and active test
files before this package and sent A the independently verified review result.
The shared `database` branch now contains A's `e4f5bd1` migration and 19 foundation
checks. Independent rerun passed 44/44, including B's unchanged standalone SQL.
No actionable migration defect was found in this review; no migration source was
changed by B. The earlier NOT RUN checkpoint is superseded for this foundation
SQL harness only, not full Supabase acceptance.

B added `test_foundation_postgrest.py`: eight direct HTTP/JWT checks against the
real migration, all passed independently. Fixture auth schema/UID function and
locally signed JWTs are explicit; this is real PostgREST/RLS, not Supabase Auth.
The new client runs on a private internal network with no published ports, uses
no hosted keys and preserves same-token revocation tests. Missing/forged JWTs
fail, valid owner/member JWTs see exact intended IDs, all three direct table
write endpoints deny with SQLSTATE 42501, and private helpers stay unexposed.

A tool-free subordinate review was inspected. Unsupported claims about hex-token
SQL injection, Python hmac availability and bound class-cleanup dispatch were
rejected. The mutation test was strengthened with authorized reads before the
write denials. An initial network-only setup failure was fixed by leaving Docker
`none`; internal-network publishing limitations were handled by placing clients
inside the network rather than exposing ports. These were harness issues, not
migration defects.

Next A dependency: event_log/idempotency and transactional mutation framework,
with exact RPC signatures/error contract for idempotency, version conflict,
closed-project refusal and atomic rollback tests. B retains tests/security
ownership; A retains all migration/RPC ownership. Keep full SEC-09 matrix,
Supabase local Auth integration and AT/gate acceptance explicitly outstanding.

Combined verification checkpoint: the full security discovery command executed
52 tests in 82 seconds, all passed. This includes 25 original supporting checks,
19 foundation SQL checks and eight direct PostgREST/JWT checks. Supabase Auth
and complete FR/AT/gate acceptance remain unverified.

## Event/idempotency storage candidate validation

LEADER-B collected permanent coverage for `ebb574f`: `storage_fixture.py`,
`test_event_storage.py`, `test_event_reference_races.py`, and two additional
PostgREST cases. No migration file was changed. The eight SQL/race checks and
two new HTTP checks passed independently; combined-suite verification follows.
This supersedes reliance on A's temporary precheck/race scripts.

The isolation guard now has permanent tests for REPEATABLE READ/SERIALIZABLE
DELETE and rekey, allowed READ COMMITTED unreferenced deletion, and both lock
orderings. Lock waits are observed in pg_stat_activity. Historical references,
NULL/foreign array members, same-project actor FK, no write/sequence privileges,
cache PK scope, accidental-read-grant defense, private event visibility and
same-token removal are checked. No actionable defect was found in the candidate
by these checks. Preserve A's isolation/purge-order spec-gap note in the PR.

Next handoff from A: exact canonical mutation/RPC signatures and error contract.
Do not count the `(user_id,key)` primary key as completed mutation idempotency:
replay/hash-conflict, version conflict, event/state atomic rollback and closed
project behavior require those real entry points. B will implement their tests
without editing migration/RPC code. Full SEC-09 and full Supabase acceptance
remain outstanding.

Latest combined storage checkpoint: 62 tests executed in 109 seconds, 62 passed
(52 preceding checks plus four storage, four race, and two new HTTP checks).
No RPC replay/atomicity or full Supabase/AT/gate completion is claimed.

## Private-framework regression collection

B collected permanent tests for A's `3a20a02`: eleven private-helper cases in
`test_mutation_framework.py`, plus a private-RPC-nonexposure HTTP case. These
replace reliance on `/tmp/weave-framework-presence.py`. The independent subsets
passed 11/11 and 1/1. No migration file was changed, and no actionable defect was
found by these checks. Actual project/advisory lock waits precede the competing
commit, avoiding scheduler-based guesses about concurrency.

The private framework's atomicity/replay primitives are now exercised; this is
not public mutation acceptance. Parent endpoints still own scope authorization
before cache replay (including removed/deleted access), source-state checks,
actor-specific permissions, exactly-once finalizer invocation, and domain/engine
delta validation. Public creation/closure/self-leave/worker and closed-project
ledger paths need their dedicated contracts. TTL cleanup and the full Supabase
Auth/SEC-09/AT/gate runs remain outstanding. Ask for real public RPC signatures
before writing those endpoint tests; do not invent them from these private names.

Latest private-framework checkpoint: full security discovery executed 74 tests
in 130 seconds; 74 passed (the preceding 62 plus eleven private-framework
cases and one HTTP nonexposure case). No full public-RPC, Supabase Auth, FR/AT
or gate acceptance is claimed.

## WP-0 plan-storage targeted handoff

Implementation: `867a1f1` (migration `20261114100000_plan_storage.sql`), tested
on B branch based on integrated `0a81896`. Test commit: the commit adding this
entry; A records integrated SHA after collection. Associations: FR-PLAN-01/05/06/07
storage groundwork, INV-06/07, DB-06/11.

Changed files: `test_plan_storage.py`, `test_foundation_postgrest.py`, this handoff.
Five SQL checks cover table RLS, exact owner-only rows in both projects,
participant/pending/removed/outsider denial, owner removal and soft deletion,
project uniqueness/defaults/bounds, scoped draft FK, role values, referenced-draft
deletion restriction, and no app/service direct writes including after accidental
grants. Two HTTP/JWT checks add real owner positive reads, cross-project and anon
denial, same-token revocation and direct table POST/PATCH/DELETE denial with
unchanged rows. Independent source review found no actionable defect in scope.

Executed in isolated disposable PostgreSQL17/PostgREST16.5 with fixture auth:
`python3 tests/security/test_plan_storage.py -v` -> 5/5 passed;
`python3 tests/security/test_foundation_postgrest.py FoundationPostgrestTests.test_INV07_plan_storage_http_owner_only_and_revocation FoundationPostgrestTests.test_DB06_plan_storage_http_write_denial -v` -> 2/2 passed;
`git diff --check` -> passed. No B full-suite rerun under the two-leader workflow.
A: collect once and run full regression on final integration SHA. No migration
changes by B, hosted apply, full FR/AT/gate or Supabase Auth acceptance. Draft
JSON validation, version/transition semantics and compose/publish remain future
real contract/RPC tests. No further decision needed for this storage slice.

## WP-0 invite storage — runnable-path checkpoint

Implementation `fc0f0a4`; B test commit is the commit adding this entry.
FR-MEM-01 storage groundwork, INV-07/DB-11. Only invite SQL/HTTP tests and this
handoff changed by B; A owns migration/RPC/database collection.

Targeted commands: `python3 tests/security/test_project_invites.py -v` (5/5),
and `python3 tests/security/test_foundation_postgrest.py FoundationPostgrestTests.test_INV07_project_invites_http_owner_scope_and_revocation FoundationPostgrestTests.test_INV07_project_invites_http_direct_write_denial -v` (2/2).
Actual runs used isolated PG17/PostgREST16.5 with fixture auth in a temporary tree;
committed migration bytes were verified identical afterward. No B full-suite run.
Code alphabet/partial uniqueness, expiry-not-releasing-code, disable/reuse,
creator composite FK/historical refs, owner-only reads/revocation/deletion and
DML denial passed. Focused migration review found no actionable defect.

DB invite storage is validated; no app operation is yet proven runnable.
A next: collect once and complete the guarded project/invite/join RPC contract
for API connection, prioritizing a real Join path. No invented public signatures,
resolve/join/TTL/rate-limit/FR/AT/G0 or full Supabase Auth completion claim.
