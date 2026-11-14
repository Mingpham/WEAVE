# Local functionality checkpoint — 2026-11-14

Branch: fix-main. No cloud deployment was performed. User expanded Mobile scope to missing API/auth/data integration, then requested local completion only with a 15-minute implementation window.

## Implemented source

- Auth/provider: Google browser PKCE and anonymous auth, encrypted native session storage, auth-scoped queries, My Events, sign-out, callback/deep-link handling.
- Create event: canonical validation, event-timezone conversion, JWT-scoped atomic create_project RPC, durable idempotency key for uncertain retries, server-acknowledged result.
- Membership: invite create/disable/resolve, consent and join, waiting, owner decision and profile editing APIs. Join flow preserves QR scanning.
- Manual planning: live draft reads, add/edit/delete/lock/unlock, manual finalize/review and atomic publish. AI composition remains unavailable.
- Work: manual task creation, task board/detail, offers with individual results, accept/decline/start/release and cancel/defer/reopen/revoke.

## Evidence

- Root: 283 tests / 29 files passed after fixing mock-route interference and replay handling.
- Mobile: 24 tests / 8 files passed; TypeScript and scoped lint checked.
- New SQL: 10 isolated PostgreSQL 17 scenarios passed (membership 3, planning 3, work 4). These use fixture identities, not real Google OAuth acceptance.
- Web export and fixture-boundary checker passed. Native Android build and real-device tests were not run for these new modules.
- Browser automation host unavailable; actual Google login and browser interaction smoke remain unverified.
- Full local ESLint also scanned an unrelated untracked output/playwright artifact and failed there; checks targeting changed API/contracts source pass. No output artifacts are included in Git.

## Still incomplete — not MVP sign-off

People live read/invite management UI; full snapshot and Command Center/Home data; settings/event lifecycle; presence claims; removal/leave cascades; task editing/UNLOCK, ranked assignments and expiry sweeper; media upload, observations, submissions and owner review; incident/probe/proposal/manual recovery and recovery confirmation; notifications/realtime; Timeline, Inbox, Close/Report, Settlement/CSV; real AI compose and resource-check fanout. Existing component UI for these is not evidence of working backend integration. Unsupported operations reject explicitly.

## Run / prerequisites

Mobile: cd apps/mobile; pnpm run start --web --clear
Android: rebuild the development app after adding expo-secure-store, expo-web-browser and expo-crypto; retain the existing JDK/NDK/cache. No APK was built in this checkpoint.

The committed .env.example documents public connection settings. Local ignored .env.local still points to the hosted API, which returned 404 before this work and has NOT been deployed. CLI login was verified, but no project changes were made. Do not call this hosted app usable yet.

An isolated Supabase local workspace was prepared in apps/mobile/.cache/supabase-local with distinct ports 55430–55433. Its startup/download log is apps/mobile/.cache/supabase-local-start.log (may contain local credentials; do not publish). It was started before new migrations 1400–1600 were added, so sync migrations and apply them only to this isolated local workspace before an API end-to-end run. No hosted db push/reset was run.
