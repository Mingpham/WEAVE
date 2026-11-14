# Mobile frontend status and team handoff

Updated: 2026-11-14. Branch: `mob/wp-0-mobile-foundation`.

The expanded task supplies Mobile presentation screens, fixture-backed interactions, and Android build preparation. **Source present** below means a native component or local demo flow exists. It does not mean all screen acceptance criteria, real integration, device behavior, or P0 requirements are complete. No G0–G6 gate is signed off.

All business mutations in the preview are local simulations. Camera, QR, sharing, and notification permission controls can use the device, but no business service is connected. Live mode has no production data adapter and never falls back to mock success. The central shell now mounts the feature groups and reserves the four integration slots; interactive route verification and final aggregate checks remain pending at this snapshot.

## Screen and route inventory

Preview IDs are mounted through `/preview/[screen]`. `/` is Welcome; `/events` and `/connection` are live integration shells. `auth`, `task-editor`, and `ask-probe` are supporting views, not additional specification screens.

| Spec screen | Preview ID / entry | Presentation source and current coverage | Remaining real interface |
|---|---|---|---|
| SCR-01 Welcome | `/`; supporting `auth` | `events` + `onboarding`: Welcome, Google/guest sign-in presentation | Auth/session/link-account adapter; authenticated routing |
| SCR-02 My Events | `events` | `events`: role/status cards; join/create/sign-out callbacks | #1 membership/project summaries and sign-out cleanup |
| SCR-03 Join Code / QR | `join-code` | `onboarding`: code parsing, resolve confirmation, QR scanner UI | #9 resolve; device scan verification; incoming join link |
| SCR-04 Consent | `join-consent` | `onboarding`: consent text, version display, explicit agreement | Current consent version from #9; preserve agreement for #10 |
| SCR-05 Join Profile | `join-profile` | `onboarding`: nickname, role tags, availability | #10 authenticated join mutation |
| SCR-06 Waiting | `waiting` | `onboarding`: pending request and cancel confirmation | #14 cancel; membership refetch/subscription and approval navigation |
| SCR-07 Create Event | `create-event` | `onboarding`: event form and creation callback | #3 Google-authenticated project creation |
| SCR-08 Plan Studio | `plan` | `planning`: chat/draft, AI labels, manual mode, item lists, composing lock | #15–17 draft/query/job lifecycle and canonical validation |
| SCR-09 Draft Item Editor | `draft-item` | `planning`: task/resource/area/role forms; criteria, dependencies, category needs, locks | #17 revisioned operations; #19–20/#27–28 for published records |
| SCR-10 Plan Review | `plan-review` | `planning`: totals, timeline, gaps, assumptions, publish confirmation | #16 finalization completion, #18 atomic publish; manual-finalization behavior |
| SCR-11 Command Center | `command` | `events`: counters and attention groups | #4 role-filtered snapshot and refresh |
| SCR-12 Task Board | `tasks` | `work`: status/area grouping and filters; add/suggest actions | #4 tasks, #19 create, #22 suggestions |
| SCR-13 Task Detail | `task`; supporting `task-editor` | `work`: criteria, dependencies, resources, history, submission links; action gates/editor | #20–21, #24–26, #33–35; authoritative permissions and status |
| SCR-14 Assign | `assign` | `work`: suggested/alternate members, selection and batch offer callback | #22 ranked candidates, #23 per-item offer results |
| SCR-15 Resources & Areas | `resources` | `planning`: area groups, inventory/condition labels, custodian, task needs, reports | #4, #27–28; claim-backed condition/location; #48 discovery suggestions |
| SCR-16 People | `people` | `onboarding`: pending/member lists, approve/reject/remove, invite QR/share/regenerate/disable | #4, #8, #11–13; native share/QR verification |
| SCR-17 Timeline | `timeline` integration slot | **Mingpham-owned; owner source absent** | #49 paginated/filterable timeline and owner route |
| SCR-18 Event Settings | `settings` | `onboarding`: event/settings/roles, close/delete confirmations | #5–7; close must integrate with Mingpham's SCR-19 |
| SCR-19 Close & Report | `close` integration slot | **Mingpham-owned; owner source absent** | #6 and #51 report route; no replacement screen claimed |
| SCR-20 Settlement | `settlement` integration slot | **Mingpham-owned; owner source absent** | #52–53 ledger/CSV route |
| SCR-21 Submission Review | `submission-review` | `work`: photos, source-linked AI checks, human assessments, request changes | #35–36 revisioned review; #31 authorized media URLs |
| SCR-22 Incident | `incident` | `incidents`: decision cards, evidence, uncertainty, stale/conflict guards | #39–41, #43, #46, #48; role-filtered incident/proposal data |
| SCR-23 Manual Decision | `manual` | `incidents`: parameterized action builder, dry-run checks, apply confirmation | #47 server checks and revisioned apply; navigation verification pending |
| SCR-24 New Incident | `new-incident` | `incidents`: type/subject/affected tasks/blocking form | #38 create; navigation verification pending |
| SCR-25 Participant Home | `home` | `events`: questions/offers/current and next tasks, arrival callback | #4, #12; real inbox/deep-link routing |
| SCR-26 Inbox | `inbox` integration slot | **Mingpham-owned; owner source absent** | #50 read/list hooks, pagination and owner route |
| SCR-27 Me | `me` | `onboarding`: profile, availability, presence/area, leave/sign-out | #12/#14; session cleanup and role-sensitive capabilities |
| SCR-28 Composer | `composer` | `evidence`: text, context, photo preview/picker, local draft and ACK feedback | #29–32; persisted drafts, upload/retry and signed media flow |
| SCR-29 Report Problem | `report` | `evidence`: incident categories, safety guidance, text/photos | #32 `INCIDENT_REPORT` structured payload and server classification |
| SCR-30 Answer Probe | `probe`; supporting `ask-probe` | `probes` + `incidents`: choices/text/photos, cannot-check/decline; manual question form | #42–45; real deadline expiry and recipient permissions |
| SCR-31 Resource Report | `resource-report` | `planning`: working/failed/missing/low/moved choices, note/photos | #32 `RESOURCE_REPORT`; claims determine condition/location |
| SCR-32 Offer | `offer` | `tasks`: criteria, due/response deadline, accept/decline and recovery context | #24 assignment response and authoritative expiration/version |
| SCR-33 Evidence Detail | `evidence` (`source` is a legacy fixture view) | `work`: author/time/text/photos, claims, source and related links | Authorized observation read contract still needed; #31 media URLs |

The four integration-slot IDs are navigation reservations. They are not implementations and do not transfer ownership from Mingpham. The settings close confirmation does not implement the separate close/report or settlement screens.

## Presentation interface contract

`OnboardingPreview` and `PlanningPreview` take `{screen: string; navigate: (screen: string) => void; offline: boolean}`. `WorkPreview` takes those props plus optional `owner: boolean`; the shared shell supplies the current preview role. They belong to the demo only. Real integration should import the underlying prop-driven components and supply query-derived view models. `directory` is the route catalog; `more` contains organizer destinations.

| Component family | Existing interface to adapt |
|---|---|
| Onboarding | `InviteSummary`, `EditableProfile`, `EventForm`, `PeopleView`, `SettingsView`, `MeView`; resolve/join/create/profile/member/invite callbacks return `Promise<void>`; scanner returns `Promise<string \| null>` |
| Planning | `PlanningView`, `PlanningForm`, `PlanningEditorOptions`, `ResourcesView`, `ResourceReportDraft`; `PlanStudio` send/finalize, `DraftItemEditor` save/delete/lock, `PlanReview` publish, `ResourceReport` send return `Promise<void>` |
| Work | `TaskDetailView`/`TaskDetailActions`, `TaskEditDraft`, `AssignmentSuggestion`, `SubmissionReviewView`, `EvidenceView`; callbacks receive selection keys/form values and resolve after acknowledgement |
| Incident/recovery | `IncidentView` and injected actions; `NewIncidentDraft`; `ManualActionDraft[]`; `ManualDecision.onCheck` returns `Promise<ManualCheckView>`, `onApply` returns `Promise<void>`; `AskProbe.onSend` receives recipient/question/photo permission |
| Evidence/probe/offer | `ComposerDraft`/`LocalPhoto`, `ProbeView`, `OfferView`; photo picker returns processed local pixels, not uploaded media IDs; submit/respond callbacks return `Promise<void>` |
| Device permissions | `NotificationPermissions` accepts `NotificationPermissionAdapter` (`supported`, `get`, `request`, `openSettings`); the native adapter reads/requests OS permission and creates an Android channel, but does not register a push token or send notifications |
| Shell | `Screen` accepts phase/offline/last-update/error/refresh presentation state; `useAcknowledgedAction(versionKey?)` guards pending presses and revision-scoped feedback |

The specification does not prescribe React hook names. The needed hooks below are capabilities for Mingpham's `src/lib`, not new local APIs. Canonical endpoint enums, request/response schemas, errors, and `POL.*` belong in `packages/contracts`; none of the presentation types replaces them.

## Exact missing endpoint/hook handoff

Paths and endpoint numbers refer to specification §9.3. Mingpham owns #1–36 and #49–53; AI & Engine owns #37–48. DB supplies authoritative RPCs and access policies. Every POST/PATCH/DELETE adapter must attach `X-Idempotency-Key`, use the contract's `expected_version`/`expected_revision` where required, and keep success behind the server acknowledgement. A rejected mutation must preserve the user's draft and map errors without leaking internals.

| Hook capability needed | Endpoint and payload/response boundary |
|---|---|
| Session / events / push | Supabase Google and anonymous sessions, SecureStore restoration, account linking and sign-out cleanup; #1 `GET /v1/me`; #2 `PUT /v1/me/push-token` with `token`, `platform` |
| Project snapshot/settings | #3 `POST /v1/projects` with FR-EVT-01 fields; #4 `GET /v1/projects/{pid}/snapshot` returns role-filtered `Snapshot`; #5 `PATCH /v1/projects/{pid}` with editable fields, settings, role tags |
| Membership/invites | #8 `POST /v1/projects/{pid}/invites` with `CREATE`/`DISABLE`; #9 `POST /v1/invites/resolve` with `code`, returns project/organizer/consent version/roles; #10 `POST /v1/invites/join` with code, nickname, roles, availability, consent version; #11 `POST /v1/members/{mid}/decision`; #12 `PATCH /v1/members/{mid}`; #13 `POST /v1/members/{mid}/remove`; #14 `POST /v1/projects/{pid}/leave` |
| Plan query / job lifecycle | #15 `GET /v1/projects/{pid}/plan` returns draft, revision, status, conversation, AI turns; #16 `POST /v1/projects/{pid}/plan/compose` with mode `DRAFT`/`REVISE`/`FINALIZE`, optional message/answers, revision. `202` starts a job; refetch until composition completes before showing a finalized plan |
| Manual draft edits / publish | #17 `PATCH /v1/projects/{pid}/plan` with `ops` (`UPSERT`/`DELETE`/`UNLOCK`, collection/key/value), revision; `UPSERT` supplies manual lock semantics. #18 `POST /v1/projects/{pid}/plan/publish` with revision. Reconcile cycles, references, gaps, inventory and locked items on the server |
| Published task edits/status | #19 `POST /v1/projects/{pid}/tasks`; #20 `PATCH /v1/tasks/{tid}` with fields, criteria, dependencies, needs, version; #21 `POST /v1/tasks/{tid}/status` with `CANCEL`/`DEFER`/`REOPEN`/`UNLOCK`/`REVOKE`, optional reason, version |
| Suggestions/offers/task execution | #22 `GET /v1/projects/{pid}/assignment-suggestions`; #23 `POST /v1/projects/{pid}/offers` with selected task/member pairs and optional respond-by, returns per-item results; #24 `POST /v1/assignments/{aid}/respond`; #25 `POST /v1/assignments/{aid}/release`; #26 `POST /v1/tasks/{tid}/start` |
| Areas / resource metadata | #27 `POST /v1/projects/{pid}/areas`, `PATCH /v1/areas/{id}`, `DELETE /v1/areas/{id}`; #28 `POST /v1/projects/{pid}/resources`, `PATCH /v1/resources/{rid}`. Existing resource condition and location are excluded from metadata edits; update them through evidence. #48 `POST /v1/suggestions/{id}/decision` handles accepted/dismissed discovery suggestions |
| Media upload/read | #29 `POST /v1/media/upload-intent` with project/mime/bytes returns media ID, signed upload URL, expiry; upload bytes; #30 `POST /v1/media/{id}/complete` with dimensions; #31 `GET /v1/media/{id}/url` returns a short-lived authorized read URL. Only READY media IDs enter evidence requests |
| Observations/submissions | #32 `POST /v1/projects/{pid}/observations` with supported kind/text/media IDs/structured context/observed time; incident report adds type/safety/subject. #33 `POST /v1/tasks/{tid}/submissions`; #34 `POST /v1/submissions/{sid}/evidence` only while awaiting review; #35 `GET /v1/submissions/{sid}` |
| Human review/claims | #36 `POST /v1/submissions/{sid}/review` with decision, criterion IDs/met flags, comment, open-incident flag, version; #37 `POST /v1/claims/{cid}/resolve` with confirm/reject/comment. AI criterion assessments remain advice |
| Incident query/status | #38 `POST /v1/projects/{pid}/incidents`; #39 `GET /v1/incidents/{iid}` with owner/full or relevant-participant/reduced shape; #40 `POST /v1/incidents/{iid}/status` with action/reason/evidence/version; #41 `PATCH /v1/incidents/{iid}` |
| Probes / direct answers | #42 `POST /v1/incidents/{iid}/requests` with target/question/unknown/photo permission; #43 `POST /v1/incidents/{iid}/unknowns/{uid}/answer`; #44 `POST /v1/requests/{rid}/respond` with `RESPOND`/`CANNOT_CHECK`/`DECLINE`, choice/text/media IDs/version; #45 `POST /v1/requests/{rid}/cancel` |
| Proposal/manual decision | #46 `POST /v1/proposals/{id}/decide` with decision/option/override/comment and `expected_incident_revision`; #47 `POST /v1/incidents/{iid}/manual-decision` with canonical actions, `dry_run`, comment, revision. Dry run yields checks; apply must revalidate against the latest revision |
| Mingpham screen slots | #49 `GET /v1/projects/{pid}/timeline?cursor=&types=`; #50 `GET /v1/me/inbox?project_id=&cursor=` and `POST /v1/me/inbox/read`; #6 `POST /v1/projects/{pid}/close` with `confirm_open_items`; #51 `GET /v1/projects/{pid}/report`; #52 `GET /v1/projects/{pid}/settlement` and `/settlement.csv`; #53 `PATCH /v1/ledger/{id}` with status/reason |
| Project deletion | #7 `DELETE /v1/projects/{pid}` with `confirm_title`; invalidate local project data only after acknowledgement |

The team data layer must also provide private `project:{project_id}` and `user:{user_id}` Broadcast subscriptions, foreground/reconnect refetch, cached last snapshot and timestamp, persisted evidence drafts, token registration, push destination decoding, and membership invalidation. Realtime payloads trigger refetch; they are not trusted replacement snapshots. Source/claim visibility and media permissions remain enforced by the API/RLS.

## Remaining gaps and verification checklist

- [x] Reuse the native theme, English string modules, 48dp controls, shell state presentation, and injected asynchronous callbacks.
- [x] Keep scenario data and simulated transitions under `tests/fixtures/mobile`; keep live and demo bundle modes distinct.
- [x] Add source components for the 29 Mobile-owned screens and supporting editors/forms. This item records source coverage only.
- [x] Mount feature groups and owner-role restrictions in the central preview shell; reserve the four Mingpham-owned screen slots.
- [ ] Verify each route and role transition interactively after integration.
- [ ] Supply canonical contracts and adapters above. No real authentication, API mutation, database write, upload, AI job, realtime event, push, or durable draft has been integrated.
- [x] Add planning source-opening controls for messages/questions/items, editor, review gaps/assumptions/timeline, and resources. The preview reuses `EvidenceDetail` in a native modal with the matching raw fixture brief, organizer entry, AI reply, or resource report/photos. Plan review now formats 24-hour project-local dates/times with relative deadlines against a clearly labeled demo clock.
- [ ] Reconcile remaining presentation differences during adapter integration: assignment batches now show each result, retain failed selections, and exclude successful offers from retries. Published and draft task editors both expose category/required resource choices; their adapter mapping still needs canonical validation.
- [ ] Define SCR-33's authorized observation-detail read interface: §9.3 names media URL and submission/incident detail routes, but no standalone observation GET. Do not invent an undocumented endpoint.
- [ ] Clarify AI-disabled finalization: §9.3 names `plan/compose` with `FINALIZE` while FR-PLAN-07 requires a manual path. The API owner must supply the behavior; the demo's manual review callback is not a substitute contract.
- [ ] Complete real `weave://join?code=…` and `weave://p/{project_id}/…` routing, permission denial flows, actual deadlines/timezone formatting, and ≤4-tap participant journeys.
- [ ] Verify applicable UX-01 states, TalkBack, keyboard/small-screen behavior, photo/QR/share behavior, evidence source access, and cold restart on Android.
- [ ] Complete artifact/signature/hash and device checks for development and standalone demo APKs. Native compilation awaits the official NDK/platform/CMake downloads; interrupted transfers are being resumed. Success is not recorded.
- [ ] Run repository-required security, RPC, API, integration, and end-to-end checks when real data paths exist. Do not mark an FR/AT complete solely because a component or simulated success exists.

### Check evidence at this snapshot

| Check | Recorded result / limitation |
|---|---|
| Planning scoped ESLint | Passed: `eslint src/features/planning src/strings/planning.en.ts`, exit 0 after planning changes |
| Foundation type/static/export/guard checks | Prior foundation checks exist; they are not evidence for the newly expanded tree |
| Aggregate TypeScript / ESLint / focused tests | Final integrated TypeScript and ESLint passed after all screen changes (exit 0). The earlier 10 guard/draft tests passed; three focused manual-decision/partial-offer regression cases also passed |
| Android live JS export | Root reported success with 1,608 modules before the final planning source/time change; this is not an APK |
| Live/demo export boundary | Live (1,608 modules) and standalone demo (2,030 modules) exports passed; paired fixture-boundary check passed. Final source-opening/partial-result changes await native bundling |
| Native APK build | Awaiting official native tool downloads; no final successful artifact or installation recorded |
| Device acceptance | No attached Android device in the earlier ADB check; no camera/QR/TalkBack/cold-start pass recorded |
| Browser visual QA | Earlier pass stopped before a trustworthy result; no visual acceptance claimed |
| Real integration/security/gates | Not run: required team contracts/data layer and services absent |

Supabase account login/link is **deferred by explicit user request**, not the next automatic task. Inspected auth settings had Google and anonymous sign-in disabled; the Edge API request ending in `/api/v1/me` returned 404. The Supabase HTTPS URL was reachable from the PC only. Do not describe the environment as integrated or phone-ready.

No backend, DB, canonical contracts, `src/lib`, shared CI, or ownership transfer is introduced by these presentation files. See [README.md](README.md) for exact existing run/export/build commands.
