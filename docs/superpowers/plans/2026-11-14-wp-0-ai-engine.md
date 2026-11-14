# WP-0-AI & Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Chưa chọn phương thức thực thi; không tự commit, push, merge, rebase hoặc cài production dependency khi chưa được người dùng cho phép.

**Goal:** Xây nền AI & Engine có hợp đồng dùng chung, fixture, engine thuần, bộ kiểm tra đầu ra, worker kiểm thử được và bằng chứng gọi OpenRouter tối thiểu; chuẩn bị tích hợp với DB/API.

**Architecture:** `packages/engine` chỉ nhận dữ liệu và trả kết quả tất định. Worker điều phối các cổng đọc snapshot, gọi model, ghi log và commit bằng RPC; mọi I/O được truyền vào để kiểm thử bằng bản giả. Hợp đồng Recovery/AI nằm trong `packages/contracts`, không có bản sao riêng trong worker.

**Tech Stack:** TypeScript, Zod, Vitest, Supabase Edge Functions/Deno, PostgreSQL/pgmq qua RPC do luồng DB cung cấp, HTTP `fetch` tới OpenRouter; pnpm workspace do luồng API sở hữu. Phiên bản dependency phải lấy từ cấu hình chung đã khóa, không tự chọn `latest`.

**Spec:** [MVP Specification](../../WEAVE_MVP_Specification.md), nhất là §§0, 1.4, 7–12, 14–17 và Phụ lục B; [Stack ADR](../../../WEAVE_4_0_Stack_Lock_ADR.md); [biên bản quyết định và bàn giao](../../ai/2026-11-14-ai-engine-handoff.md).

**Trạng thái:** Kế hoạch đề xuất để review, chưa triển khai. Người dùng đã chốt phạm vi AI & Engine, OpenRouter và text/ảnh cho MVP; các chữ ký nội bộ dưới đây là đề xuất kỹ thuật, chưa phải hợp đồng được DB/API duyệt.

**Cập nhật thực thi 2026-11-14:** Người dùng đã duyệt triển khai trực tiếp, commit sau từng task và kiểm tra nhánh team trước task tiếp theo. Task 1–5 và 7 đã thực thi; Task 6 có handler bảo vệ nhưng adapter/SQL integration còn chờ RPC. Xem [bằng chứng và quyết định thực thi](../../ai/wp-0-verification.md) cho kết quả, giới hạn và phần còn thiếu; nội dung dự kiến bên dưới được giữ làm kế hoạch gốc.

## Global Constraints

- Specification ưu tiên hơn ADR về hành vi. Chỉ Android; UI và đầu ra AI bằng tiếng Anh. Video/audio thuộc mở rộng sau MVP.
- OpenRouter dùng `LLM_API_KEY`, `LLM_BASE_URL=https://openrouter.ai/api/v1`, `LLM_MODEL=anthropic/claude-haiku-5.5`; model lấy từ cấu hình, không hardcode trong logic.
- Model/service-role/worker secret chỉ ở server. Không log `.env`, JWT, API key, URL ký, raw request/response hoặc bảng ánh xạ alias chứa dữ liệu người dùng.
- Engine không nhập Supabase, Deno, Node, `fetch`, đồng hồ hay RNG hệ thống. `now` và mọi ID cần sinh được truyền vào; không sửa input.
- Engine tính; RPC khóa/kiểm tra/áp dụng. Không nhân bản thuật toán §11 bằng SQL. `state_version` và `basis_revision` có mục đích khác nhau, không thay thế nhau.
- AI không tự duyệt, tự đặt `validity`/`readiness`, giao việc hay sửa bảng nghiệp vụ. Model không có tool. Bốn lớp kiểm tra: cấu trúc → tham chiếu → chính sách → nghiệp vụ.
- Giới hạn hiện tại: `AI_MAX_REQUEST_MS=35000`, `AI_MAX_OUTPUT_TOKENS=1200`; `POL.JOB_MAX_ATTEMPTS=3`, backoff lỗi tạm thời 2s rồi 8s; lỗi schema/ID thử lại tối đa một lần trong tổng số attempt.
- Giới hạn nghiệp vụ: 8 lần gọi/incident, 3 probe/incident, 300 lần gọi/project/ngày, debounce 5s. Không lấy số 4/2 cũ trong ADR.
- Không dùng kịch bản §4 trong code/prompt. Fixture chỉ trong vùng test/seed; ví dụ prompt dùng loại sự kiện khác.
- Unit/integration/security mặc định không gọi model thật. Không đánh dấu AT hay G0 đạt từ test giả hoặc một lần gọi model.
- Tuân thủ quyền sở hữu §15.2–15.3; contracts → migration/RPC → route → màn hình. Giữ nguyên `AGENTS.md` đã tạo.

## Review Focus

1. Worker chết sau khi chuyển job sang `RUNNING`: retry phải phục hồi được và worker cũ không commit đè; test Task 5/6, phụ thuộc GAP-02.
2. Trùng job, retry đồng thời và hết ngân sách: một kết quả nghiệp vụ, không vượt hạn mức; test Task 5/6.
3. Model trả JSON sai, alias sai loại/khác project hoặc thêm trường tự duyệt: dừng đúng lớp; test Task 2/3/4, GAP-01.
4. Dữ kiện đổi trong lúc gọi model: bỏ kết quả stale nhưng vẫn có inference log; test Task 5/6; không dùng project version làm incident revision.
5. Deno bundle/import và log lỗi khác hành vi Vitest: kiểm tra import thật, chặn lộ secret, lỗi HTTP 200 có error body; test Task 1/4/6.

## 1. Hiện trạng và ranh giới

Ngày khảo sát: 2026-11-14. Repo chỉ có specification, ADR, skills và `AGENTS.md`; chưa có workspace/package/test/SQL. `.env` tồn tại, đủ ba biến LLM và chưa được Git theo dõi; chưa có `.gitignore`. Không đọc/in giá trị key.

Máy hiện có Node `v26.5.0`, Deno `2.9.4` và lệnh Docker. `pnpm`/`supabase` chưa có trong PATH. Chưa kiểm tra Docker daemon, chưa xác nhận tương thích Node này với toolchain, chưa chạy inference hay deploy. Không coi phiên bản trên máy là phiên bản chuẩn của team.

WP-0-AI cung cấp nền và hợp đồng, không hoàn thành ngay bốn module nghiệp vụ. Validator nghiệp vụ/module chưa cài phải báo `MODULE_NOT_READY`, không mặc định cho qua hoặc trả kết quả giả thành công. Fixture handler chỉ được đăng ký trong test; không đưa vào production registry.

### Đường đi toàn luồng sau WP-0

| Gói | Phần AI & Engine | Bằng chứng cần có |
|---|---|---|
| WP-0-AI | Hợp đồng, engine input, fixture, worker nền, 4 lớp validation, adapter/log, smoke thật | Checklist cuối kế hoạch; G0 do cả team chạy |
| WP-1-AI | §11.3 eligibility, phân công, kiểm tra draft/gaps, `plan_compose` với model giả | Unit đủ nhánh; bàn giao API/Plan |
| WP-2-AI | `plan_compose` thật, §11.4 resource-check, §11.2 claim | AT-08…13 và test claim; giữ nội dung locked |
| WP-3-AI | `observation_analyze`, route #37, risk §11.1, hình chiếu resource | AT-20,22,24…26,28 liên quan; không tự approve task |
| WP-4-AI | Route #38–45, R1–R5, dedupe/severity, probe, `touch_incidents`, sweeper nghiệp vụ | AT-16,17,27…31; quyền đọc incident rút gọn |
| WP-5-AI | §11.5–11.6, `incident_assess`, readiness, route #46–48, recovery notifications | AT-32…41; code options còn dùng khi AI lỗi |
| WP-6-AI | `event_summarize`, eval đầy đủ, injection, ngân sách và runbook | AT-42,48…51; phối hợp toàn bộ G6 |

Mỗi gói sau có kế hoạch riêng khi hợp đồng và kết quả gói trước đã rõ. Các AT trên là đóng góp của luồng AI, không thay thế nghiệm thu DB/API/mobile.

## 2. Phụ thuộc và bản đồ file

### Nền do luồng API/DB bàn giao

| Phụ thuộc | Owner | Cần trước |
|---|---|---|
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, Vitest, package contracts và enum/domain types/`POL.*` chung | Mingpham; AI đóng góp schema Recovery/AI | Task 1–2 chạy được |
| `.github/`, CODEOWNERS, lệnh CI; cấu hình Supabase local | API phối hợp DB | Task 6 tích hợp |
| Schema, RLS, pgmq, chữ ký RPC claim/retry/commit/budget/log và worker authentication | lh6104 | Task 6 adapter thật |
| DTO/context/auth/error mapping của Hono `api`, cơ chế phát tín hiệu/push | Mingpham | Các route từ WP-3 trở đi |

Nếu nền chưa có, bàn giao yêu cầu và diff đề xuất cho owner trước; chỉ tạo bootstrap dùng chung khi đã thống nhất phạm vi. Không tạo một monorepo/package contracts thứ hai để né phụ thuộc. Task thiết kế schema/fixture có thể chuẩn bị trước, nhưng không báo test pass khi toolchain chưa chạy.

### File đề xuất, chưa tồn tại

| Khu vực | File và trách nhiệm |
|---|---|
| Hợp đồng | `packages/contracts/src/recovery.ts`: Action, ConditionCheck, ProposalOption; `src/ai/{plan-compose,observation-analyze,incident-assess,event-summarize,jobs}.ts`; `src/ai/index.ts`; `tests/{recovery,ai}.test.ts` |
| Engine | `packages/engine/{package.json,tsconfig.json,src/index.ts,src/types.ts,src/checks.ts,tests/checks.test.ts}`: kiểu snapshot và phép tổng hợp điều kiện thuần |
| AI chung | `supabase/functions/_shared/ai/{config,types,aliases,validation,openrouter,logging}.ts`, `tests/{config,aliases,validation,openrouter,logging}.test.ts` |
| Worker core | `supabase/functions/ai-worker/{ports,process-job,retry,handler,registry,index}.ts`, `tests/{process-job,retry,handler}.test.ts` |
| Adapter DB | `supabase/functions/ai-worker/supabase-store.ts`, `tests/supabase-store.integration.test.ts`: chỉ viết sau khi chữ ký DB được thống nhất |
| Runtime/tooling | `supabase/functions/ai-worker/{deno.json,deno.lock}`, `vitest.ai.config.ts`: phối hợp API, một Zod version dùng chung |
| Fixture | `tests/ai-evals/{fixtures.ts,fixtures.test.ts,README.md}`, `<module>/smoke.json`; `tests/ai-evals/support/{fake-model,in-memory-store}.ts` |
| Live smoke | `tests/ai-evals/{live-smoke.ts,live-smoke.test.ts,assets/red-square.png}`: ảnh tổng hợp vô hại, không có thông tin cá nhân |
| Vận hành | `docs/ai/wp-0-verification.md`, `.gitignore`, `.env.example`: ghi chứng cứ và cấu hình mẫu, không chép key |

Các file `src/enums.ts`, `src/policy.ts`, `src/index.ts` của contracts là file chung do API sở hữu. AI đề xuất export cần thêm; không tự định nghĩa lại enum/domain types. Tên file ở bảng là quyết định đề xuất, thích nghi nếu nền API đã thống nhất tên tương đương.

## 3. Chuẩn kiểm thử và hợp đồng nội bộ

Các lệnh bên dưới là **lệnh dự kiến sau bootstrap**, chưa tồn tại và chưa chạy. `vitest.ai.config.ts` phải bao gồm test contracts, engine, AI chung, worker và eval fixture; loại `*.integration.test.ts` khỏi unit, có project `integration` riêng. Test unit chặn network mặc định; HTTP adapter dùng fetch giả.

Chung: UUID và thời gian dùng schema canonical; JSON nghiệp vụ `snake_case`; không dùng `any` để nối hợp đồng thiếu. JSON Schema gửi model phải được sinh từ Zod qua chức năng được version chung hỗ trợ; không duy trì hai schema thủ công. Bước đầu xác minh chuyển đổi schema nghiêm ngặt; nếu version chung không hỗ trợ, đưa lựa chọn dependency cho owner/người dùng trước khi cài.

### Task 1: Nền kiểm thử và cấu hình server

**Files:** cấu hình runtime/tooling, `.gitignore`, `.env.example`, `_shared/ai/config.ts`, `tests/config.test.ts` trong bảng trên. Phần bootstrap chung là bàn giao API, không mặc nhiên thuộc quyền sửa của AI.

**Interfaces:** `readLlmConfig(env: Readonly<Record<string, string | undefined>>): LlmConfig`; `LlmConfig = { apiKey: string; baseUrl: string; model: string; timeoutMs: number; maxOutputTokens: number }`. Hàm thuần không đọc environment trực tiếp; entrypoint Deno mới đọc env và truyền vào.

- [ ] Thống nhất bootstrap với API; khóa phiên bản tool/dependency trong manifest/lockfile, xác minh Node/Deno tương thích trước khi cài. Không bổ sung model SDK.
- [ ] Thêm ignore `.env`, `.env.*`, giữ `!.env.example`, ignore report live chứa dữ liệu nếu có. `.env.example` ghi key rỗng và ba tên cấu hình đã chốt; không sửa `.env` thật.
- [ ] Viết test `missing LLM_API_KEY fails without echoing env`; `normalizes trailing slash`; `rejects non-HTTPS model base URL`; `defaults timeout 35000 and output 1200`. URL endpoint lấy từ server config, không nhận từ request người dùng.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts supabase/functions/_shared/ai/tests/config.test.ts`; phải đỏ do thiếu implementation trước khi viết hàm.
- [ ] Cài `readLlmConfig`; lỗi chỉ nêu tên biến/cause an toàn, không serialize config. Cấu hình số không hợp lệ phải báo lỗi.
- [ ] Chạy lại test trên; `git check-ignore .env` phải trả `.env`, `git check-ignore .env.example` phải không match. Chạy `deno check --config supabase/functions/ai-worker/deno.json supabase/functions/_shared/ai/config.ts`; import schema chung được kiểm tra sau Task 2, khi file đó tồn tại.

**Đầu ra:** test harness chạy, config có kiểm tra, secret bị ignore; không phải một lần gọi model thành công.

### Task 2: Hợp đồng Recovery/AI, engine input và fixture

**Files:** contracts, `packages/engine/src/types.ts`, fixture/eval files ở bảng; phối hợp exports với API.

**Interfaces:** xuất `ActionSchema`, `ConditionCheckSchema`, `ProposalOptionSchema`, `PlanComposeOutputSchema`, `ObservationAnalyzeOutputSchema`, `IncidentAssessOutputSchema`, `EventSummarizeOutputSchema`, `AnalysisJobSchema`; type suy ra từ Zod. `EngineInput` là readonly projection của các kiểu canonical: project, areas, members, availability, resources, tasks, criteria, dependencies, requirements, assignments, claims/evidence, incidents/links, requests, proposals/actions; thời gian riêng `now: string`. Không biến DTO mobile có lọc quyền thành input engine đầy đủ.

- [ ] Lập bảng field → nguồn §§7.2–7.3, 9.4, 10.3–10.6, 11; gửi API/DB đối chiếu các enum, nullability, key/alias/UUID. Phần thiếu hoặc mâu thuẫn đi vào bảng GAP trong handoff.
- [ ] Viết test schema trước: Action có đúng năm biến thể; alias của `ActionDraft` được chấp nhận ở output model nhưng UUID required ở Action dùng ghi; cấm field `validity`/`readiness` do model thêm; plan `reply` tối đa 600, observation tối đa 8 claim, incident tối đa 2 option AI, summary tối đa 5 item/list với ít nhất một ref/item.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts packages/contracts/tests/ai.test.ts packages/contracts/tests/recovery.test.ts`; quan sát fail đúng chỗ.
- [ ] Viết schema đúng spec, strict với object đầu ra model. Chỉ áp giới hạn có trong spec; điều kiện phụ thuộc snapshot để validator nghiệp vụ xử lý. Field alias hợp lệ về cú pháp vẫn phải qua kiểm tra bảng ánh xạ.
- [ ] Tạo một fixture hợp lệ/module và biến thể lỗi; `loadEvalCase(module, name)` trả snapshot/input, raw model output, kỳ vọng code-checkable, schema/prompt version. Fixture là sự kiện tổng hợp khác §4; ID/thời gian cố định.
- [ ] Chạy lại hai test và `pnpm exec vitest run --config vitest.ai.config.ts tests/ai-evals/fixtures.test.ts`; tất cả fixture được parse bằng schema canonical. `deno check --config supabase/functions/ai-worker/deno.json packages/contracts/src/ai/index.ts` phải pass.

**Đầu ra:** contracts/fixture bản đầu có review API; chưa có toàn bộ dataset eval §10.10 hay threshold chất lượng.

### Task 3: Engine primitive, alias và pipeline bốn lớp

**Files:** `engine/src/checks.ts`, `tests/checks.test.ts`, AI `types.ts`, `aliases.ts`, `validation.ts` cùng tests.

**Interfaces:** `classifyOptionChecks(checks: readonly ConditionCheck[]): 'VALID' | 'PENDING_VERIFICATION' | 'INVALID'`; `buildAliasMap(refs: readonly ScopedRef[], projectId: string): AliasMap`; `resolveAlias(map, alias, expectedKind): string`; `validateOutput(raw: string, context: ValidationContext, validators: ModuleValidators): ValidationResult`.

`ScopedRef = { id: string; project_id: string; kind: 'TASK'|'MEMBER'|'RESOURCE'|'AREA'|'OBSERVATION'|'CLAIM'|'INCIDENT'|'UNKNOWN'|'CRITERION'|'MEDIA' }`. Prefix lần lượt T/M/R/A/O/C/I/U/K/P. `ValidationContext` chứa module, alias map, snapshot và `now`; không có API key. `ValidationResult` phân biệt `ok` với sanitized value/warnings và `error` với stage/code/safe details. `ModuleValidators` buộc khai báo cả references/policy/business; thiếu hook trả `MODULE_NOT_READY`.

- [ ] Viết test `FR-REC-03 FALSE dominates UNKNOWN; UNKNOWN dominates TRUE`; checks rỗng bị từ chối, không được coi là VALID. Fixture có điều kiện ACTION_COUNT; không biến primitive này thành toàn bộ validator action.
- [ ] Viết test alias ổn định khi đảo thứ tự input (sắp theo kind/id); loại ID khác project; alias đúng tên nhưng sai kind bị từ chối; input đóng băng không bị sửa.
- [ ] Viết test pipeline cho JSON hỏng, field tự duyệt, alias không tồn tại; lớp sau không chạy khi lớp trước lỗi. Theo đề xuất GAP-01: alias lạ loại toàn bộ; option có ID đúng nhưng vi phạm điều kiện có thể bị bỏ riêng ở business hook.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts packages/engine/tests/checks.test.ts supabase/functions/_shared/ai/tests/aliases.test.ts supabase/functions/_shared/ai/tests/validation.test.ts`; xác nhận fail, rồi viết các hàm.
- [ ] Với hook giả kiểm tra được thứ tự/lỗi; production registry không dùng hook giả hay hook luôn trả hợp lệ. Không đưa generic recursive alias replacement vào field văn xuôi.
- [ ] Chạy lại tests; kiểm tra import engine không chứa runtime/network/clock/RNG; input fixture vẫn bằng bản trước khi gọi. Gắn các test nền với INV-02/03 và AT-25, chưa đánh dấu AT hoàn thành.

**Đầu ra:** primitive và hạ tầng validation; logic eligibility/risk/claim/recovery đầy đủ được làm trong các WP sau.

### Task 4: OpenRouter adapter, log và lỗi có kiểu

**Files:** AI `openrouter.ts`, `logging.ts`, `types.ts`, tests; không đọc `.env` trong test.

**Interfaces:** `ModelPort.complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>`; `createOpenRouterClient(config: LlmConfig, fetchImpl: typeof fetch): ModelPort`. `ModelRequest` chứa module, promptVersion, system text, user content, JSON Schema; `ModelResponse` chứa rawContent, requestedModel, actualModel, usage nullable, requestId nullable, latencyMs. Lỗi kiểu hóa: timeout/network/http/schema-response/config; safe metadata không chứa body hoặc header.

- [ ] Viết fetch-fake test endpoint `/chat/completions`, bearer header, model lấy từ config, `response_format.type=json_schema`, `strict=true`, `provider.require_parameters=true`, không tools/streaming/model fallback list.
- [ ] Viết test timeout 35000ms bằng fake timer, 429/5xx, 401/403 không retry, HTTP 200 nhưng error body/content rỗng, JSON không hoàn chỉnh do hết token, usage vắng phải là null. Không đánh đồng thiếu usage với 0 cost.
- [ ] Viết test log capture dùng secret/JWT/URL ký giả làm sentinel: không xuất hiện trong message/details. User text chỉ nằm user message, không nối vào system prompt.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts supabase/functions/_shared/ai/tests/openrouter.test.ts supabase/functions/_shared/ai/tests/logging.test.ts`; đỏ trước, rồi cài adapter bằng fetch.
- [ ] Đặt timeout bao trùm cả đọc response body; luôn giải phóng timer. Adapter không tự retry; worker là nơi duy nhất quyết định attempt. Schema không được provider hỗ trợ phải báo lỗi, không hạ xuống JSON tự do.
- [ ] Chạy lại tests; `deno check --config supabase/functions/ai-worker/deno.json supabase/functions/_shared/ai/openrouter.ts`. Model routing khác backend của OpenRouter không được mô tả là model fallback; ghi metadata thực tế có sẵn cho reproducibility, không tự suy tên provider.

Theo [OpenRouter Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs), `require_parameters` lọc endpoint hỗ trợ tham số; strict/schema vẫn cần validator phía server. Chuyển đổi sang JSON Schema phải được kiểm tra cho version Zod đã khóa.

**Đầu ra:** transport kiểm thử bằng fetch giả; chưa chứng minh tài khoản có quyền gọi model.

### Task 5: Worker core với store/model giả

**Files:** worker `ports.ts`, `process-job.ts`, `retry.ts`, `registry.ts`, tests; test support store/model giả.

**Interfaces:** `processJob(message: QueueMessage, deps: WorkerDeps): Promise<ProcessOutcome>`; `QueueMessage = { message_id: string; job_id: string }`; `ProcessOutcome = 'SUCCEEDED' | 'DISCARDED_STALE' | 'RETRY_SCHEDULED' | 'DEAD' | 'SKIPPED' | 'MODULE_NOT_READY'`. `nextRetry(errorClass: 'TRANSIENT' | 'SCHEMA' | 'ID' | 'PERMANENT', attempts: number, schemaIdFailures: number): { retry: boolean; delayMs: number }`; attempts/failures tính cả lần vừa lỗi. Store port trong handoff là nguồn duy nhất cho peek/claim/budget/load/log/commit/retry/ack. `WorkerDeps` gồm store, model, module registry, clock truyền vào; không chờ backoff bằng sleep trong Edge Function.

- [ ] Viết test job terminal/duplicate không gọi model hoặc ghi lại; AI tắt/hết budget không gọi model, yêu cầu đường thủ công có log; handler chưa sẵn sàng không claim/gọi model và trả `MODULE_NOT_READY`.
- [ ] Viết test transient failures tối đa 3 attempt, delay 2000 rồi 8000ms; schema/ID chỉ retry một lần; permanent 401/403 dừng. Lịch retry được lưu bền vững qua store, không chỉ hẹn trong RAM.

```ts
it('INV-08 retries are bounded across worker restarts', () => {
  expect(nextRetry('TRANSIENT', 1, 0)).toEqual({ retry: true, delayMs: 2000 });
  expect(nextRetry('TRANSIENT', 2, 0)).toEqual({ retry: true, delayMs: 8000 });
  expect(nextRetry('TRANSIENT', 3, 0)).toEqual({ retry: false, delayMs: 0 });
  expect(nextRetry('SCHEMA', 1, 1)).toEqual({ retry: true, delayMs: 2000 });
  expect(nextRetry('ID', 2, 2)).toEqual({ retry: false, delayMs: 0 });
  expect(nextRetry('PERMANENT', 1, 0)).toEqual({ retry: false, delayMs: 0 });
});
```

Delay schema/ID dùng lịch backoff chung là lựa chọn triển khai đề xuất; §9.6 chỉ quy định số lần retry cho hai lỗi này. `schemaIdFailures` phải được store giữ qua restart, không đếm lại từ 0 mỗi invocation.

- [ ] Viết test revision đổi sau inference → `DISCARDED_STALE`, không business write, vẫn inference log; state version đổi nhưng incident revision giữ nguyên → đọc/tính lại tối đa 3 lần theo §11.0, không tự đánh dấu incident stale.
- [ ] Viết test crash sau commit trước ack → lần giao lại chỉ ack; crash khi RUNNING cần reclaim/fencing theo GAP-02; crash sau model trước log không được bịa log thành công. Ghi phần nào chưa bảo đảm được với provider không có idempotency.
- [ ] Viết test hai job tranh suất ngân sách cuối chỉ một model call được cấp; ghi inference log cho mọi attempt thực tế có kết quả/lỗi quan sát được. Không đổi enum `inference_outcome` tùy tiện; map lỗi theo hợp đồng DB.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts supabase/functions/ai-worker/tests/process-job.test.ts supabase/functions/ai-worker/tests/retry.test.ts`; quan sát đỏ, rồi cài core và fake store đáp ứng port.
- [ ] Chạy lại tests; registry production mặc định không đăng ký module chưa hoàn thiện. Fake store không được import từ entrypoint. Snapshot builder/hook thật của từng module được bổ sung theo WP-1…6.

**Đầu ra:** vòng đời worker chứng minh bằng store giả; race/transaction thật vẫn phải qua Task 6.

### Task 6: Entrypoint riêng tư và adapter Supabase

**Files:** worker `handler.ts`, `index.ts`, `supabase-store.ts`, `deno.json`, tests handler/integration. Đề xuất thay đổi `supabase/config.toml` cho DB, không tự sửa cấu hình deploy chung.

**Interfaces:** `createWorkerHandler(deps, workerSecret): (request: Request) => Promise<Response>`; request `{ mode: 'drain' | 'sweep' }`. Không chấp nhận prompt, model URL, snapshot hay project scope do caller cung cấp. `SupabaseStore implements WorkerStore` theo handoff; tên RPC SQL chỉ khóa sau DB review.

- [ ] Chốt GAP-02/03/04 và bảng RPC; nếu thiếu, ghi `INTEGRATION_PENDING` trong chứng cứ, tiếp tục test core nhưng không giả định adapter đã nối.
- [ ] Viết handler test thiếu/sai internal secret hoặc chỉ có user JWT → 401 trước bất kỳ store/model call; body sai → 400; method khác POST → 405. Service-role key không được dùng làm worker invocation secret.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts supabase/functions/ai-worker/tests/handler.test.ts`; đỏ rồi cài handler. Entrypoint đọc secrets từ Deno env, dùng dependency injection vào core.
- [ ] Viết integration tests với Supabase local và model giả: hai worker claim một job; stale commit; rollback nghiệp vụ + event/version; delivery lại sau commit; retry/reclaim có lease; budget reservation đồng thời; các module không đăng ký không bị tiêu thụ nhầm. Test harness đăng ký fixture handler riêng để thử RPC commit; entrypoint production không import fixture handler này.
- [ ] Chạy `supabase start`, `pnpm exec vitest run --config vitest.ai.config.ts --project integration supabase/functions/ai-worker/tests/supabase-store.integration.test.ts`; đỏ do thiếu adapter rồi cài mapping sang RPC đã thống nhất. Không dùng `db reset` hoặc xóa dữ liệu như một bước mặc định.
- [ ] Chạy lại integration; `deno check --config supabase/functions/ai-worker/deno.json supabase/functions/ai-worker/index.ts`; kiểm chứng local serve/bundle theo cấu hình API/DB. Chỉ disable gateway JWT cho worker nếu handler internal-secret và test từ chối user JWT đều đạt; không áp dụng cho `api`.
- [ ] `sweep` ở WP-0 chỉ có khung port và queue recovery đã thống nhất. R1–R5/expiry/push nghiệp vụ được bổ sung theo mốc; không khai sweep hoàn chỉnh hoặc lên Cron production khi các hook chưa có.

**Đầu ra:** adapter/entrypoint riêng tư hoạt động với local DB hoặc báo rõ phụ thuộc còn thiếu; không deploy staging/prod trong task này.

### Task 7: Smoke model thật và bàn giao WP-0-AI

**Files:** live smoke/eval README/ảnh tổng hợp, `docs/ai/wp-0-verification.md`.

**Interfaces:** CLI `live-smoke.ts --case text-schema|image-schema --max-calls 1 --max-output-tokens 256`; command chủ động mới đọc env. Smoke prompt `wp0-smoke-v1`, schema nhỏ chỉ dùng cho chẩn đoán adapter, không giả làm prompt module nghiệp vụ đã hoàn thiện.

- [ ] Viết test CLI bằng model giả: thiếu lựa chọn case/quota → từ chối; tối đa một request và không retry; timeout 35000ms, output 256; không log key/raw payload. `--case image-schema` dùng ảnh hình vuông đỏ tổng hợp được lưu trong repo, không gọi dịch vụ tạo ảnh.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts tests/ai-evals/live-smoke.test.ts`; đỏ rồi cài CLI. Ảnh này chỉ chứng minh đường truyền input ảnh, không chứng minh chất lượng phân tích evidence.
- [ ] Chạy lại test; xác minh cấu hình model trong catalog/capability nếu truy cập được, nhưng không dùng catalog thay live test. Không đổi model khi bị lỗi mà không ghi quyết định và chạy lại eval.
- [ ] Khi thực thi smoke, dùng Deno env-file và quyền giới hạn; lệnh dự kiến từ repo root:

```bash
deno run --config supabase/functions/ai-worker/deno.json --env-file=.env --allow-env=LLM_API_KEY,LLM_BASE_URL,LLM_MODEL --allow-net=openrouter.ai --allow-read=tests/ai-evals tests/ai-evals/live-smoke.ts --case text-schema --max-calls 1 --max-output-tokens 256
deno run --config supabase/functions/ai-worker/deno.json --env-file=.env --allow-env=LLM_API_KEY,LLM_BASE_URL,LLM_MODEL --allow-net=openrouter.ai --allow-read=tests/ai-evals tests/ai-evals/live-smoke.ts --case image-schema --max-calls 1 --max-output-tokens 256
```

Hai lệnh là tối đa hai inference request, mỗi case một request. Nếu provider báo không hỗ trợ schema/ảnh hoặc hết quota, ghi fail và dừng; không tự quét nhiều model. Không chạy bộ eval hàng trăm case trong bước này.

- [ ] Ghi ngày, commit/worktree dirty, dependency versions, model yêu cầu/thực tế, prompt/schema version, fixture checksum, latency, token usage nếu có, pass/fail và giới hạn kiểm chứng. Không bịa chi phí khi API không trả số liệu.
- [ ] Chạy `pnpm exec vitest run --config vitest.ai.config.ts`, lệnh integration Task 6 nếu DB đã sẵn sàng, `pnpm exec tsc --noEmit -p packages/engine/tsconfig.json`, Deno check Task 6, `git diff --check`; review diff, không stage/commit tự động.
- [ ] Bàn giao checklist và lệnh tái hiện cho owner; ghi riêng `LOCAL_PASS`, `INTEGRATION_PENDING/PASS`, `LIVE_SMOKE_PASS/FAIL/NOT_RUN`. Không dùng skip integration để tạo một báo cáo toàn xanh.

## 4. Tiêu chí hoàn thành và rủi ro

| Mức | Điều kiện |
|---|---|
| Nền local đạt | Task 1–5, fixture tests, type/import check và handler unit đạt; reviewer kiểm tra ranh giới engine/AI và secret |
| WP-0-AI đủ bằng chứng | Nền local + port DB được thống nhất + adapter kiểm thử local + smoke thật có log; gap còn lại có owner/mốc rõ |
| G0 đạt | Cả team đáp ứng NFR-14, app Android thật chạy với mock và Supabase local; AI không tự ký G0 |

Rủi ro ưu tiên: chia sẻ Zod qua Node/Deno; giới hạn 1200 output token có thể không đủ cho plan lớn; lease/job recovery; ngân sách concurrency; khác biệt dữ liệu fixture với DB thật. Giữ giới hạn hiện tại, đo và ghi đề xuất thay đổi thay vì tự nâng token hay đổi model.

## 5. Tự review kế hoạch

- Phạm vi §15.4 mốc 0 được phủ bởi Task 1–7; phần module/rule/route đầy đủ có WP đích trong roadmap.
- Hợp đồng chung và schema SQL thuộc owner tương ứng; các port mới chỉ là đề xuất, không phải migration được ngầm chấp thuận.
- Năm Review Focus đều có test sở hữu. Không dùng test giả để khẳng định atomicity hoặc quyền DB thật.
- Prompt/schema thay đổi ở các WP nghiệp vụ phải bump `PROMPT_VERSION`, chạy eval tương ứng; threshold chất lượng được team đặt sau baseline (§10.10).
- Không có lệnh commit/push/reset/deploy; không có key hoặc đường dẫn tuyệt đối riêng máy; tất cả lệnh triển khai được ghi rõ là dự kiến.
- Chưa có code nên chưa có kết quả build/unit/integration/live. Khi thực thi, bước đỏ/xanh phải ghi kết quả thực tế.
