# DB Core handoff — WP-0-DB

Baseline: `caa79f7`, specification v0.3, ADR stack only. No gate is signed.
Branch: `database` (renamed at user request). An enum-only migration is now available; business tables and RPCs remain pending.

## Local configuration

`supabase/config.toml` enables anonymous sessions (FR-AUTH-02), manual identity
linking (FR-AUTH-03), PostgreSQL 17 and Realtime. Email/password and SMS signup
are disabled. Google remains disabled until real environment credentials and
client IDs are supplied by the authentication integration; AT-02/03 are not
claimed. PostgreSQL 17 is a local baseline choice, not an ADR version lock;
align it with staging before the first migration acceptance run.

Hosted project linking was subsequently authorized and completed (see below).
No deployment, bucket creation or cron installation was performed. Storage privacy and Realtime authorization still need migrations.
Seed execution is disabled: reference-event data must be created via API.
Use a distinct project_id and free ports for each concurrent agent local stack.

Once Supabase CLI and Docker are available, run from this worktree:

```sh
DOCKER_CONTEXT=default npx --yes supabase@3.1.0 start
DOCKER_CONTEXT=default npx --yes supabase@3.1.0 db reset --local
DOCKER_CONTEXT=default npx --yes supabase@3.1.0 test db
```

Full startup/reset/security tests have NOT passed yet. The selected desktop-linux
Docker context points to an absent socket; the default context is reachable
(Docker 29.9.3). Use the per-command context override above rather than changing
the global context shared with other agents. CLI 3.1.0 is now available through
npx; its parser accepted the config. Startup requires initial service-image pulls.
TOML assertions alone do not demonstrate working auth or database RLS.

## Dependency-aware backlog

| Package | DB tasks in order | Dependency / acceptance |
| --- | --- | --- |
| WP-0-DB | Local config; schema/enums/FKs/indexes + RLS; transaction helpers; all RPC stubs | Canonical contracts first; CODEX-B security tests before migration PR; G0/NFR-14 |
| WP-1-DB | Project create/update; invites; join/decision/profile/remove/leave; private Realtime policies | WP-0 schema and contracts; AT-01–07,43 |
| WP-2-DB | Draft edit/compose/apply/publish; areas/resources | WP-0 schema, draft and engine result contracts; AT-08–13 |
| WP-3-DB | Tasks/dependencies/offers/respond/release/start; media; observations/submissions/review/ledger; offer expiry | WP-0 framework + WP-1 membership + WP-2 plan; AT-14,15,17–26,44,45 |
| WP-4-DB | Incident/link/unknown/request RPCs; probe expiry | WP-3 observations, engine result contracts; AT-16,27–31 |
| WP-5-DB | Proposal commit/decision/manual decision; actions; resolution | WP-4 incident revisions, recovery contracts; AT-32–41 |
| WP-6-DB | Reports/CSV SQL; deletion; metrics; complete security audit | Earlier RPCs and lifecycle data; AT-42,46–51 + regression |

Gates must pass in order; later DB work can proceed against documented contracts
without waiting for route/mobile/AI implementations. WP-2–5 must support AI off.

## Immediate unblock requests / interface handoff

1. Mingpham owns initializing `packages/contracts`: enums §7.2, event types §9.7,
   requests/responses §9.3–4 and policy constants. Exit condition: reviewed canonical
   contracts commit available on main (or agreed dependency branch). DB must not
   invent a second canonical contract set or edit this API-owned path.
2. CODEX-B: supply branch/commit or patch for tests/security in an independent
   worktree. Coordinate exact migration/RPC signatures before writing fixtures.
   CODEX-B commit `5cc039b8157309abc52b12945e90a9c781542747` now supplies a
   catalog audit and handoff. Reviewed read-only; intentionally not cherry-picked:
   its handoff requires integration with the corresponding migration. Behavioral
   security tests and canonical RPC signatures are still required.
3. DB next: compare canonical enums, then add first schema slice and RLS with
   CODEX-B tests. Split WP-0 into small reviewed migrations; never edit merged SQL.

Framework acceptance must cover INV-01/04/05/06/07 and DB-01–11: project lock,
expected_state_version, exactly one version increment per commit, event append,
user/key/hash replay and conflict, rollback, closed/deleted projects, composite
project FKs, and direct PostgREST denial. Worker RPC EXECUTE is service_role only;
user RPCs check auth.uid(), approved membership, role and transition. D-17 engine
inference remains in TypeScript; SQL validates and applies its scoped delta.

## Antigravity review

Installed `agy models` lists `claude-sonnet-4-6` and Gemini 3.8 Flash variants.
Sonnet performed a tool-free prerequisite review; it correctly highlighted the
need for an explicit owner and exit condition for the missing contracts. Those
are recorded above. Its claim that the owner was undefined was rejected: §15.2
already assigns contracts to Mingpham. No quota exhaustion or model switch
occurred. The first tool-based review was auto-denied by headless permissions.

## Validation status

No existing tests, migrations, RPCs, package manifests, CI or gate evidence were
present at baseline. This slice completes configuration preparation only, not
WP-0-DB, any FR or any AT. Security tests remain CODEX-B owned. No PR or merge
has been performed.


## Continuation: local startup and OpenCode review

CLI 3.1.0 warned that `[auth.email]` and `[auth.sms]` `enable_signup` are
 deprecated; both now use `enabled = false`. Global `auth.enable_signup`
remains true for anonymous signup. A regression assertion failed before the
change (`email: current provider-disable key missing`); seven auth assertions
passed after it. CLI status parsing produced no deprecation warnings, but its
runtime status must not be counted as a successful stack startup.

OpenCode discovery confirmed `run --model provider/model`. A tool-free Gemini
3.8 Flash request failed for insufficient balance. The same review completed
using `opencode/glm-5.3-flash-free`; no files were delegated for editing. Reviewed
follow-ups: verify runtime provider settings; leave Google disabled pending real
credentials; keep each agent's project ID, ports and auth fixtures independent.
The review is not runtime evidence. No change to CODEX-B's worktree was made.


## Hosted project setup (user requested)

Target project ref: `qjfiaynqszghzwpxshfe`. Use CLI 3.1.0 from this worktree:

```sh
npx --yes supabase@3.1.0 login --agent no --output-format text
npx --yes supabase@3.1.0 link --project-ref qjfiaynqszghzwpxshfe
```

Initialization is already complete: `supabase init` reports that config.toml
exists. Do not use `--force` to replace the reviewed local configuration.
The initial link attempt failed with `AccessTokenRequiredError`; account login
must complete first. A publishable API key is not a CLI account access token.
Account login subsequently completed. Retrying the link command exited 0 and
reported target kind `linked`, project ref `qjfiaynqszghzwpxshfe`, environment
`unverified`. Local `supabase/.temp/project-ref` matches the requested project.
This verifies the CLI link only; remote schema and acceptance checks have not
been run. No remote migrations or configuration changes have been applied.
Local CLI link metadata, env files and AGENTS.md are excluded through the
shared `.git/info/exclude`; they must never be staged with `git add -f`.

CODEX-B's catalog handoff has since been incorporated in commit `776fd9c`.
Further security-test edits found in the current worktree are pre-existing and
are deliberately excluded from this setup commit.


Login/link completion validation: `supabase@3.1.0 link --project-ref
qjfiaynqszghzwpxshfe` exited 0; expected project-ref metadata assertion passed;
`git check-ignore` confirms AGENTS.md and local project-ref metadata are ignored.
No credential or publishable key was added to the repository. Existing
security-test edits remain outside this setup commit.


## WP-0-DB: domain enum migration

`supabase/migrations/20261114050000_domain_enums.sql` creates the 49 canonical
PostgreSQL enum types from §7.2 after the contracts prerequisite commit. No table,
policy, RPC, inference or hosted change is included. Mingpham must review the
contracts prerequisite before dependent migration changes merge to main.

Validation on disposable `postgres:17-alpine`, with no network, published ports
or persistent data: six automated checks passed. They cover exact ordered
catalog parity with contracts, acceptance of all canonical values, rejection of
unknown values for every enum, application-role ALTER denial (INV-07 support),
transaction rollback, and absence of business tables. The parity test was
observed failing on an empty catalog before migration creation. This is WP-0
schema groundwork; no product FR, AT or gate is claimed complete.

CODEX-B handoff: the executed regression harness is available locally at
`/tmp/weave-domain-enums-test.py`. Re-run with:

```sh
python3 /tmp/weave-domain-enums-test.py /path/to/WEAVE
```

CODEX-B has now integrated this coverage as
`tests/security/test_domain_enums.py` in commit `7237137`. The six enum checks
are part of the tracked supporting suite. Existing security-test edits were preserved. SQL review found no
correctness issues. Full Supabase CLI reset and hosted acceptance remain unrun.

Next slice: projects/members/areas foundation, project-scoped foreign keys and
membership helpers with RLS, paired with CODEX-B's positive/negative isolation
fixtures in the same final PR. Resolve pending-member read projection and the
removed-author access spec gaps in the handoff before exposing reads. Do not
implement business inference in PL/pgSQL (D-17).


## Consolidated supporting checkpoint

CODEX-B completed its current supporting package in `7237137` (enum migration
regressions), following `117a935` (catalog audit) and `88ce73e` (local-auth tooling).
Independent verification after collection:

```sh
python3 -m unittest discover -s tests/security -p 'test_*.py' -v
```

Actual result: 25 executed, 25 passed (18 catalog checks, six enum checks, one
HTTP redirect safety check). These do not include the three standalone Supabase
auth smoke cases, any RPC behavior or direct PostgREST application RLS matrix.
No AT or gate is signed. No hosted migration was applied.

### Next DB slice / CODEX-B fixture contract

Implement projects, members and areas from §7.3 together, including circular
member-area and reviewer references using composite project-scoped FKs. Use
§7.1 UUID/timestamptz defaults, native canonical enums and row version defaults.
Normalize nickname/area names; enforce uniqueness by project and active
membership status as specified. Do not introduce hardcoded scenario fixtures.

Membership policy helpers must avoid RLS recursion and pin their search path;
check the session UID, approved membership and project soft deletion. Reads:
projects and areas require approved membership; approved member rows are visible
to approved members; other member rows are owner/self only on live projects.
Pending membership must not expose project brief/settings via direct SELECT.
No application INSERT/UPDATE/DELETE policies. Creation/membership mutations and
the narrowly authorized pending-project-title read remain later RPC work.

CODEX-B test handoff for that slice: positive owner/member reads; unrelated and
cross-project denial; pending self membership versus hidden projects/areas;
removed and soft-deleted project denial; nickname/area normalization uniqueness;
cross-project current_area_id and decided_by FK rejection; direct write denial;
no policy recursion. Pair these tests with the table migration in the same final
PR. The existing 33-table catalog audit is expected to fail until full WP-0 schema
exists and must not be weakened merely to pass an incremental slice.


## WP-0-DB implemented foundation slice

Migration `20261114060000_membership_foundation.sql` adds `projects`, `members`
and `areas` with §7.1 defaults, canonical enum columns, normalized nickname/area
names, uniqueness indexes, at most one approved owner per project, and project-scoped
foreign keys for area/reviewer references. RLS is enabled on all three tables.
Only SELECT is granted to authenticated/service roles; direct writes are revoked
and no application write policy exists. Mutation RPCs are not supplied here.

The non-exposed `weave_private` schema contains `is_member(uuid)`,
`is_owner(uuid)` and `can_read_member(uuid)`. These stable definer helpers pin an
empty search path, inspect auth.uid(), exclude soft-deleted projects and avoid
recursive RLS. Future DB policies should reuse these schema-qualified helpers.
The explicit §12.2 own-membership exception permits pending/removed users to
read their own membership row, while project and area reads remain denied.
Pending-project title access still needs a narrowly authorized RPC contract.

Security coverage accompanies the migration:
`tests/security/test_membership_foundation.py` supplies direct SQL role/session
checks and consumes CODEX-B's unchanged `foundation_security.sql` patch. The
collected SQL patch SHA-256 is
`aa519153be9b3f7c9954f3243cd6239a2257be72fc1041886f6d44d5f3eab837`.
Both test files must remain with the migration in any final PR.

Validation uses disposable PostgreSQL 17 with no network, published ports or
persistent data. Its minimal auth.users/auth.uid fixture is not Supabase Auth.
The initial schema assertion failed (zero protected tables before implementation).
Coverage includes exact row IDs across projects, positive reads, pending/removed
self rows, anonymous/missing-UID denial, immediate removal, soft deletion,
normalized uniqueness, valid and invalid project-scoped FKs, app write denial,
service-role write grants, helper security and generated-column nullability.
Review found a symmetric-fixture count weakness; exact-ID and explicit
other-project queries were added before the final run.

Command: `python3 -m unittest discover -s tests/security -p 'test_*.py' -v`.
Final result: 44/44 passed, including 19 foundation checks and the prior 25
supporting regressions. SQL review found no remaining actionable issues.
This supports INV-01/07, DB-11, FR-EVT-01, FR-MEM-02/04/06 and FR-RES-06 groundwork;
AT-05/06/07, full FR completion and G0 are not claimed. No hosted changes ran.
Supabase/PostgREST JWT acceptance and CODEX-B's final migration-PR review remain.

Next: remaining WP-0 schema groups, starting with event_log/idempotency storage
and the transactional mutation framework. Future RPCs must validate IANA zones,
policy caps, availability, consent, versions, transitions and idempotency, append
events and increment state_version exactly once. Do not add SQL business inference.


## Planned next slice: WP-0 event log / idempotency storage

Implement `20261114070000_event_log_idempotency.sql` against existing foundation.
`event_log` follows §7.3: project/created_at, bigserial ID, version, text event type,
canonical actor/visibility enums, composite actor FK, payload and involved-member
array. Timeline and actor indexes; array integrity checks must reject unknown or
cross-project members and preserve historical removed-member references. Reads
require a live project and approved membership, then ALL/owner/INVOLVED scope.
`idempotency_keys` has created_at and PK(user_id,key), operation/hash and stored
response, no project or synthetic ID. No application read/write policies.
Revoke direct writes/sequence usage for app and service roles; service SELECT is
for trusted backend inspection only. No public mutation RPC, replay/TTL worker,
state-version increment or event-type inference is implemented by storage alone.

LEADER-B was successfully queued via the default Codex account (thread
01a1d81a-af7d-7650-a957-e9e4acdf2a0a) with this schema and a test-first assignment.
Tests belong to its isolated worktree; collect its patch before the migration PR.
Execution plan: observe missing-table regression, implement storage/constraints,
run B's isolation and integrity checks, independent SQL review, full supporting
suite, commit and fast-forward local database. No push or hosted migration.


### Storage implementation review checkpoint

The missing-table regression failed before implementation (0 instead of 2).
Both tables subsequently applied with RLS on disposable PostgreSQL 17. No
mutation/replay/TTL behavior is claimed by this storage check.

Review reproduced a stale-snapshot defect in reverse array-reference checks:
a REPEATABLE READ snapshot taken before another transaction commits an event
could miss the reference and delete the involved member. The trigger now raises
40001 on actual member DELETE/id/project changes outside READ COMMITTED; normal
profile/status updates or unchanged identities are unaffected. At READ COMMITTED,
forward KEY SHARE locks and the reverse trigger's fresh lookup protect references.

Spec gap: §7.1 permits trigger checks for scoped references but does not specify
isolation requirements for array references. Proposed clarification for §17:
member hard deletion/identity changes use READ COMMITTED with scoped reference
checks, or require equivalent native-FK protection before stronger snapshots are
supported. Future project purge must delete event rows before referenced members.
No public delete RPC exists in this slice; no existing app behavior is changed.

LEADER-B owns accompanying test collection; no migration PR or hosted apply is
authorized by this local checkpoint. Final test results will be recorded after
its patch and independent review are collected.


### Candidate validation / pending security integration

The storage candidate was independently checked using
`/tmp/weave-storage-precheck.py` against all three migrations. Final run:
23/23 checks passed (19 inherited foundation checks plus four storage checks).
These cover scoped event visibility and soft deletion, cache key scoping and
app read denial, write/sequence privileges, cross-project/unknown/NULL member
references, and historical removed-member references. The earlier presence
check failed before migration creation. The independent concurrency artifact
`/tmp/weave-event-reference-review.py` passed all four race/order checks after
reproducing the stale-snapshot defect before the guard.

These are local validation artifacts, not a replacement for LEADER-B's tracked
security suite. Its test assignment and both artifact paths were successfully
queued to the peer thread through the default-account CLI; no response/patch
has arrived at this checkpoint. Keep this as a local candidate: do not submit
its migration PR until B's accompanying security tests are collected in the same
PR and permanent regressions cover the isolation guard. No FR, AT, G0 or
transaction/idempotency replay behavior is claimed complete. No remote changes.


## WP-0-DB private mutation framework candidate

`20261114080000_mutation_framework.sql` adds four private SECURITY INVOKER
helpers, all pinned to an empty search path, with EXECUTE revoked from PUBLIC,
anon, authenticated and service_role. These are not public mutation RPCs:

```sql
weave_private.lock_project_for_mutation(
  p_project_id uuid, p_expected_state_version bigint,
  p_require_owner boolean DEFAULT false
) RETURNS public.projects
weave_private.begin_idempotent_request(
  p_key uuid, p_operation text, p_request_hash text
) RETURNS public.idempotency_keys
weave_private.save_idempotent_response(
  p_key uuid, p_operation text, p_request_hash text,
  p_response_status integer, p_response_body jsonb
) RETURNS public.idempotency_keys
weave_private.finish_project_mutation(
  p_project_id uuid, p_expected_state_version bigint, p_event_type text,
  p_visibility public.log_visibility, p_payload jsonb DEFAULT '{}',
  p_involved_member_ids uuid[] DEFAULT '{}', p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS bigint
```

The project lock authenticates auth.uid(), requires approved membership on a
live/open project, optionally owner authorization, and compares the required
nonnegative expected state version under row lock. A missing/inaccessible project
returns NOT_FOUND. VERSION_CONFLICT includes JSON DETAIL with current version.
The cache helpers validate UUIDv4 keys and nonempty operation/hash, serialize by
transaction-level advisory lock of user/key, compare operation+hash, and preserve
the first stored response. Cache miss returns a NULL composite. The finalizer
rechecks the project, derives its MEMBER actor from auth.uid(), increments version
and inserts the event in one function. Event failure rolls that operation back.

Required guarded-endpoint order: authenticate/authorize endpoint scope before
revealing any cached response; obtain key lock/check replay; lock project;
validate source state and domain permissions; apply main change plus validated
engine delta; call finalizer exactly once; save response; return in the same
transaction. Do not catch an error and commit partial business data. Never pass
client-authoritative event types, actors or engine validity through unchecked.

Both entry helpers require READ COMMITTED (40001 otherwise), preventing stale
cache snapshots after advisory-lock waits. Parent endpoints remain responsible
for scope authorization on replay, exactly one finalization per mutation, and
source-state checks. Worker writes, project creation/closure, self-leave and
closed-project ledger changes need dedicated guarded paths: ordinary finalizer
requires the actor still be APPROVED and project still open. No public endpoint,
worker actor path, TTL cleanup, three-attempt engine retry loop or complete
FR/AT behavior is provided by this candidate. D-17 inference remains TypeScript.

P0001 MESSAGE codes: UNAUTHENTICATED, NOT_FOUND, FORBIDDEN, PROJECT_CLOSED,
VERSION_CONFLICT, VALIDATION_FAILED and IDEMPOTENCY_KEY_REUSED. Future API mapping
must use §9.2. SQL reference constraints retain their native SQLSTATEs.

Test handoff: exact signatures/error semantics were queued to LEADER-B before
implementation. `/tmp/weave-framework-presence.py` recorded missing helper RED
(0 instead of 4), then passed migration application and six focused private-helper
checks: authorization/version/closed guards, atomic version+event+cache, immutable
cache replay/conflicts, rollback of delta/version/cache after bad event, private
execute/isolation guards, competing expected versions and concurrent same-key
replay. Permanent framework tests remain B-owned; candidate PR remains gated on
those tests and review. No hosted changes or main merge have been performed.


Framework validation checkpoint: 26/26 full-chain local checks passed using
`python3 /tmp/weave-framework-presence.py /path/to/WEAVE` (19 foundation plus
presence and six targeted framework tests). The tracked regression command
`python3 -m unittest discover -s tests/security -p 'test_*.py' -v` independently
passed 52/52, including B's direct PostgREST/JWT cases. The fixture is not Supabase
Auth, so these are not full product AT/G0 results. Final SQL review found no
remaining actionable issue. Existing tracked tests do not replace B's pending
permanent framework regressions: keep this local candidate out of a migration PR
until that test handoff is collected. No public write route was exposed.


## Collected framework/security checkpoint and resources candidate

LEADER-B commit `65bef8d` is already on database; do not cherry-pick it again.
It supplies eleven permanent helper cases and one additional HTTP nonexposure
case, with a reported combined 74/74 pass. Together with `4a1603a`, the earlier
storage/framework candidates now have paired tracked regressions. This is still
supporting SQL/PostgREST validation with fixture auth, not full Supabase Auth,
public mutation RPC, TTL/special lifecycle-path or FR/AT/G0 acceptance.

Next schema dependency slice: `20261114090000_resources.sql` adds the §7.3
resources table using existing projects/areas/members and canonical enums. It
provides project-scoped area/custodian FKs and indexes, category lookup index,
version/default constraints and approved-live-membership SELECT policy. Direct
app/service writes and TRUNCATE are revoked; no application write policy exists.
Condition and location remain stored projections; no inference trigger is added.

Quantity interpretation: §7.3 declares a nullable integer usable only for SUPPLY.
Accordingly unknown SUPPLY quantity remains NULL, known quantity is nonnegative,
and ITEM quantity must be NULL. Historical same-project custodians remain valid
references; no current approval restriction is invented for this nullable FK.
Resource names are not unique: multiple separately tracked items can share one.
Area deletion is prevented by the FK while a resource still references it.

The missing-RLS-table assertion failed (0 rather than 1) before implementation.
Five targeted local tests then passed: exact role/project IDs and revocation,
quantity/defaults, scoped FK positives/negatives, area deletion and write denial.
Independent SQL review found no actionable issue. The final full-chain command is
`python3 /tmp/weave-resources-check.py /path/to/WEAVE`; result: 24/24 passed (19
foundation plus five resource checks), using disposable PostgreSQL 17 with minimal
auth fixtures. These local artifacts are not B's permanent resource test suite.

A queued the exact schema/test contract to LEADER-B before writing SQL and
provided the isolated migration path and local artifact. New resource SQL/HTTP
tests remain B-owned. Keep this local resource candidate out of a migration PR
until those tests are paired; no hosted migration or public write RPC was run.
Scope supports FR-RES-01/03/06 and INV-01/07/DB-11 groundwork only. No full FR,
AT or gate completion is claimed. Future write RPCs enforce row/project versions,
limits and authorized projection deltas through the existing private framework.
