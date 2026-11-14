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
