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
