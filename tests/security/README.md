# DB security validation — WP-0-DB

Owner: `lh6104`. Authoritative source: `docs/WEAVE_MVP_Specification.md` §7 and §12. This package changes no migrations, RPCs, application code or fixtures.

## Run the catalog audit

After CODEX-A supplies the full WP-0 schema, apply its migrations to an isolated Supabase local instance. From this worktree, with a local administrative PostgreSQL connection configured through standard libpq environment variables or a password file:

```sh
psql -X -v ON_ERROR_STOP=1 -f tests/security/catalog.sql
```

Do not use staging or production. Do not put passwords, JWTs or signed URLs in command output. The audit uses a read-only transaction and rolls back. Missing tables or roles are failures, never skips. `ON_ERROR_STOP` makes failures exit nonzero. The expected schema is `public`, using the exact table names in §12.2; CODEX-A must confirm that mapping before integration.

Checks: RLS enabled for every §12.2 table; application roles cannot own these tables or bypass RLS; no authenticated write policy (including inherited/PUBLIC and ALL policies); no application TRUNCATE; no column-level/table-level UPDATE or DELETE privilege on the five DB-06 append-only tables. Worker-only analysis updates and project deletion need separate RPC authorization tests. This audit intentionally does not reject ordinary table write grants protected by RLS, except where DB-06 explicitly forbids privileges.

This is a supporting SQL audit, not the required Vitest/PostgREST suite and not evidence that any AT passes. It cannot prove policy predicates, RPC authorization, Storage or Realtime isolation. See `HANDOFF.md` for the remaining tests and contract gaps.

## Observed baseline (2026-11-14)

Base commit `caa79f7` contains specification, ADR and agent skills only. No project AGENTS.md, package manifest, test instructions, Supabase config, seed, migrations or contracts exist. `psql`, `supabase` and `pnpm` are absent from PATH; Node and Docker CLI exist. No DB test has run. No infrastructure was started or deployed.

Antigravity 1.107.0 is installed. `antigravity chat --help` documents ask/edit/agent modes and attached files, but no model selection option. Installed extension metadata exposes no model selection setting. Sonnet 4.6 / Gemini 3.8 Flash availability is unverified; no task was delegated and no model flag was invented. Resume with a supported model-selection interface before delegation.
