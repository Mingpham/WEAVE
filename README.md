# WEAVE

Android app that helps a 5–50 person team run an event on site: work that is done **with
evidence**, early warning when the **plan breaks**, **asking the right person** for missing facts,
and **valid recovery options** for the organizer to approve.

- **Product spec (source of truth):** [`docs/WEAVE_MVP_Specification.md`](docs/WEAVE_MVP_Specification.md)
- **Stack and library versions:** [`WEAVE_4_0_Stack_Lock_ADR.md`](WEAVE_4_0_Stack_Lock_ADR.md)
- **Open contract decisions:** [`docs/contracts/spec-gaps.md`](docs/contracts/spec-gaps.md)

> Status: **milestone 0 (foundation) in progress.** Contracts, `api` skeleton, mock API and CI
> exist. Migrations (DB lane), the Expo app (Mobile lane) and the AI worker (AI lane) are not in
> the repo yet, so the "build the app" and "seed" steps below are not available yet.

## Repository layout

```text
apps/mobile/            Expo app (Mobile lane; src/lib = API & integration lane)        — not yet created
packages/contracts/     Zod schemas, enums, API DTOs, POL.* constants — shared by everything
packages/engine/        Deterministic engine, pure TypeScript (AI & Engine lane)        — not yet created
supabase/
  config.toml           Local Supabase config (DB lane)
  migrations/           SQL migrations + RLS (DB lane)                                   — not yet created
  functions/api/        The single API Edge Function (Hono) — every /v1 route
  functions/ai-worker/  Queue consumer (AI & Engine lane)                                — not yet created
tools/mock-api/         In-memory API with the same routes/schemas, for building screens without a backend
tests/fixtures/         Fixtures and reference-scenario data (the only place scenario data may live)
scripts/                CI helpers (check-hardcode.mjs)
docs/                   Spec, gate reports, runbooks
```

Ownership per folder is in [`.github/CODEOWNERS`](.github/CODEOWNERS) (spec §15.2).

## Prerequisites

| Tool                         | Version                            | Notes                                |
| ---------------------------- | ---------------------------------- | ------------------------------------ |
| Node.js                      | 24                                 |                                      |
| pnpm                         | 10.28 (pinned by `packageManager`) | `corepack enable pnpm`               |
| Docker Desktop               | running                            | needed by `supabase start`           |
| Supabase CLI                 | 3.x                                | `brew install supabase/tap/supabase` |
| Deno                         | 2.x                                | type-checks the Edge Functions       |
| JDK                          | 17                                 | Android builds (set `JAVA_HOME`)     |
| Android SDK + platform-tools | via Android Studio                 | set `ANDROID_HOME`; `adb` on `PATH`  |
| EAS CLI                      | latest                             | development builds                   |
| Maestro                      | 2.x                                | mobile E2E (spec §14.1)              |

## First-time setup

```bash
git clone https://github.com/lh6104/WEAVE.git && cd WEAVE
corepack enable pnpm
pnpm install
pnpm check         # typecheck + lint + unit tests + INV-11 hardcode check
pnpm api:check     # Deno type-check of the api Edge Function
```

Local Supabase (Docker must be running):

```bash
supabase start     # prints the local API URL and keys
supabase stop
```

Never commit `.env` files or keys (SEC-01). Model and service-role keys exist only as Edge
Function secrets (`supabase secrets set …`), never as `EXPO_PUBLIC_*`.

## Everyday commands

| Command                                        | What it does                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm test`                                    | All Vitest tests                                                  |
| `pnpm vitest run packages/contracts`           | Tests of one package                                              |
| `pnpm vitest run -t "FR-MEM-02"`               | Only tests whose name contains an ID                              |
| `pnpm test:watch`                              | Watch mode                                                        |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Types / ESLint / Prettier                                         |
| `pnpm check:hardcode`                          | Fails if reference-scenario names appear in product code (INV-11) |
| `pnpm api:check`                               | `deno check` of `supabase/functions/api`                          |
| `pnpm api:serve`                               | Serve `api` on local Supabase (`supabase start` first)            |
| `pnpm mock-api`                                | Mock API on `http://0.0.0.0:8787/functions/v1/api`                |

### Mock API

`pnpm mock-api` serves the same routes, validation and envelope as the real `api`, backed by
memory and seeded from [`tests/fixtures/mock-api/seed.json`](tests/fixtures/mock-api/seed.json).
Authenticate with a fixture token: `Authorization: Bearer mock-organizer` (also
`mock-participant`, `mock-pending`, `mock-guest`). Mutations need `X-Idempotency-Key: <uuid v4>`.

```bash
curl -H 'Authorization: Bearer mock-participant' http://127.0.0.1:8787/functions/v1/api/v1/me
```

A phone on the same Wi-Fi reaches it at `http://<your-computer-LAN-IP>:8787/functions/v1/api`.
State resets on restart. Set `MOCK_FIXTURE=/path/to/seed.json` or `PORT` to override.

## API conventions (spec §9.1)

- Base path `/functions/v1/api`, every route under `/v1`. The app talks **only** to `api` (plus
  Realtime subscriptions and signed-URL uploads).
- `Authorization: Bearer <jwt>` on every route; `X-Idempotency-Key` on every POST/PATCH/PUT/DELETE.
- Success: `{ "data": …, "meta": { "state_version": n } }`. Error: `{ "error": { "code", "message", "details" } }`.
- Request and response schemas come from `packages/contracts` — never redeclare types elsewhere.

## Working rules (spec §15.6, §16)

- Contracts first: every enum / type / schema change starts in `packages/contracts`.
- Merge order for cross-lane changes: contracts → migration/RPC → route → screen.
- Test names carry the requirement ID: `it('FR-TASK-05 concurrent accept …')`.
- No reference-scenario names, IDs or text in `apps/`, `packages/`, `supabase/functions/`.
- PR titles: `[WP-1-API] FR-MEM-02 invite routes`. Describe what you actually ran and the results.
