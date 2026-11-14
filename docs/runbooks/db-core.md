# DB Core handoff — WP-0-DB

Baseline: `caa79f7`, specification v0.3, ADR stack only. No gate is signed.
Branch: `database` (renamed at user request). No migration is supplied in this slice.

## Local configuration

`supabase/config.toml` enables anonymous sessions (FR-AUTH-02), manual identity
linking (FR-AUTH-03), PostgreSQL 17 and Realtime. Email/password and SMS signup
are disabled. Google remains disabled until real environment credentials and
client IDs are supplied by the authentication integration; AT-02/03 are not
claimed. PostgreSQL 17 is a local baseline choice, not an ADR version lock;
align it with staging before the first migration acceptance run.

No hosted project linking, deployment, bucket creation or cron installation is
performed. Storage privacy and Realtime authorization still need migrations.
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
Interactive login is awaiting browser verification; remote linking is not yet
verified. No remote migrations or configuration changes have been applied.
Local CLI link metadata, env files and AGENTS.md are excluded through the
shared `.git/info/exclude`; they must never be staged with `git add -f`.

CODEX-B's catalog handoff has since been incorporated in commit `776fd9c`.
Further security-test edits found in the current worktree are pre-existing and
are deliberately excluded from this setup commit.
