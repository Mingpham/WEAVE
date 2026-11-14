# AI / API contracts integration evidence

Base AI commit: `6e5ccb5`. Shared upstream: `origin/fullstack` at `e85f07a`; database at `e4f5bd1`. Scope approved in conversation: reconcile shared contracts/tooling and prepare engine inputs. No branch merge, database mutation or live inference.

## Task 1 — Shared contracts

- Adopted API-owned contract files and existing tests from `e85f07a`; preserved Recovery/AI implementation, subpath exports and runtime dependency Zod 4.6.7. No API route implementation was copied.
- Canonical enums are upstream Zod schemas. Legacy readonly `ENUMS` and `DomainEnumValue` derive from them; no duplicate enum literals. Upstream `DB_ENUMS` and public API exports coexist with AI exports.
- Recovery value exports now work for API consumers alongside `*Schema` names. Persisted actions accept ISO offsets like API inputs; model drafts retain UTC-only timestamps and typed aliases. Stored option rank is positive or null. Recovery ADD_TASK keeps §11.5 bounds (500 description characters, 1–4 criteria), rather than ordinary-task limits.
- RED: four consumer tests failed on missing API-compatible exports. GREEN: `pnpm test` 124/124 across 16 files; `pnpm typecheck:ai`; consumer `tsc` assertions; Deno check of contracts root and worker entrypoint all passed.
- Serialized JSON schemas for all four AI modules compared byte-for-byte equal before/after using `modelJsonSchema`. No prompt/schema version bump or live eval is needed for unchanged model schemas.
- Owner review remains required. This is compatible source contribution, not evidence that remote branches have merged.
