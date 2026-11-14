# Contracts & API — spec gaps (WP-0-API)

Spec §16 rule 4: where the spec is silent or ambiguous, pick the most conservative option that
keeps every invariant, record it, and propose a line for §17. Each item below needs a team
decision; until then the choice shown is what `packages/contracts`, `api` and `tools/mock-api`
implement.

| # | Where | Gap | Chosen for now | Proposal for §17 | Needs |
|---|---|---|---|---|---|
| G-01 | FR-EVT-01, #3 | `members.nickname` is NOT NULL, but creating a project has no nickname field for the owner. | Mock derives it from the Google email local part (`Organizer` fallback). | Add `owner_nickname` (2–24) to the #3 body. | Team; Mobile (SCR-07 field) |
| G-02 | §9.7 | §9.7 lists event types by example; some endpoints have no listed type. | Added `PROJECT_UPDATED`, `PROJECT_DELETED`, `INVITE_CREATED`, `INVITE_DISABLED`, `PLAN_COMPOSE_REQUESTED`, `PLAN_DRAFT_UPDATED`, `MEMBER_REJECTED`, `MEMBER_LEFT`, `MEMBER_UPDATED`. §9.7 says the contracts enum is canonical. | Confirm the additions. | DB (event_log writers) |
| G-03 | FR-FEED-01 | Attention Queue item kinds and group identifiers are not named. | `AttentionGroup` (5 groups) and `AttentionKind` (17 kinds) in `entities.ts`, one per bullet of FR-FEED-01. | Confirm names. | Mobile (SCR-11), AI (incident items) |
| G-04 | §9.1 | Error code for a missing / malformed `X-Idempotency-Key` is not listed. | `422 VALIDATION_FAILED`, `details.where = "header"`. | Confirm. | — |
| G-05 | §3, §12.2, #1 | A PENDING member must see the event name (§3, SCR-02), but `projects` RLS admits only APPROVED members. | `GET /v1/me` reads the caller's own `members` rows with the user JWT, then the project summary of those rows with the service role. | DB lane provides `my_memberships()` (SECURITY DEFINER) instead; `api` switches to it. | DB |
| G-06 | FR-MEM-03, #10 | Behaviour when `consent_version` is older than the current consent text is not stated. | Reject with `422 VALIDATION_FAILED` so the user re-reads the current text. | Confirm. | Mobile (SCR-04) |
| G-07 | §8.1, #10 | Joining again while already PENDING/APPROVED. | `409 INVALID_TRANSITION`. REMOVED → `403 FORBIDDEN` (§8.1: removed members cannot re-request). | Confirm. | DB (RPC) |
| G-08 | §3, #14 | Owner calling `leave`. | `403 FORBIDDEN` (§3: owner cannot leave). | Confirm. | — |
| G-09 | #5 | `PATCH /v1/projects/{pid}` has no `ver`; `projects` has no row `version`. | Last write wins. | Accept, or add `expected_state_version`. | DB |
| G-10 | §9.4 Snapshot | Shape of the reduced incident row for non-involved participants (§3). | Same `IncidentSummary` object with detail fields `null`. | Confirm. | Mobile |
| G-11 | §9.4 ResourceView | "kèm nhãn claim của condition và location" — label shape not given. | `condition_claim` / `location_claim`: `{claim_id, status, observed_at}` or `null` (= Unknown). | Confirm. | AI (claims), Mobile (SCR-15) |
| G-12 | §6.2 | Deep-link / push target screens are not enumerated. | `TargetScreen` enum in `common.ts`; target = `{screen, ids}`. | Confirm list. | Mobile |
| G-13 | §15.3 | `packages/contracts/src/recovery.ts` is AI-lane work. | **Resolved:** `fullstack` now carries the AI lane's own `recovery.ts` and `primitives.ts` byte-identical to `ai/wp-0-foundation`, and the shared `enums.ts` / `policy.ts` from `database`. API-lane schemas live in new files (`enum-schemas.ts`, `limits.ts`). | — | AI |
| G-14 | `supabase/config.toml` | DB-lane file; the API needs anonymous sign-in (D-03), identity linking (FR-AUTH-03) and its own JWT check (§9.2 envelope). | **Resolved:** the DB lane's config already enables anonymous sign-in and manual linking; `fullstack` keeps that file byte-identical. `api` runs with `--no-verify-jwt` (`pnpm api:serve`, and on deploy). | Optionally add `[functions.api] verify_jwt = false` to config.toml so the flag is not needed. | DB |
| G-15 | ADR §6 spike | Can `supabase functions deploy api` bundle `packages/contracts` imported by relative path? | `deno check` resolves it locally. Deploy not yet tested (no staging project yet). | Test on first staging deploy; fallback per ADR §6. | Integrator |
