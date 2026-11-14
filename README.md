# WEAVE

Event coordination for Android. The [MVP specification](docs/WEAVE_MVP_Specification.md)
defines behavior and workstream ownership. This branch contains shared contracts,
AI worker foundations, and readonly inputs for the next engine work package.

## Local checks

Use Node 24 or newer, pnpm 12.18.0 (pinned in `package.json`), and Deno 2.x.

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm check                  # TypeScript, ESLint, unit tests, hardcoded-scenario scan
pnpm typecheck:ai           # Additional strict optional-property checks
pnpm typecheck:engine       # Compile-time engine input assertions
pnpm ai:check               # Deno worker and diagnostic CLI import checks
pnpm test:ai                # Scoped offline AI/engine suite
```

The default test command includes both core and AI projects. These checks require
no model key or hosted database. Keep local secrets in ignored `.env` files.
`api:check` and `mock-api` are shared commands for checkouts containing the API lane;
their implementations are not present on this AI branch.

## Integration status

The production worker returns `INTEGRATION_PENDING` until the database adapter and
module registry are implemented. Local fixtures do not establish database or app
readiness. See [integration evidence](docs/ai/contracts-integration-verification.md)
for verified commands, consumer compatibility, and remaining gates, and the
[AI/DB handoff](docs/ai/2026-11-14-ai-engine-handoff.md) for required worker ports.
