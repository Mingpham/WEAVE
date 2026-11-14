# Mobile frontend status and team handoff

Updated: 2026-11-14. Branch: `mob/wp-0-mobile-foundation`.

Scope confirmed by dkozTA: finish Mobile UI and preserve the existing team ownership split. The 29 Mobile-owned native screen components and their product route registry are present. This records UI source coverage, not backend integration, device acceptance, all-P0 completion or G0?G6 sign-off.

Product routes no longer include the fixture-backed preview. Missing session/data providers show unavailable/error states; mutations never fall back to local simulated success. Tests retain fixtures outside the application graph. Camera/QR/gallery/share and OS permission controls are native implementations awaiting phone verification.

## Screen and route inventory

Entry routes are `/`, `/auth`, `/events`, `/join`, `/join/consent`, `/join/profile`, and `/create-event`. Event views use `/p/{projectId}/{screen}?item={entityId}`. The screen keys below map to the typed route registry. `auth`, `task-editor`, `ask-probe`, and `direct-answer` are supporting views.

| Spec screen | Screen key / entry | Presentation source and current coverage | Remaining real interface |
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
| SCR-23 Manual Decision | `manual` | `incidents`: parameterized action builder, dry-run checks, apply confirmation | #47 server checks and revisioned apply |
| SCR-24 New Incident | `new-incident` | `incidents`: type/subject/affected tasks/blocking form | #38 create |
| SCR-25 Participant Home | `home` | `events`: questions/offers/current and next tasks, arrival callback | #4, #12; real inbox/deep-link routing |
| SCR-26 Inbox | `inbox` integration slot | **Mingpham-owned; owner source absent** | #50 read/list hooks, pagination and owner route |
| SCR-27 Me | `me` | `onboarding`: profile, availability, presence/area, leave/sign-out | #12/#14; session cleanup and role-sensitive capabilities |
| SCR-28 Composer | `composer` | `evidence`: text, context, photo preview/picker, local draft and ACK feedback | #29–32; persisted drafts, upload/retry and signed media flow |
| SCR-29 Report Problem | `report` | `evidence`: incident categories, safety guidance, text/photos | #32 `INCIDENT_REPORT` structured payload and server classification |
| SCR-30 Answer Probe | `probe`; supporting `ask-probe` | `probes` + `incidents`: choices/text/photos, cannot-check/decline; manual question form | #42–45; real deadline expiry and recipient permissions |
| SCR-31 Resource Report | `resource-report` | `planning`: working/failed/missing/low/moved choices, note/photos | #32 `RESOURCE_REPORT`; claims determine condition/location |
| SCR-32 Offer | `offer` | `tasks`: criteria, due/response deadline, accept/decline and recovery context | #24 assignment response and authoritative expiration/version |
| SCR-33 Evidence Detail | `evidence`  | `work`: author/time/text/photos, claims, source and related links | Authorized observation read contract still needed; #31 media URLs |

The four integration-slot IDs are navigation reservations. They are not implementations and do not transfer ownership from Mingpham. The settings close confirmation does not implement the separate close/report or settlement screens.

## Presentation interface contract

`MobilePresentationProvider` in `src/features/navigation/presentation.tsx` accepts `MobilePresentation`: session state, a pure `read(route)` lookup, and optional owner screen components. `MobileBinding` contains `ScreenState`, authoritative `EventAccess`, and a discriminated `MobileView` pairing the screen name with its props. Put team query/mutation hooks in the provider; `read` must not execute hooks or requests. Missing bindings remain unavailable.

Role/pending guards and product paths live in `navigation/routes.ts`. Adapters select the initial event destination with `eventDestination`, and bind navigation callbacks with `eventPath`. These client display guards do not replace server authorization. Owner screens are supplied for `timeline`, `inbox`, `close`, and `settlement` without modifying their source.

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

## UI delivery and remaining integration

- [x] Shared native theme, English strings, 48dp controls and loading/empty/error/offline shell.
- [x] Source coverage for all 29 Mobile-owned screens, supporting editors and role-aware product routes.
- [x] Local date/time picker, field validation, optional selections and accessible multi-select controls.
- [x] Plan/resource filtering, source-opening callbacks, revision-bound publish/delete confirmations and unsaved-change protection.
- [x] Work terminal/stale/read-only states, per-item assignment results, evidence URL recovery and review validation.
- [x] Direct answers, probe/offer expiry display, version-scoped ACK feedback, stale proposal locks and separate RECOVERING/RESOLVED presentation.
- [x] Product graph excludes scenario fixtures; no fake successful request fallback.
- [ ] Integrate team auth/session, contracts, query/mutation/upload hooks, durable drafts, realtime and push registration.
- [ ] Integrate SCR-17/19/20/26 from Mingpham; source remains absent in inspected branches.
- [ ] Supply SCR-33 authorized observation-detail read interface; the spec does not name a standalone observation GET.
- [ ] Supply canonical manual-finalization behavior when AI is disabled; Mobile exposes the callback without inventing an endpoint.
- [ ] Adapters provide zoned timestamps, runtime policy limits, server validation, authoritative access and version values. The local date picker is not the authoritative 72-hour/DST validator.
- [ ] Verify authenticated deep links, role transitions and participant journeys with actual providers.
- [ ] Verify Android layout, TalkBack, small-screen/keyboard behavior, camera/QR/share, cold restart and phone API access.
- [ ] Resume native build only when separately authorized; the last authorized attempt failed and produced no APK.
- [ ] Run required security/integration/release gates once team data paths exist. No gate is waived by UI checks.

### Verification recorded for this UI task

| Check | Result / limitation |
|---|---|
| NativeWind web color scheme | Focused delayed-CSS check reproduced the media-mode exception; class-mode fix passed (`6f66481`) |
| TypeScript | Passed after final product access/notification/expiry changes |
| ESLint | Full app/source/tests pass before final small edits; targeted navigation/probe/offer/device/expiry lint passed after those edits |
| Focused behavior tests | 16 tests passed in 6 files: interaction, ACK, composer, manual decision, assignment and navigation |
| Web product artifact | Exported web artifact present; fixture-boundary check passed. This is not an Android APK or browser visual acceptance |
| Android build | Not rerun in this UI task. Last authorized attempt failed at worklets CMake; details in BUILD_HANDOFF.md |
| Phone/browser visual acceptance | Not completed. No camera/QR/TalkBack/cold-start or complete route acceptance claim |
| Real integration/security | Blocked on team providers/services and owner screens; not run |

Supabase login/link remains explicitly deferred. Earlier PC-only observations found Google/anonymous auth disabled and `/api/v1/me` returning 404; no new service check or configuration change was made in this UI task.

No backend, DB, canonical contracts, `src/lib`, shared dependency/CI change or ownership transfer is included. See [README.md](README.md) for current run commands and [MOBILE_UI_TASKS.md](MOBILE_UI_TASKS.md) for task commits.
