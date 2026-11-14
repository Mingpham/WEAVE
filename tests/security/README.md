# DB security validation — WP-0-DB

Owner: `lh6104`. Authoritative source: `docs/WEAVE_MVP_Specification.md` §7 and §12. This package changes no migrations, RPCs, application code or fixtures.

## Run the catalog audit

After CODEX-A supplies the full WP-0 schema, apply its migrations to an isolated Supabase local instance. From this worktree, with a local administrative PostgreSQL connection configured through standard libpq environment variables or a password file:

```sh
psql -X -v ON_ERROR_STOP=1 -f tests/security/catalog.sql
```

Do not use staging or production. Do not put passwords, JWTs or signed URLs in command output. The audit uses a read-only transaction and rolls back. Missing tables or roles are failures, never skips. `ON_ERROR_STOP` makes failures exit nonzero. The expected schema is `public`, using the exact table names in §12.2; CODEX-A must confirm that mapping before integration.

Checks: RLS enabled for every §12.2 table; application roles cannot own these tables or bypass RLS; no `anon`/`authenticated` write policy (including inherited/PUBLIC and ALL policies); no permissive SELECT policy for either role on the four service-only tables; no application TRUNCATE; no column-level/table-level UPDATE or DELETE privilege for `anon`/`authenticated` on the five DB-06 append-only tables. The audit also checks reachable roles with BYPASSRLS and ownership through inherited or settable memberships (PostgreSQL 17). Restrictive write policies are rejected under the literal no-write-policy rule in §12.1, even when their predicate denies rows. SELECT policies on service-only tables are rejected conservatively even if their predicates currently deny rows; use no permissive read policy there. Worker-only analysis updates, project deletion, and `service_role` append-only grants need separate contract review and RPC authorization tests; this audit does not validate them. This audit intentionally does not reject ordinary table write grants protected by RLS, except where DB-06 explicitly forbids privileges.

This is a supporting SQL audit, not the required Vitest/PostgREST suite and not evidence that any AT passes. It cannot prove policy predicates, RPC authorization, Storage or Realtime isolation. See `HANDOFF.md` for the remaining tests and contract gaps.

## Regression tests for the audit

```sh
python3 tests/security/test_catalog.py -v
```

This dependency-free Python harness validates the SQL audit itself, using real PostgreSQL 17 catalogs. It is a supporting utility, not a replacement for the required Vitest + Supabase local application security suite. Docker must have `postgres:17-alpine` locally; the command never pulls an image. It uses context `default` unless `WEAVE_TEST_DOCKER_CONTEXT` is set. It creates a uniquely named, temporary container with no network, no published ports and a tmpfs data directory; cleanup removes only that container. Each case gets a separate database. No project database or hosted project is used.

The 18 cases cover a passing baseline plus missing tables, disabled RLS, anon/authenticated/PUBLIC write policies, column-level UPDATE and DELETE grants, TRUNCATE, direct and settable BYPASSRLS, table ownership, service-only SELECT policies, and unusable role memberships. Positive controls allow ordinary SELECT policies and service-only SELECT grants protected by RLS with no policies. Minimal tables are deliberate catalog fixtures, not a mock WEAVE migration or proof of business behavior.

## Validation checkpoint (2026-11-14)

- Before the audit correction: 18 executed, 13 passed, 5 failed, reproducing missed anon writes, missed worker-table reads, missed settable BYPASSRLS, and a false failure for unusable membership.
- After correction: 18 executed, 18 passed on a disposable PostgreSQL 17 container. This includes parsing and executing `catalog.sql` against real PostgreSQL.
- Application security tests, Supabase local tests, transaction invariants and AT-05/06/07/23 remain NOT RUN: schema, canonical contracts, RPC signatures and Vitest setup are still absent.
- User explicitly selected the shared `database` branch. Initial audit commit `5cc039b` was incorporated as `776fd9c`; only `tests/security/` is changed by this work package.

## Subordinate reviews

OpenCode supports `run --model`. Gemini 3.8 Flash failed for insufficient balance. `opencode/deepseek-v4.1-flash-free` completed a read-only review; its actionable catalog findings were reproduced with the regression tests before correction. No worker edited files.

Antigravity has a separate `agy` CLI: `agy models` lists `claude-sonnet-4-6`, and `agy --model claude-sonnet-4-6 --print` completed a tool-free interpretation review. Its claim that `is_involved` was undefined was rejected: §12.1 defines it. The worker-role concern is recorded as a contract gap. Neither subordinate review constitutes runtime verification.
