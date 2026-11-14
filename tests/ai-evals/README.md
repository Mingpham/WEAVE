# AI evaluation foundation

Run structural fixtures offline with `pnpm test:ai`. The default unit runner blocks fetch.
Each module has `smoke.json` and `invalid.json` with fixed input metadata, model output,
schema/prompt version and a code-checkable expectation. `loadEvalCase` is test-only.

These are synthetic book-exchange fixtures, not the reference event and not production
prompts. A structurally valid fixture does not establish groundedness, business validity,
model accuracy or an acceptance-test pass. Module snapshot builders and business validators
are completed in their scheduled work packages. Fixture snapshots are not production DTOs.

The §10.10 datasets (30 plan, 120 evidence, 80 claims/incidents, 40 probe, 60 recovery,
30 injection cases) and quality thresholds are pending. Set thresholds after a real
baseline and record model, prompt/schema version, input checksum, usage and latency.
Live smoke/evals are explicit opt-in commands, never part of default CI.

## Bounded live transport smoke

Requires Deno, installed workspace dependencies and local `.env` with `LLM_API_KEY`,
`LLM_BASE_URL`, `LLM_MODEL`. Run from the repository root. Each command spends at
most one request, with a 35-second timeout and 256 output tokens. Run text first;
stop on unsupported schema/model or quota failure. Never automatically change models.

```bash
deno run --config supabase/functions/ai-worker/deno.json --env-file=.env --allow-env=LLM_API_KEY,LLM_BASE_URL,LLM_MODEL --allow-net=openrouter.ai --allow-read=tests/ai-evals tests/ai-evals/live-smoke.ts --case text-schema --max-calls 1 --max-output-tokens 256
deno run --config supabase/functions/ai-worker/deno.json --env-file=.env --allow-env=LLM_API_KEY,LLM_BASE_URL,LLM_MODEL --allow-net=openrouter.ai --allow-read=tests/ai-evals tests/ai-evals/live-smoke.ts --case image-schema --max-calls 1 --max-output-tokens 256
```

`wp0-smoke-v1` uses a diagnostic schema, not a production module prompt.
`synthetic-red-square.png` is a generated 64×64 RGB image with every pixel `(255,0,0)`,
encoded as PNG with Python's standard `struct`/`zlib` libraries. It contains no user media.
Text success means the model returned exactly `{ "ok": true }`; image success means
exactly `{ "color": "red" }`. Neither case proves evidence-analysis quality.

The CLI emits only selected metadata: model IDs, prompt/schema version, input checksum,
usage if returned, latency, status and safe error codes. Record its output alongside
the commit, dirty state, tool versions and test results in `docs/ai/wp-0-verification.md`.
No credentials, raw response, prompt, signed URL or invented cost belongs in that report.
