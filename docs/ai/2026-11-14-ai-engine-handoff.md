# AI & Engine — Quyết định và hợp đồng cần phối hợp

Ngày: 2026-11-14. Đồng hành triển khai: người dùng và Codex, phạm vi luồng AI & Engine tại §15 của [MVP Specification](../WEAVE_MVP_Specification.md).

## 1. Quyết định đã chốt trong trao đổi

- Cả team bắt đầu từ tài liệu, chưa có code nền để kế thừa.
- Mình phụ trách engine, worker, bốn module AI, route #37–48, phần Recovery/AI của contracts, test/eval và tài liệu AI. Route #37 là claim resolve dù được đặt trong thư mục route incidents theo phân công.
- Dùng OpenRouter thay Vultr: `LLM_API_KEY`, `LLM_BASE_URL=https://openrouter.ai/api/v1`, `LLM_MODEL=anthropic/claude-haiku-5.5`. Không chép key vào tài liệu; `.env` chỉ dùng local, deployment dùng Edge secrets.
- Model thay được qua cấu hình; đổi model phải ghi phiên bản và đánh giá lại. Không tự fallback sang model chưa đạt eval.
- MVP text + ảnh. Video/audio là mở rộng về sau, không thêm schema/media pipeline cho chúng lúc này.

Đây là quyết định đã được người dùng cung cấp, không phải xác nhận của cả team. Khi triển khai Task 1, chuẩn bị thay đổi ADR/spec thành PR tài liệu riêng: thay provider/model/env, giữ quy tắc server-only; ghi lại các đoạn ADR cũ bị thay thế. Chưa sửa trực tiếp hai tài liệu nguồn trong đợt lập kế hoạch này. D-17/D-18 và các quyết định khác giữ trạng thái xác nhận như §17 hiện tại.

## 2. Cách triển khai đã đề xuất

Chọn contracts trước, engine thuần, I/O qua các port kiểm thử được. Đây là cách phù hợp với §11.0 và §15.5: không cần đợi mọi route/DB thật mới làm unit test, vẫn dùng chung schema với team.

Không xây một backend giả thứ hai thay cho `tools/mock-api` của API. Không chạy mọi logic qua model: code chịu trách nhiệm điều kiện, readiness, risk, claim, probe eligibility và số liệu. Fixture store chỉ hỗ trợ unit, không dùng làm lưu trữ runtime.

Chi tiết file, task và lệnh nằm trong [kế hoạch WP-0-AI](../superpowers/plans/2026-11-14-wp-0-ai-engine.md).

## 3. Bàn giao cho API và DB

| Bên | Đề nghị đầu ra | AI cung cấp | Điều kiện tích hợp |
|---|---|---|---|
| Mingpham/API | Monorepo/toolchain khóa version; contracts enum/domain/`POL.*`; error/auth envelope; convention import Node/Deno | Schema Recovery/AI, input/output engine, fixture | Schema một nguồn; Node/Vitest và Deno import cùng một bản |
| lh6104/DB | Schema, pgmq, worker-only RPC, transaction/version/log/budget, recovery lease | Port dưới đây, payload kiểm thử, các trường dữ liệu tối thiểu | DB chạy tests concurrency/rollback; AI chạy adapter integration |
| Mobile/API | Nhãn lỗi/fallback, freshness, notification/refetch | Sanitized module results và mã trạng thái đúng spec | Không coi ACK nhận job là AI thành công |

Chưa gửi tài liệu này cho thành viên khác. Người dùng có thể dùng làm bản trao đổi; agent không tự nhắn người khác.

## 4. Port TypeScript đề xuất — chưa phải tên SQL RPC

`WorkerStore` là lớp bọc nội bộ; DB chọn tên/chữ ký SQL tương ứng trong review. Không gọi trực tiếp các tên dưới đây như thể RPC đã tồn tại.

| Method | Input | Kết quả và trách nhiệm nguyên tử cần thống nhất |
|---|---|---|
| `receive` | `{ limit, visibility_timeout_sec }` | Message chứa job ID; không chứa prompt, secret hay snapshot |
| `peekJob` | `{ job_id }` | Job metadata hoặc null để kiểm tra module registry trước claim; đây là read hint, không thay claim/version check nguyên tử |
| `claim` | `{ job_id, message_id }` | `CLAIMED` + job/lease, `BUSY`, `TERMINAL`; claim độc quyền, tăng attempt đúng một lần |
| `reserveInference` | `{ job_id, lease, attempt }` | `ALLOWED`/`AI_DISABLED`/`BUDGET_EXCEEDED`; kiểm tra flag và giữ suất ngân sách đồng thời, không chỉ đọc counter rồi tăng sau |
| `loadContext` | `{ job_id, lease }` | Snapshot nội bộ có project scope, settings, `state_version`, `basis_revision`, payload theo job; không trả data project khác |
| `appendInferenceLog` | `{ job_id, attempt, module, model, prompt_version, usage, latency_ms, outcome, safe_validation_errors }` | Log append-only; thống nhất nhận dạng attempt để retry ghi log không tạo bản trùng |
| `commitResult` | `{ job_id, lease, expected_state_version, basis_revision, validated_result, derived_changes, inference_log }` | `COMMITTED`/`ALREADY_COMMITTED`/`STALE`/`VERSION_CONFLICT`/`LEASE_LOST`; khóa/kiểm tra/ghi kết quả, job status, event/version và inference log trong một transaction. Conflict không append log; stale append outcome `STALE_DISCARDED`. |
| `scheduleRetry` | `{ job_id, lease, error_code, delay_ms, schema_id_failures }` | Lưu trạng thái retry, bộ đếm lỗi schema/ID và thời điểm giao lại bền vững; claim tiếp theo trả lại bộ đếm, không chờ trong RAM worker |
| `finishFailure` | `{ job_id, lease, error_code, fallback_kind }` | Terminal + tác động fallback/log đúng module; thực thi một lần |
| `ack` | `{ message_id }` | Archive/delete message sau terminal; lặp lại an toàn |
| `recoverExpired` | `{ now, limit }` | Reclaim lease hết hạn theo GAP-02; worker cũ bị từ chối commit |

`lease` là giá trị opaque do DB cấp, đề xuất phục vụ fencing; chưa được tự thêm cột/schema. DB cần thống nhất cách lưu lease và `schema_id_failures` vì schema hiện chưa mô tả chúng. ID/time/status lấy từ contracts canonical. Transport failure khác domain result; không bắt mọi exception rồi trả thành công.

Giới hạn attempt áp dụng cả khi worker crash, không chỉ lỗi đã ghi nhận. RPC claim/recovery phải kiểm tra nguyên tử `POL.JOB_MAX_ATTEMPTS`: job đã hết lượt chuyển `DEAD` và fallback một lần, không tăng attempt hoặc cấp suất inference thứ tư. Core còn có guard trên attempt đã claim trước snapshot/budget/model để chặn adapter cũ hoặc sai; test cố ý mô phỏng adapter giao lại job quá giới hạn. `finishFailure` của guard phải có fencing như mọi lần kết thúc khác.

`validated_result`/`derived_changes` phải là discriminated union theo job/module, không `Record<string, any>` hay danh sách SQL tùy ý. Mỗi module chỉ được ghi các thực thể theo §10.3–10.6; engine không cung cấp quyền tự approve task hoặc ghi payout. Union cụ thể phải chốt với phần schema canonical trước Task 6.

Đối với write path có suy diễn: đọc V → tính engine → RPC với expected V. Lệch V thì đọc/tính lại tối đa 3 lần; lệch revision đối tượng làm kết quả AI stale. Không gọi lại model chỉ vì một thay đổi project không liên quan.

## 5. Spec gaps và hướng xử lý đề xuất

Các mục này không phải quyết định nghiệp vụ đã được team duyệt. Chỉ chặn phần triển khai phụ thuộc; vẫn làm được config, schema không tranh chấp, fake adapter và test primitive.

| ID | Bằng chứng | Đề xuất bảo thủ và bên cần chốt | Kiểm chứng / mốc |
|---|---|---|---|
| GAP-01 | INV-03, §10.2, AT-25 loại toàn bộ nếu ID lạ; AT-36 nói option có ID lạ bị bỏ riêng | Giữ kiểm tra ID toàn cục: alias/ID lạ loại toàn bộ. Chỉ option có tham chiếu hợp lệ nhưng sai điều kiện mới bỏ riêng. Đề xuất sửa AT-36 với API/product | Task 3; chốt trước validator `incident_assess` thật |
| GAP-02 | §9.6 giao ít nhất một lần nhưng §10.2 bỏ qua job không QUEUED; chưa có quy tắc worker chết lúc RUNNING | DB+AI thống nhất lease/reclaim/fencing, thời hạn lease lớn hơn tổng thời gian xử lý hoặc có renew; không dựa pgmq visibility đơn lẻ để cho worker cũ commit | Task 5 giả, Task 6 hai worker/crash thật; chặn production consumer |
| GAP-03 | `basis_revision` nullable cho observation/project; unique job và freshness chưa đủ rõ cho hai module này | DB+API+AI định nghĩa khóa dedupe và freshness từng job, bao gồm observation bổ sung, project close; không gán revision tùy ý để né null | Trước schema job/commit adapter thật |
| GAP-04 | DB-10/AT-46 chặn mọi ghi khi CLOSED, trong khi §10.6 cần commit summary sau close; logs/jobs cũng còn cần ghi | Đề xuất ngoại lệ worker nội bộ giới hạn summary/job/audit sau đóng; vẫn cấm mọi mutation người dùng ngoài ledger. Cần DB/product chốt, không nới guard chung | Trước adapter path đóng project; bắt buộc trước WP-6-AI |
| GAP-05 | §11.7 gọi CLAIM_SLOT như một loại link; §7.2 có CLAIM_SLOT trong link_entity, không link_role | Giữ enum canonical; yêu cầu DB/AI thống nhất encode slot (entity + payload/role hợp lệ), sửa văn bản mơ hồ | Trước `touch_incidents` WP-4 |
| GAP-06 | §9.6/10.2 không nói rõ quota bao gồm retry hay chỉ kết quả thành công; không có UTC daily reservation contract | Đề xuất mỗi outbound attempt tiêu một suất, reservation atomic theo UTC day, không refund khi đã gửi dù timeout. DB/API/product xác nhận, không triển khai bằng counter trong RAM | Trước Task 6 budget adapter |
| GAP-07 | §10.7 yêu cầu trần snapshot cho từng danh mục nhưng chỉ một số trần đã định nghĩa; model output 1200 token có thể cắt plan | Giữ các giới hạn đã có; mỗi module đề xuất cap còn thiếu bằng dữ liệu eval. `truncated` báo rõ; không tự nâng token hoặc gọi nhiều lượt | Snapshot builder ở từng WP, trước live module eval |

Crash sau khi provider nhận request nhưng trước khi worker lưu kết quả có thể dẫn đến lần gọi lặp lại và chi phí lặp lại; không hứa exactly-once inference. Atomic commit bảo vệ kết quả nghiệp vụ. Log chỉ ghi điều đã quan sát, không dựng outcome/tokens giả cho attempt mất phản hồi.

Quyết định thực thi WP-0: sau ba lần project version conflict, worker ghi thất bại và chuyển đường thủ công, không gọi lại model chỉ vì project đổi không liên quan. Đây là hành vi đề xuất cho worker (API vẫn trả 409 theo §11.0). `commitResult` mang inference log để tránh khoảng trống crash giữa commit và log; worker mất lease chỉ được ghi audit cho attempt đã quan sát, không ghi nghiệp vụ hoặc ack thay lease mới. Những yêu cầu này cần DB review trước Task 6 adapter.

## 6. Tiêu chí bàn giao và nguồn tham chiếu

### Bổ sung WP-1 — plan composition và dependency adapter

Checkpoint sau triển khai WP-1: database `4a1603a` chưa có worker RPC. Các helper member mutation tại `3a20a02` không được dùng thay worker actor path. `planComposeHandler` đã có kiểm thử với model/store giả; production registry và store vẫn chưa được gắn.

`DerivedChanges` hiện bổ sung union nội bộ `kind: 'PLAN_DRAFT'` với `draft_id`, `expected_revision`, `status: 'EDITING'`, `draft: PlanDraft`, `reply`, `change_summary`, `prompt_version`. Đây là đề xuất payload TypeScript, chưa phải chữ ký SQL được DB duyệt. Không có thao tác publish/approve trong delta.

DB adapter cần bảo đảm cùng một transaction: kiểm tra job/project/draft, lease và revision; ghi draft đã kiểm tra, tăng revision, đưa trạng thái về EDITING, append lời đáp/tóm tắt vào plan_messages, kết thúc job, ghi inference log/event, tăng state_version đúng một lần. Stale hoặc mất lease không được ghi draft. Terminal failure giữ draft cũ và mở lại đường sửa tay. Retry cùng job không tạo thêm user turn; số `ai_turns_used` cung cấp cho handler là số lượt đã dùng trước job đó, tối đa 12 lượt gồm job hiện tại.

Snapshot nội bộ cho module: project gồm ID/status và các trường sự kiện §10.3, `draft_id`, `revision`, `ai_turns_used`, `mode`, `draft`, `messages: {role,text}[]`; `JobContext` cung cấp state_version/basis_revision/now. Handler đối chiếu project/draft/revision với job đã claim. Chỉ snapshot tối thiểu đã loại ID/trợ cấp/người giữ được gửi model; SQL phải tự kiểm tra project scope của mọi custodian/reference trước ghi.

Trước khi bind thật phải có test local DB cho tất cả operation trong bảng WorkerStore: receive/peek/claim, reserveInference, loadContext, appendInferenceLog/commitResult, retry/failure/ack/recoverExpired. Bao gồm hai worker cạnh tranh, rollback sau lỗi ghi event/log, stale revision, lease fencing, giới hạn attempt và ngân sách. Chưa có bằng chứng này thì trả `INTEGRATION_PENDING`, không dùng in-memory store ở runtime.

### Bằng chứng và giới hạn

Một báo cáo WP-0 cần tách test local, tích hợp Supabase local, live smoke và nghiệm thu Android. Chưa có dữ liệu thì ghi `NOT_RUN`/`INTEGRATION_PENDING`, không đánh dấu đạt. Không mặc định đạt 51 AT từ bộ unit test.

Kiểm tra công khai khi lập kế hoạch, không phải benchmark WEAVE:

- [OpenRouter model page](https://openrouter.ai/anthropic/claude-haiku-5.5): catalog công bố model nhận text và ảnh; quyền truy cập tài khoản/structured output thực tế còn cần smoke.
- [Structured Outputs](https://openrouter.ai/docs/guides/features/structured-outputs): dùng schema và kiểm tra phía server, yêu cầu endpoint hỗ trợ tham số.
- [Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection): phân biệt fallback backend với đổi model; metadata giúp tái hiện lần chạy.
- [Deno Node/npm compatibility](https://docs.deno.com/runtime/fundamentals/node/): có hỗ trợ npm nhưng vẫn phải kiểm chứng cách import/package chung trong môi trường Supabase.

Chưa cài dependency, chưa gọi model thật, chưa tạo migration/route, chưa deploy và chưa sửa ADR/spec nguồn trong đợt lập kế hoạch.
