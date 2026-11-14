# WEAVE — Đặc tả sản phẩm & yêu cầu chức năng (MVP)

| | |
|---|---|
| **Phiên bản** | 0.3 — bản nháp để team review (0.2: viết lại §15 phân công, thêm §11.0, D-17, D-18 · 0.3: xóa hai tài liệu cũ khỏi repo, ghi nhận xác nhận D-17 và D-18) |
| **Ngày** | 2026-11-14 |
| **Phạm vi** | Sản phẩm MVP hoàn chỉnh. Không ràng buộc deadline; thứ tự làm việc theo phụ thuộc kỹ thuật (§15), không theo lịch. |
| **Nền tảng nghiệm thu** | Android (development build / APK cài trên máy thật) |
| **Ngôn ngữ sản phẩm** | Tiếng Anh — toàn bộ UI và đầu ra AI |
| **Người đọc** | 4 thành viên team và các coding agent |

---

## 0. Cách dùng tài liệu

### 0.1. Thứ tự ưu tiên nguồn

Khi các tài liệu mâu thuẫn nhau, áp dụng theo thứ tự:

1. **Tài liệu này** — nguồn duy nhất cho hành vi sản phẩm, dữ liệu, API, AI và tiêu chí nghiệm thu.
2. `WEAVE_4_0_Stack_Lock_ADR.md` — quyết định stack và phiên bản thư viện. Tài liệu này không lặp lại bảng stack; các thay đổi so với ADR ghi ở Phụ lục A.

Hai tài liệu trước đây đã được **xóa khỏi repo** ở bản 0.3 vì đã bị tài liệu này thay thế: bản thiết kế `WEAVE_4_0_Comprehensive_Product_Technical_Design.md` và prototype `WEAVE_4.0_Mobile_Prototype.html`. Cả hai còn trong lịch sử git (commit `d657cc6`) để tra cứu bối cảnh. Không dùng chúng để suy ra yêu cầu hay thiết kế UI; Phụ lục A ghi lại những gì đã thay đổi so với chúng.

### 0.2. Quy ước

- **PHẢI / KHÔNG ĐƯỢC**: bắt buộc. **NÊN**: mặc định, chỉ bỏ khi có lý do ghi lại. **CÓ THỂ**: tùy chọn.
- Mã định danh ổn định, dùng để tham chiếu trong code, test, commit và PR:
  `INV-nn` (bất biến), `FR-<MODULE>-nn` (yêu cầu chức năng), `SCR-nn` (màn hình), `AT-nn` (test nghiệm thu), `WP-<mốc>-<luồng>` (gói công việc, §15.4), `G0`…`G6` (cổng tích hợp), `D-nn` (quyết định mở), `POL.<NAME>` (hằng số chính sách, Phụ lục B).
- Mức ưu tiên: **P0** = bắt buộc có trong MVP. **P1** = làm sau khi toàn bộ P0 đạt nghiệm thu. **OUT** = không làm.
- Văn xuôi viết tiếng Việt. Tên bảng, cột, enum, endpoint, tên màn hình và **mọi chuỗi UI** viết tiếng Anh. Chuỗi trong `"ngoặc kép"` là UI copy đề xuất.
- Mọi con số ngưỡng (thời gian chờ, giới hạn, TTL) là **giá trị mặc định** đặt ở một chỗ (Phụ lục B), cần tinh chỉnh sau khi thử trên sự kiện thật. Chúng không phải kết quả đo.

### 0.3. Trạng thái của tài liệu

Bản nháp. Mục §17 liệt kê các quyết định đã được chọn thay cho team và cần xác nhận. Coding agent đọc §16 trước khi viết code.

---

## 1. Tổng quan sản phẩm

### 1.1. Một câu

WEAVE là ứng dụng Android giúp một đội 5–50 người vận hành sự kiện tại hiện trường: biết việc nào **xong có bằng chứng**, phát hiện khi **kế hoạch vỡ**, **hỏi đúng người** phần thông tin còn thiếu, và đưa ra **phương án xử lý hợp lệ** để người tổ chức duyệt.

### 1.2. Người dùng

| Vai trò | Là ai | Cần gì |
|---|---|---|
| **Organizer** (owner) | Người chịu trách nhiệm điều phối sự kiện | Kế hoạch dùng được nhanh, biết việc gì cần mình quyết ngay, quyết định có căn cứ |
| **Participant** | Tình nguyện viên / nhân sự hiện trường | Biết rõ mình làm gì, báo cáo trong vài thao tác, có quyền từ chối |

Một tài khoản có thể là organizer của sự kiện này và participant của sự kiện khác. Cả hai vai trò dùng chung một app.

### 1.3. Ba giai đoạn

1. **PLAN** — Organizer mô tả sự kiện bằng lời. AI và organizer **trao đổi qua lại** để ra danh sách công việc, tiêu chí hoàn thành, phụ thuộc, khu vực và **tài nguyên** (thiết bị, vật tư). Organizer thường không biết hết sự kiện có gì: AI gợi ý thứ cần có, hỏi lại, ghi nhận câu trả lời, đánh dấu thứ còn chưa chắc để kiểm tra sau, rồi chốt bản kế hoạch kèm vị trí đề xuất cho từng tài nguyên. Organizer duyệt rồi mới xuất bản.
2. **LIVE** — Participant nhận việc, gửi ảnh/ghi chú. AI hỗ trợ đối chiếu bằng chứng với tiêu chí. Khi có sự cố (người báo, AI suy ra, organizer tạo, hoặc luật hệ thống phát hiện), hệ thống tính ảnh hưởng, hỏi đúng người, đề xuất phương án; organizer duyệt; hệ thống giao việc theo phương án và theo dõi tới khi có xác nhận đã xử lý xong.
3. **CLOSE** — Tổng kết, nhật ký quyết định, bảng đối soát trợ cấp xuất CSV.

### 1.4. Bất biến (không được vi phạm ở bất kỳ tính năng nào)

| ID | Bất biến |
|---|---|
| **INV-01** | **Server là nguồn sự thật.** Trạng thái hợp lệ duy nhất nằm trong Postgres. Client không tự suy ra trạng thái; realtime và push chỉ là tín hiệu để refetch. |
| **INV-02** | **AI chỉ đề xuất.** AI không được: duyệt task, duyệt thành viên, giao việc, đổi lịch, đánh dấu sự cố đã xử lý, ghi sổ trợ cấp. Mọi thay đổi loại đó cần hành động của người có quyền và đi qua kiểm tra tất định của server. |
| **INV-03** | **Kết luận của AI phải có nguồn.** Mọi ID mà AI trả về phải nằm trong danh sách cho phép của snapshot đã gửi cho nó. ID lạ → loại bỏ toàn bộ kết quả. |
| **INV-04** | **Không áp dụng kết quả cũ.** Kết quả AI và phương án đều gắn với một revision; nếu dữ liệu liên quan đã đổi thì kết quả bị bỏ, phương án chuyển `STALE`. |
| **INV-05** | **Mutation idempotent.** Gửi lại cùng một yêu cầu (cùng `X-Idempotency-Key`) không tạo bản ghi thứ hai. |
| **INV-06** | **Nhật ký chỉ ghi thêm.** `event_log` và `observations` không sửa, không xóa từng dòng. Sửa sai bằng bản ghi mới. |
| **INV-07** | **Cô lập theo sự kiện.** Không dữ liệu nào đọc/ghi được bởi người không phải thành viên đã được duyệt của sự kiện đó. |
| **INV-08** | **Luôn có đường thủ công.** Mọi tính năng AI có lối đi không cần AI. AI lỗi/timeout → hiển thị rõ và chuyển sang xử lý tay; không bịa kết quả, không báo thành công giả. |
| **INV-09** | **Không thu thập thụ động.** Không GPS, không ghi âm/ghi hình nền. Vị trí và trạng thái có mặt là do người dùng tự khai. |
| **INV-10** | **Không dính tới tiền thật.** App chỉ ghi sổ và xuất file; không giữ, không chuyển tiền. |
| **INV-11** | **Không hardcode kịch bản.** Không nhánh code, prompt hay dữ liệu nào phụ thuộc ID, tên hay nội dung của một sự kiện cụ thể. |
| **INV-12** | **Không có secret ở client.** Khóa model và service-role chỉ tồn tại ở Edge Function secrets. |

### 1.5. Ngoài phạm vi (OUT)

iOS; web/tablet; nhiều organizer cho một sự kiện; vai trò area lead / reviewer; nhập kế hoạch từ ảnh/OCR; giọng nói; đa ngôn ngữ; bộ nhớ xuyên sự kiện; workspace tổ chức; thanh toán, ví, QR chuyển khoản; GPS, bản đồ trực tiếp; xử lý tình huống khẩn cấp về an toàn, y tế, an ninh (xem FR-INC-09).

---

## 2. Thuật ngữ

| Thuật ngữ | Định nghĩa |
|---|---|
| **Project** | Một sự kiện trong hệ thống. Từ "event" trong tài liệu này chỉ sự kiện ngoài đời; trong code dùng `project`, còn `event_log` là nhật ký. |
| **Member** | Một người trong một project, gắn với một tài khoản. Có `role` là `OWNER` hoặc `PARTICIPANT`. |
| **Area** | Khu vực có tên trong sự kiện ("Gate B", "Storage Room"). Dùng để biết việc/tài nguyên/người đang ở đâu. Không có tọa độ. |
| **Task** | Một việc có người làm, hạn, và ít nhất một **criterion**. |
| **Criterion** | Điều kiện kiểm tra được để coi task là xong ("Banner visible at entrance"). |
| **Resource** | Thiết bị hoặc vật tư mà task cần ("Scanner B", "Water bottles"). |
| **Assignment** | Một lần mời một member làm một task, kèm phản hồi của họ. |
| **Observation** | Một lần ai đó báo điều gì: ghi chú, ảnh, câu trả lời. Bất biến sau khi tạo. |
| **Submission** | Observation dùng để nộp task, chờ organizer duyệt. |
| **Claim** | Một mệnh đề đơn về hiện trường, rút ra từ observation ("Scanner B: FAILED"), kèm trạng thái tin cậy và nguồn. |
| **Fact slot** | Cặp (đối tượng, khóa) mà claim nói về, ví dụ (`Scanner B`, `resource.condition`). Hai claim còn hiệu lực có giá trị khác nhau trên cùng một slot là một **conflict**. |
| **Incident** | Một sự cố đang đe dọa kế hoạch. |
| **Unknown** | Một fact slot chưa có claim còn mới, mà phương án xử lý đang cần. |
| **Probe** (information request) | Câu hỏi hệ thống gửi cho một member cụ thể để lấp một unknown. |
| **Option** | Một phương án xử lý: 1–3 **action** có cấu trúc. |
| **Proposal** | Tập option (đã kiểm tra, đã xếp hạng) trình organizer cho một incident tại một revision. |
| **Readiness** | Kết luận tất định về việc incident đã đủ điều kiện để organizer duyệt phương án chưa. |
| **Revision** | Số đếm tăng dần của một incident hoặc plan draft; tăng mỗi khi dữ liệu liên quan đổi. Cơ chế chống kết quả cũ (INV-04). |
| **State version** | Số đếm tăng dần của cả project; tăng mỗi lần có commit thay đổi trạng thái. Client dùng để biết cần refetch. |
| **Attention Queue** | Danh sách việc organizer cần xử lý, xếp theo mức khẩn. |
| **TTAR / TTVR** | Thời gian từ lúc ghi nhận sự cố đến lúc phương án được duyệt / đến lúc có xác nhận đã xử lý xong. |

---

## 3. Vai trò và quyền

`✓` được phép · `own` chỉ với dữ liệu của chính mình · `—` không được phép. Server kiểm tra mọi dòng dưới đây; client chỉ ẩn/hiện nút.

| Hành động | OWNER | PARTICIPANT (approved) | Member PENDING |
|---|---|---|---|
| Xem tên sự kiện, trạng thái yêu cầu tham gia | ✓ | ✓ | ✓ |
| Tạo / sửa / đóng / xóa project | ✓ | — | — |
| Dùng Plan Studio, xuất bản kế hoạch | ✓ | — | — |
| Tạo, sửa, hủy task; sửa criteria, dependency, resource | ✓ | — | — |
| Tạo / vô hiệu mã mời; duyệt, từ chối, loại thành viên | ✓ | — | — |
| Xem danh sách thành viên (nickname, role tag, area, presence) | ✓ | ✓ | — |
| Xem bảng task của cả đội (tiêu đề, area, trạng thái, người làm, hạn) | ✓ | ✓ | — |
| Xem criteria và mô tả chi tiết của task | ✓ | ✓ | — |
| Mời nhận task (offer) | ✓ | — | — |
| Nhận / từ chối / bắt đầu / nộp / trả lại task | — | own | — |
| Gửi observation (ghi chú, ảnh, báo sự cố, báo tài nguyên) | ✓ | ✓ | — |
| Xem ảnh và nội dung observation | ✓ tất cả | own + observation gắn với incident/probe mình có liên quan | — |
| Duyệt / yêu cầu sửa submission | ✓ | — | — |
| Xem claim và trạng thái tài nguyên | ✓ | ✓ (chỉ đọc) | — |
| Xác nhận / bác một claim đang conflict | ✓ | — | — |
| Tạo, xác nhận, bỏ qua, đóng incident | ✓ | — | — |
| Xem incident | ✓ tất cả, đầy đủ | tiêu đề + trạng thái + task bị ảnh hưởng; chi tiết chỉ khi mình là người báo, người được hỏi, hoặc người được giao trong phương án | — |
| Trả lời probe | ✓ (unknown trên decision card) | own | — |
| Duyệt / bác proposal; quyết định thủ công | ✓ | — | — |
| Xem mức trợ cấp của từng task | ✓ | ✓ | — |
| Xem sổ trợ cấp (ai nhận bao nhiêu) | ✓ tất cả | own | — |
| Xem báo cáo cuối, xuất CSV | ✓ | — | — |
| Xem timeline | ✓ đầy đủ | đã lọc theo các quyền xem ở trên | — |
| Rời sự kiện; sửa hồ sơ của mình | — (owner không rời được) | own | own (hủy yêu cầu) |

---

## 4. Kịch bản tham chiếu

Kịch bản này là **dữ liệu kiểm thử và demo**, dùng xuyên suốt tài liệu để minh họa. Theo INV-11, hệ thống không được biết trước kịch bản: sự kiện được dựng qua API thông thường (script seed gọi API), còn các báo cáo trong lúc chạy do người thật gõ trên máy thật. Kết quả mong đợi mô tả bằng **tính chất**, không phải câu chữ cố định.

### 4.1. Bối cảnh

**"Saigon Build Day 2026"** — hội nghị công nghệ cộng đồng (hư cấu), khoảng 300 khách, 12 tình nguyện viên. Mở cửa 08:30, keynote 09:00.

- **Areas:** Lobby, Gate A, Gate B, Main Hall, Workshop Room, Storage Room.
- **Người:** An (organizer); Bao (check-in Gate B); Chi (check-in Gate A); Linh (logistics, ở Storage Room); Minh (AV, ở Main Hall, đang làm việc critical sát giờ); Khoa (workshop, ở Workshop Room).
- **Resources:** Scanner A (Gate A), Scanner B (Gate B), Lobby Wi-Fi (Lobby), 4G hotspot (Workshop Room, đã xác nhận có), Spare scanner (Storage Room, organizer trả lời "Not sure" khi lập kế hoạch).
- **Chuỗi task:** `Set up Gate B desk` → (HARD) → `Test check-in at Gate B` → (HARD) → `Open Gate B check-in` (critical, hard deadline 08:30). `Route queue between gates` phụ thuộc SOFT vào `Open Gate B check-in`.
- **Yêu cầu tài nguyên:** các task check-in ở Gate B cần `Scanner B` (hard) và một resource thuộc category `network` (hard).

### 4.2. Diễn biến và tính chất mong đợi

| Hồi | Việc xảy ra | Hệ thống PHẢI thể hiện |
|---|---|---|
| **0. Plan** | An nhập mô tả sự kiện. AI trả bản nháp và hỏi lại, trong đó có câu về thiết bị dự phòng. An trả lời "Not sure" cho spare scanner. | Bản nháp có task, criteria, dependency, areas, resources kèm vị trí đề xuất. Spare scanner ở trạng thái `UNVERIFIED`. Sau khi xuất bản, một câu hỏi kiểm tra tài nguyên được gửi cho người phù hợp (Linh). |
| **1. Verify** | Bao nộp ảnh bàn check-in Gate B. | AI đánh giá từng criterion. Criterion về scanner ("powered on") ra `INSUFFICIENT` nếu ảnh không cho thấy; AI không tự duyệt. An thấy cờ của AI khi review. |
| **2. Disruption** | Bao gửi ghi chú: "Scanner B won't turn on." (ghi chú thường, không bấm báo sự cố) | AI suy ra sự cố `RESOURCE_PROBLEM`, trạng thái `SUSPECTED`. An xác nhận bằng một chạm. `Test check-in at Gate B` và `Open Gate B check-in` thành `BLOCKED`; `Route queue between gates` thành `AT_RISK`. |
| **3. Probe** | — | Unknown: spare scanner có dùng được không. Probe gửi cho **Linh** (đang ở Storage Room, rảnh), không gửi cho Minh (đang bận việc critical). Linh thấy câu hỏi kèm lý do vì sao hỏi mình. |
| **4. Proposal** | Linh trả lời kèm ảnh: máy dự phòng bật được. | Claim về spare scanner thành `SUPPORTED`. Proposal xuất hiện với ít nhất một option `VALID` (đổi scanner, Linh mang sang), có nguồn, trade-off, kết quả kiểm tra điều kiện. Không hiển thị ETA bịa. |
| **5. Twist** | Trước khi An duyệt, Chi báo: "Scanner A can't load tickets either. Lobby Wi-Fi seems down." | Proposal cũ chuyển `STALE` ngay khi báo cáo được ghi nhận là liên quan: hoặc vì nó nói về tài nguyên mà task bị ảnh hưởng đang cần (tất định, §11.7), hoặc vì AI gắn nó vào incident. Nếu An bấm Approve trên màn hình cũ → bị từ chối với thông báo proposal đã cũ. Hệ thống đánh giá lại, hỏi tiếp nếu cần (ví dụ hỏi Khoa về 4G hotspot), và ra proposal mới phù hợp với dữ kiện mới. |
| **6. Dispatch** | An duyệt option mới. | Người được giao (Khoa) nhận lời mời có hạn trả lời ngắn và đồng ý. Incident ở `RECOVERING`, **chưa** `RESOLVED`. Sau khi có xác nhận tại chỗ (Bao báo check-in chạy lại), An đóng incident. TTAR và TTVR được ghi riêng. |
| **7. Close** | An đóng sự kiện. | Báo cáo có số liệu tính từ DB, tóm tắt AI có trích nguồn, CSV đối soát chỉ gồm task đã duyệt. |

Bản demo ngắn dùng các hồi 2–6 trên một sự kiện đã seed sẵn tới hết hồi 1.

---

## 5. Yêu cầu chức năng

Mỗi yêu cầu có dạng: **ID (mức) — tên.** Nội dung. *Nghiệm thu* liệt kê điều kiểm tra được. Hằng số `POL.*` xem Phụ lục B; trạng thái và chuyển trạng thái xem §8; endpoint xem §9.

### 5.1. AUTH — Đăng nhập và phiên

**FR-AUTH-01 (P0) — Hai lối vào.** Lần mở đầu tiên hiển thị hai lựa chọn: `"Join an event"` và `"Organize an event"`.

**FR-AUTH-02 (P0) — Participant vào bằng phiên ẩn danh.** Chọn `"Join an event"` tạo phiên Supabase anonymous nếu chưa có phiên. Không hỏi email, số điện thoại hay tên thật.
*Nghiệm thu:* phiên được lưu qua SecureStore; mở lại app không tạo user mới.

**FR-AUTH-03 (P0) — Organizer đăng nhập Google.** Tạo project yêu cầu tài khoản Google (native Google Sign-In, đổi ID token lấy phiên Supabase). Nếu thiết bị đang có phiên ẩn danh, PHẢI liên kết danh tính Google vào chính user đó để giữ các membership đã có. Nếu tài khoản Google đã thuộc user khác thì đăng nhập vào user đó và báo: `"Guest memberships on this device were not moved to this account."`
*Nghiệm thu:* user ẩn danh không gọi được `POST /v1/projects` (403 `FORBIDDEN`).

**FR-AUTH-04 (P0) — Khôi phục phiên.** Khi app bị kill và mở lại: phiên được khôi phục, token được refresh, app vào thẳng project mở gần nhất và refetch snapshot. Nếu refresh thất bại thì về màn hình đầu và nói rõ lý do.

**FR-AUTH-05 (P0) — Danh sách sự kiện.** Một tài khoản thấy mọi project mình là member (kể cả `PENDING`), nhóm theo vai trò, và chuyển qua lại được.

**FR-AUTH-06 (P0) — Đăng xuất.** Với phiên ẩn danh, PHẢI cảnh báo trước: `"You're signed in as a guest. Signing out will permanently remove your access to your events on this device."`

**FR-AUTH-07 (P1) — Participant liên kết Google** để giữ danh tính khi đổi máy hoặc cài lại.

### 5.2. EVT — Vòng đời sự kiện

**FR-EVT-01 (P0) — Tạo sự kiện.** Trường: `title` (3–80 ký tự), `brief` (mô tả tự do, 40–4000 ký tự), `venue_name` (tùy chọn), `starts_at`, `ends_at` (`ends_at > starts_at`, kéo dài tối đa 72 giờ), `timezone` (mặc định theo máy), `expected_team_size` (2–`POL.MAX_MEMBERS`), `expected_attendees` (tùy chọn), `currency` (mặc định `VND`). Project tạo ra ở `DRAFT`, người tạo là member `OWNER` với trạng thái `APPROVED`.

**FR-EVT-02 (P0) — Trạng thái.** `DRAFT` (đang lập kế hoạch) → `ACTIVE` (đã xuất bản kế hoạch; gồm cả chuẩn bị và lúc diễn ra) → `CLOSED` (khóa mọi mutation trừ đánh dấu sổ trợ cấp). Không quay ngược.

**FR-EVT-03 (P0) — State version.** Mọi commit thay đổi dữ liệu của project tăng `projects.state_version` đúng 1 và ghi ít nhất một dòng `event_log` cùng transaction.

**FR-EVT-04 (P0) — Sửa thông tin.** `title`, `venue_name`, `brief` sửa được ở `DRAFT` và `ACTIVE`. `starts_at`/`ends_at` chỉ sửa được ở `DRAFT`.
**FR-EVT-05 (P1) — Dời giờ sự kiện khi đang `ACTIVE`**, kèm lựa chọn dời toàn bộ hạn task theo cùng độ lệch.

**FR-EVT-06 (P0) — Xóa sự kiện.** Owner xóa được project sau khi gõ lại đúng tên. Xóa mềm ngay (không ai đọc được nữa), sau đó job nền xóa ảnh trong Storage và dữ liệu.

**FR-EVT-07 (P0) — Giới hạn.** Tối đa `POL.MAX_MEMBERS` member, `POL.MAX_TASKS` task, `POL.MAX_RESOURCES` resource, `POL.MAX_AREAS` area mỗi project. Vượt giới hạn trả 422 `LIMIT_EXCEEDED`.

### 5.3. MEM — Thành viên

**FR-MEM-01 (P0) — Mã mời.** Owner tạo mã 6 ký tự (chữ hoa và số, bỏ `0 O 1 I L`) kèm QR chứa deep link `weave://join?code=XXXXXX`. Mã hết hạn sau `POL.INVITE_TTL_HOURS`. Owner tạo mã mới (mã cũ mất hiệu lực) hoặc tắt mã. Mỗi project có tối đa một mã còn hiệu lực. Mời được ở `DRAFT` và `ACTIVE`.

**FR-MEM-02 (P0) — Luồng tham gia.** Nhập mã hoặc quét QR → xem tên sự kiện và tên organizer → màn hình đồng ý (FR-MEM-03) → nhập `nickname` (2–24 ký tự, không trùng trong project, không phân biệt hoa thường), chọn `role_tags` (nhiều lựa chọn từ danh sách của project, hoặc `"Other"`), khai `availability` (`"Whole event"` hoặc một hay nhiều khoảng giờ) → gửi yêu cầu. Member tạo ra ở `PENDING`.
*Nghiệm thu:* mã sai, hết hạn hoặc đã tắt đều trả cùng một lỗi `INVITE_INVALID`; quá `POL.JOIN_ATTEMPTS_PER_10_MIN` lần thử sai từ một user trả 429.

**FR-MEM-03 (P0) — Đồng ý trước khi tham gia.** Màn hình đồng ý nêu bằng tiếng Anh, ngắn gọn: dữ liệu được ghi (nickname, role, khung giờ và khu vực tự khai, ghi chú và ảnh do chính mình gửi); ai xem được; nội dung gửi lên có thể được xử lý bởi mô hình AI của bên thứ ba; app không dùng GPS và không thu thập nền; có quyền từ chối task và câu hỏi; cách rời sự kiện. Không tick đồng ý thì không gửi được yêu cầu. Lưu `consent_at` và `consent_version`.

**FR-MEM-04 (P0) — Duyệt thành viên.** Owner duyệt hoặc từ chối từng yêu cầu. Cài đặt `auto_approve_members` (mặc định tắt) cho phép tự duyệt. Member `PENDING` chỉ đọc được tên sự kiện và trạng thái yêu cầu của mình.

**FR-MEM-05 (P0) — Hồ sơ tự khai.** Member sửa được `nickname`, `role_tags`, `availability`, và hai trường trạng thái hiện trường:
- `presence`: `NOT_ARRIVED` (mặc định) → `ON_SITE` (bấm `"I'm here"`) ↔ `UNAVAILABLE` (bấm `"I'm unavailable"`, có thể kèm lý do).
- `current_area_id`: khu vực đang đứng, tự chọn. Khi member bắt đầu một task có area, hệ thống đặt `current_area_id` theo task đó.

Mỗi thay đổi `presence` hoặc `current_area_id` tạo claim tương ứng (FR-CLM-02).

**FR-MEM-06 (P0) — Loại thành viên / rời sự kiện.** Owner loại member (`REMOVED`) hoặc member tự rời (`LEFT`). Mọi assignment `OFFERED`/`ACCEPTED` của họ chuyển `RELEASED`, probe `PENDING` gửi cho họ chuyển `CANCELLED`, và luật FR-INC-04 được đánh giá lại. Dữ liệu họ đã gửi vẫn giữ.

**FR-MEM-07 (P0) — Role tags.** Mỗi project có danh sách `role_tags` (chuỗi ngắn, ví dụ `check-in`, `logistics`, `av`, `host`), khởi tạo từ Plan Studio và owner sửa được. Dùng để ghép người với task.

### 5.4. PLAN — Plan Studio (lập kế hoạch có trao đổi với AI)

Plan Studio là nơi organizer và AI cùng đi tới bản kế hoạch. Bản nháp sống trong `plan_drafts.draft_json` (kiểu `PlanDraft`, §9.4) và chỉ thành dữ liệu thật khi xuất bản.

**FR-PLAN-01 (P0) — Bản nháp đầu tiên.** Từ `brief` và các trường của project, AI (`plan_compose`, §10.3) trả về: `areas`, `tasks` (mỗi task có criteria, dependency, role tag, khu vực, hạn tương đối so với `starts_at`, cờ `critical`, cờ `hard_deadline`, thời lượng ước tính, tài nguyên cần), `resources` (tài nguyên AI cho là cần, kèm số lượng và **vị trí đề xuất**), `role_tags`, `questions` (tối đa `POL.PLAN_MAX_QUESTIONS_PER_TURN` câu hỏi làm rõ, mỗi câu có lý do và gợi ý trả lời nhanh), `assumptions` (điều AI đã tự giả định).
*Nghiệm thu:* mọi task có ít nhất 1 criterion; không có vòng lặp dependency; mọi tham chiếu (`area_key`, `resource_key`, `depends_on`) trỏ tới mục có trong bản nháp; nếu không đạt thì server từ chối kết quả AI và thử lại, hết lượt thì báo lỗi và giữ bản nháp trước đó.

**FR-PLAN-02 (P0) — Trao đổi nhiều lượt.** Organizer trả lời câu hỏi (chọn gợi ý hoặc gõ) và/hoặc gửi yêu cầu tự do (`"We only have two scanners"`, `"Add a photo booth near the lobby"`). Mỗi lượt gửi tạo job `plan_compose` mới nhận bản nháp hiện tại và hội thoại; kết quả là bản nháp mới, lời đáp ngắn, **tóm tắt thay đổi** (thêm / sửa / bỏ), và các câu hỏi còn lại. Tối đa `POL.PLAN_MAX_AI_TURNS` lượt AI cho mỗi bản nháp; hết lượt thì chỉ còn sửa tay.

**FR-PLAN-03 (P0) — Sửa tay luôn thắng.** Organizer thêm, sửa, xóa trực tiếp mọi mục của bản nháp. Mục đã sửa tay được đánh `locked = true`. Ở các lượt sau, AI nhận mục `locked` như dữ kiện cố định; server PHẢI khôi phục nguyên trạng mọi mục `locked` nếu kết quả AI làm đổi hoặc mất chúng. Organizer bỏ khóa từng mục được.

**FR-PLAN-04 (P0) — Xác định tài nguyên.** Với mỗi resource trong bản nháp, organizer chọn một trong bốn:

| Lựa chọn UI | `inventory_state` | Hệ quả |
|---|---|---|
| `"We have it"` | `CONFIRMED` | Có thể nhập số lượng, khu vực, người giữ |
| `"Need to get it"` | `TO_ACQUIRE` | Bản nháp thêm một task chuẩn bị tài nguyên này (organizer xóa được) |
| `"Not sure"` | `UNVERIFIED` | Sau khi xuất bản, hệ thống tạo câu hỏi kiểm tra tài nguyên (FR-RES-04) |
| `"Not needed"` | — | Bỏ resource và các yêu cầu tài nguyên trỏ tới nó |

Resource chưa được chọn mặc định là `UNVERIFIED`.

**FR-PLAN-05 (P0) — AI chốt, người duyệt.** Khi organizer bấm `"Finalize plan"`, AI chạy một lượt cuối để hợp nhất: gán khu vực cho task và resource còn trống, chuẩn hóa câu chữ, không thêm mục mới. Sau đó **code** liệt kê các điểm còn hở (`gaps`): resource `UNVERIFIED`, task critical chưa có criterion kiểm tra được bằng ảnh, tài nguyên được nhiều task cùng cần trong cùng khoảng giờ, mục chưa có khu vực, task critical bắt buộc role mà chưa có role tag. Màn hình review hiển thị bản chốt cùng danh sách điểm hở. Chỉ hành động `"Publish plan"` của owner mới xuất bản (INV-02).

**FR-PLAN-06 (P0) — Xuất bản.** Trong một transaction: kiểm tra lại toàn bộ ràng buộc ở FR-PLAN-01, tạo `areas`, `resources`, `tasks`, `task_criteria`, `task_dependencies`, `task_resource_requirements`, chuyển hạn tương đối thành thời điểm tuyệt đối, đặt project sang `ACTIVE`, ghi `event_log`. Task tạo ra ở `OPEN`.
*Nghiệm thu:* trước khi xuất bản, không participant nào thấy task; xuất bản hai lần với cùng `expected_revision` chỉ tạo dữ liệu một lần.

**FR-PLAN-07 (P0) — Không cần AI vẫn lập được kế hoạch.** Organizer tạo bản nháp trống và nhập tay toàn bộ. Nếu `plan_compose` lỗi, bản nháp hiện có được giữ nguyên và hiển thị `"AI couldn't update the plan. You can keep editing manually or try again."`

**FR-PLAN-08 (P0) — Sửa kế hoạch sau khi xuất bản.** Ở `ACTIVE`, owner thêm/sửa/hủy task, criteria, dependency, resource, area bằng tay. Server kiểm tra vòng lặp và tham chiếu như khi xuất bản. Sửa task đang có người nhận PHẢI thông báo cho người đó.
**FR-PLAN-09 (P1) — Nhờ AI bổ sung kế hoạch sau khi xuất bản** (mở lại hội thoại, kết quả là danh sách thay đổi để owner duyệt từng mục).

### 5.5. RES — Tài nguyên và khu vực

**FR-RES-01 (P0) — Mô hình tài nguyên.** Mỗi resource có: `name`, `category` (chuỗi ngắn dùng để tìm đồ thay thế, ví dụ `scanner`, `network`, `power`), `kind` (`ITEM` = một món theo dõi riêng; `SUPPLY` = vật tư theo lô, có `quantity` ước lượng), `inventory_state` (`CONFIRMED` / `REPORTED` / `UNVERIFIED` / `TO_ACQUIRE`), `condition` (`OK` / `FAILED` / `MISSING` / `LOW` / `UNKNOWN`), `area_id` (vị trí hiện tại), `custodian_member_id` (người giữ, tùy chọn).

**FR-RES-02 (P0) — Yêu cầu tài nguyên của task.** Một task khai báo cần resource cụ thể (`resource_id`) hoặc bất kỳ resource nào thuộc một `category`, kèm `hard` (thiếu thì không làm được) hay không.

**FR-RES-03 (P0) — Trạng thái tài nguyên đi theo bằng chứng.** `condition` và `area_id` của resource không sửa trực tiếp bằng form trạng thái. Chúng là hình chiếu của claim mới nhất còn hiệu lực trên các slot `resource.condition` và `resource.location` (FR-CLM-03). Owner và participant thay đổi chúng bằng cách gửi observation loại `RESOURCE_REPORT` (form có sẵn lựa chọn: `"Working"`, `"Not working"`, `"Missing"`, `"Running low"`, `"Moved to…"`, kèm ghi chú và ảnh tùy chọn).

**FR-RES-04 (P0) — Kiểm tra tài nguyên chưa chắc.** Với mỗi resource `UNVERIFIED` sau khi xuất bản, hệ thống tạo một information request loại `RESOURCE_CHECK` gửi cho member phù hợp nhất (theo §11.4; ưu tiên người giữ, rồi người ở cùng khu vực, rồi người có role tag liên quan), hạn trả lời `POL.RESOURCE_CHECK_EXPIRE_MINUTES`. Nếu chưa có ai phù hợp, mục này nằm trong Attention Queue của owner cho tới khi có. Câu trả lời cập nhật `inventory_state` thành `REPORTED` (chỉ lời nói) hoặc `CONFIRMED` (có ảnh hoặc owner xác nhận), hoặc đặt `condition = MISSING`.

**FR-RES-05 (P0) — Phát hiện tài nguyên mới.** Khi một observation nhắc tới thiết bị/vật tư chưa có trong danh sách (`"There's a spare projector in room 204"`), AI CÓ THỂ đề xuất thêm resource. Đề xuất hiện trong Attention Queue; chỉ owner bấm `"Add to inventory"` mới tạo resource (với `inventory_state = REPORTED`).

**FR-RES-06 (P0) — Khu vực.** Area có `name` duy nhất trong project và ghi chú tùy chọn. Xóa area chỉ được khi không còn task, resource hay member trỏ tới.

### 5.6. TASK — Công việc và phân công

**FR-TASK-01 (P0) — Trường của task.** `title` (3–80), `description` (≤1000), `area_id`, `role_tag` (tùy chọn) và `role_required` (bool), `start_at` (tùy chọn), `due_at`, `hard_deadline` (bool), `estimated_minutes` (mặc định `POL.DEFAULT_ESTIMATED_MINUTES`), `critical` (bool), `stipend_amount` (tùy chọn, số nguyên ≥ 0 theo `currency` của project), criteria (1–8, mỗi cái ≤200 ký tự, có cờ `critical` và `photo_expected`), dependency, yêu cầu tài nguyên.

**FR-TASK-02 (P0) — Một người một task.** Mỗi task có tối đa một assignment đang hoạt động (`OFFERED` hoặc `ACCEPTED`). Việc cần nhiều người thì tách thành nhiều task. Ràng buộc này PHẢI được ép ở DB (unique index có điều kiện), không chỉ ở code.

**FR-TASK-03 (P0) — Mời nhận việc.** Owner mời một member `APPROVED` nhận một task `OPEN`, kèm `respond_by` (mặc định `now + POL.OFFER_RESPOND_MINUTES`). Task sang `OFFERED`. Member nhận thông báo. Owner không nhận task (D-07).

**FR-TASK-04 (P0) — Gợi ý phân công (tất định, không dùng AI).** `"Suggest assignments"` trả về, cho mỗi task `OPEN`, danh sách member đủ điều kiện đã xếp hạng theo §11.3. Owner xem, sửa và gửi hàng loạt. Không tự gửi lời mời.

**FR-TASK-05 (P0) — Nhận / từ chối.** Người được mời bấm `"Accept"` hoặc `"Decline"` (lý do tùy chọn). Nhận → task `ACCEPTED`. Từ chối → assignment `DECLINED`, task về `OPEN`. Quá `respond_by` mà chưa trả lời → assignment `EXPIRED`, task về `OPEN`. Hai trường hợp sau kích hoạt FR-INC-04.
*Nghiệm thu:* hai yêu cầu Accept đồng thời trên cùng một task chỉ một cái thành công; cái còn lại nhận 409.

**FR-TASK-06 (P0) — Bắt đầu.** `"Start task"` chuyển `ACCEPTED` → `IN_PROGRESS`. Nếu task còn predecessor `HARD` chưa ở `SUBMITTED` hoặc `APPROVED`, nút bị khóa và hiển thị `"Waiting on: <task title>"`; owner có nút `"Unlock anyway"` (ghi log). Predecessor `SOFT` chỉ hiển thị cảnh báo. Nộp bài từ `ACCEPTED` được phép và tự coi như đã bắt đầu.

**FR-TASK-07 (P0) — Trả lại việc.** Người đã nhận bấm `"I can't do this"` (bắt buộc chọn lý do) → assignment `RELEASED`, task về `OPEN`, kích hoạt FR-INC-04.

**FR-TASK-08 (P0) — Cờ rủi ro tách khỏi trạng thái.** `tasks.risk` (`NONE` / `AT_RISK` / `BLOCKED`) và `risk_reasons` do engine ảnh hưởng (§11.1) tính lại, không ai sửa tay. Trạng thái task không đổi khi bị chặn, nên khi sự cố được xử lý task tiếp tục từ đúng chỗ cũ.

**FR-TASK-09 (P0) — Hủy / hoãn.** Owner hủy task (`CANCELLED`) hoặc hoãn (`DEFERRED`, mở lại được về `OPEN`). Assignment đang hoạt động chuyển `RELEASED` và người đó được thông báo.

**FR-TASK-10 (P0) — Bảng task của đội.** Mọi member `APPROVED` xem được danh sách task theo khu vực hoặc theo trạng thái, kèm người làm, hạn, cờ rủi ro.

**FR-TASK-11 (P1) — Participant tự nhận task đang `OPEN`** phù hợp role tag của mình (vẫn cần owner xác nhận nếu task `critical`).

### 5.7. EVD — Bằng chứng

**FR-EVD-01 (P0) — Gửi observation.** Mọi member `APPROVED` gửi được observation gồm `text` (≤1000 ký tự) và/hoặc tối đa `POL.MAX_PHOTOS_PER_OBSERVATION` ảnh; phải có ít nhất một trong hai. Loại (`kind`): `PROGRESS_NOTE`, `INCIDENT_REPORT`, `RESOURCE_REPORT`, `GENERAL_NOTE`, cùng các loại do luồng khác tạo (`TASK_SUBMISSION`, `PROBE_RESPONSE`, `RESOLUTION_CONFIRMATION`). Có thể gắn `task_id`, `resource_id`, `area_id`. Server tự lấy `member_id` từ phiên; `observed_at` do client gửi, `received_at` do server đặt.
*Nghiệm thu:* server trả ACK ngay sau khi commit, không chờ AI; cùng transaction đó ghi job phân tích (§9.6).

**FR-EVD-02 (P0) — Ảnh.** Chụp bằng camera hoặc chọn từ thư viện; xem trước rồi mới gửi; nén phía máy về cạnh dài ≤ `POL.MAX_IMAGE_EDGE_PX` và ≤ `POL.MAX_IMAGE_BYTES`; xóa EXIF vị trí. Tải lên qua URL ký sẵn do server cấp, vào bucket private. Server kiểm tra MIME (`image/jpeg`, `image/png`, `image/webp`) và kích thước. Ảnh chỉ đọc được qua URL ký ngắn hạn (`POL.SIGNED_URL_TTL_SEC`) cấp sau khi kiểm quyền.
*Nghiệm thu:* tải ảnh lỗi thì không tạo observation "có ảnh ma"; người dùng thử lại được hoặc gửi chỉ chữ.

**FR-EVD-03 (P0) — Không mất bản đang soạn.** Chữ và ảnh đang soạn được giữ cục bộ cho tới khi server ACK. Mất mạng hiển thị `"Not sent yet"` với nút `"Retry"`; không bao giờ hiển thị đã gửi khi chưa có ACK. Gửi lại dùng lại cùng idempotency key.

**FR-EVD-04 (P0) — Nộp task.** Người được giao gửi submission (observation loại `TASK_SUBMISSION`) cho task ở `ACCEPTED`, `IN_PROGRESS` hoặc `CHANGES_REQUESTED`. Task sang `SUBMITTED`. Nếu task có criterion `photo_expected` mà không kèm ảnh, hỏi lại một lần (`"This task usually needs a photo. Send without one?"`) nhưng không chặn.

**FR-EVD-05 (P0) — AI hỗ trợ đối chiếu.** Với mỗi submission, `observation_analyze` trả về cho từng criterion: `SUPPORTED` / `INSUFFICIENT` / `CONFLICTED` / `NOT_ASSESSED`, kèm giải thích một câu và ảnh nào làm căn cứ. Kết quả là **gợi ý**, gắn nhãn `"AI check"`, không đổi trạng thái task.
*Nghiệm thu:* không có đường code nào đặt task `APPROVED` từ kết quả AI.

**FR-EVD-06 (P0) — Gợi ý bổ sung.** Nếu có criterion `critical` ra `INSUFFICIENT` và submission chưa được review, người nộp nhận gợi ý `"AI couldn't confirm: <criterion>. Add a photo or note?"` và có thể bổ sung bằng chứng vào cùng submission. Không chặn hàng chờ review của owner.

**FR-EVD-07 (P0) — Owner review.** Owner xem ảnh, ghi chú, kết quả AI theo từng criterion, tick từng criterion đạt/không đạt (mặc định trống, không tự điền theo AI), rồi chọn `"Approve"` hoặc `"Request changes"` (bắt buộc ghi lý do). Approve → task `APPROVED`, assignment `COMPLETED`, sinh dòng sổ trợ cấp nếu task có `stipend_amount`. Request changes → task `CHANGES_REQUESTED`, người làm được thông báo kèm lý do; owner có thể tick `"Open an incident"` để tạo incident `HANDOFF_FAILED`.
*Nghiệm thu:* approve khi còn criterion `critical` chưa tick đạt bị chặn với thông báo rõ; owner tick đủ rồi mới approve được.

**FR-EVD-08 (P0) — AI không có vẫn review được.** Nếu phân tích lỗi hoặc AI bị tắt, submission vẫn vào hàng chờ với nhãn `"AI check unavailable"`.

### 5.8. CLM — Claim và trạng thái chung

**FR-CLM-01 (P0) — Rút claim từ observation.** `observation_analyze` tách mỗi observation thành các claim đơn. Mỗi claim gắn với một fact slot (`subject_type`, `subject_id`, `key`) và có `value` cùng câu diễn đạt (`statement`). Các khóa có cấu trúc:

| `key` | Đối tượng | Giá trị | Độ bền |
|---|---|---|---|
| `resource.condition` | resource | `OK` / `FAILED` / `MISSING` / `LOW` | VOLATILE |
| `resource.location` | resource | `area_id` | SEMI |
| `resource.exists` | resource | `YES` / `NO` | STABLE |
| `member.presence` | member | `ON_SITE` / `NOT_ARRIVED` / `UNAVAILABLE` | VOLATILE |
| `member.location` | member | `area_id` | VOLATILE |
| `task.progress` | task | `NOT_STARTED` / `ON_TRACK` / `LATE` / `DONE` | VOLATILE |
| `custom` | bất kỳ hoặc không | văn bản tự do | SEMI |

Claim hết hiệu lực (`STALE`) khi quá TTL theo độ bền (`POL.CLAIM_TTL_*`); STABLE không hết hạn.

**FR-CLM-02 (P0) — Claim từ hành động có cấu trúc.** Thay đổi `presence`, `current_area_id`, form `RESOURCE_REPORT`, và lựa chọn nhanh trong câu trả lời probe tạo claim **trực tiếp bằng code**, không qua AI.

**FR-CLM-03 (P0) — Trạng thái claim tính tất định.** Sau mỗi lần ghi claim, server tính lại trạng thái các claim trên cùng slot theo §11.2. Tóm tắt:
- `REPORTED`: một nguồn, chỉ lời nói.
- `SUPPORTED`: có ảnh kèm theo, hoặc từ hai member khác nhau trở lên cùng giá trị.
- `CONFLICTED`: slot có ≥2 claim còn hiệu lực với giá trị khác nhau từ các nguồn khác nhau. Với khóa `custom`, conflict do AI khai báo qua quan hệ `CONTRADICTS` tới claim có trong snapshot.
- `SUPERSEDED`: bị claim mới hơn **của cùng nguồn** trên cùng slot thay thế.
- `STALE`: quá TTL.
- `CONFIRMED` / `REJECTED`: owner quyết định tay; thắng mọi trạng thái tự tính cho tới khi có observation mới hơn trên slot đó.

**FR-CLM-04 (P0) — AI không phân xử conflict.** Khi slot `CONFLICTED`, hệ thống hiển thị cả hai phía kèm nguồn. Chỉ observation mới hoặc quyết định của owner (`"Mark as correct"`) gỡ được conflict.

**FR-CLM-05 (P0) — Nhãn hiển thị.** UI dùng đúng các nhãn: `Unknown`, `Reported`, `Supported`, `Conflicted`, `Stale`, `Confirmed by organizer`. Không hiển thị phần trăm tin cậy.

### 5.9. INC — Sự cố

**FR-INC-01 (P0) — Bảy loại.**

| `incident_type` | Khi nào | Ví dụ |
|---|---|---|
| `MEMBER_UNAVAILABLE` | Người vắng, từ chối, trả lại việc, không phản hồi | Bao không tới; Linh từ chối task critical |
| `RESOURCE_PROBLEM` | Thiết bị/vật tư hỏng, mất, thiếu, sai chỗ | Scanner B không lên nguồn |
| `TASK_DELAYED` | Task quá hạn hoặc chắc chắn trễ | Dựng sân khấu chưa xong lúc 08:00 |
| `HANDOFF_FAILED` | Bài nộp không đạt, phải làm lại | Banner treo sai vị trí |
| `CONFLICTING_INFO` | Hai nguồn nói ngược nhau về điều đang cần để quyết | "Wi-Fi ổn" và "Wi-Fi rớt" |
| `PLAN_CHANGE` | Thay đổi từ bên ngoài: lịch, địa điểm, thời tiết, yêu cầu, lượng khách | Diễn giả tới trễ 30 phút; mưa, phải chuyển check-in vào trong |
| `OTHER` | Không thuộc các loại trên | — |

**FR-INC-02 (P0) — Bốn nguồn tạo.**

| `origin` | Cách tạo | Trạng thái ban đầu |
|---|---|---|
| `PARTICIPANT_REPORT` | Member bấm `"Report a problem"`, chọn loại (hoặc `"Not sure"`), đối tượng liên quan, mô tả, ảnh tùy chọn | `OPEN` |
| `ORGANIZER_CREATED` | Owner tạo từ Command Center | `OPEN` |
| `SYSTEM_RULE` | Luật tất định ở FR-INC-04 | `OPEN` |
| `AI_INFERRED` | AI nhận ra từ một observation không phải báo sự cố | `SUSPECTED` |

**FR-INC-03 (P0) — Sự cố do AI suy ra cần xác nhận.** Incident `SUSPECTED` vào đầu Attention Queue với hai nút `"Confirm"` và `"Dismiss"`. Ở `SUSPECTED`: engine ảnh hưởng **có** chạy và hiển thị task có thể bị ảnh hưởng (dạng xem trước, chưa ghi `risk`); **không** gửi probe, **không** tạo proposal. Confirm → `OPEN`. Dismiss → `DISMISSED`, kèm lý do tùy chọn (dùng làm dữ liệu đánh giá AI).

**FR-INC-04 (P0) — Luật hệ thống.** Đánh giá khi có sự kiện liên quan và định kỳ mỗi phút:

| Luật | Điều kiện | Kết quả |
|---|---|---|
| R1 | Assignment thành `DECLINED` / `EXPIRED` / `RELEASED`, hoặc member bị loại/rời, và task `critical` hoặc `due_at` trong `POL.URGENT_WINDOW_MIN` phút tới | Incident `MEMBER_UNAVAILABLE` gắn task đó |
| R1b | Như R1 nhưng task không critical, không gấp | Chỉ thêm mục `"Needs an assignee"` vào Attention Queue |
| R2 | Member có assignment `ACCEPTED` chuyển `presence = UNAVAILABLE` | Incident `MEMBER_UNAVAILABLE` gắn member và các task đó |
| R3 | Task ở `OPEN`…`IN_PROGRESS` hoặc `CHANGES_REQUESTED` khi `now > due_at` | Incident `TASK_DELAYED` gắn task |
| R4 | Claim `resource.condition` ∈ {`FAILED`, `MISSING`} đạt `REPORTED` trở lên, và resource đang được một task chưa xong yêu cầu `hard` | Incident `RESOURCE_PROBLEM` gắn resource (nếu nguồn là báo cáo có cấu trúc; nếu nguồn là claim do AI rút từ văn bản tự do thì theo FR-INC-03) |
| R5 | Một slot thành `CONFLICTED`, slot thuộc resource/task/member liên quan tới task `critical` chưa xong, và chưa có incident `OPEN` nào chứa slot đó | Incident `CONFLICTING_INFO` |

**FR-INC-05 (P0) — Không tạo trùng.** Trước khi tạo, nếu đã có incident chưa đóng cùng `type` và cùng đối tượng chính, observation mới được **gắn thêm** vào incident đó (tăng revision) thay vì tạo incident mới. AI cũng có thể đề xuất gắn observation vào một incident đang mở (`ATTACH`); server kiểm tra ID.

**FR-INC-06 (P0) — Mức nghiêm trọng (tất định).** `CRITICAL`: có task bị ảnh hưởng vừa `critical` vừa `hard_deadline` và `due_at` trong `POL.URGENT_WINDOW_MIN` phút. `HIGH`: có task `critical` bị ảnh hưởng. `MEDIUM`: có task `BLOCKED`. Còn lại `LOW`. Tính lại mỗi lần revision tăng.

**FR-INC-07 (P0) — Vòng đời.** `SUSPECTED` → `OPEN` → `RECOVERING` (đã duyệt một phương án, đang thực thi) → `RESOLVED`; hoặc `DISMISSED` từ `SUSPECTED`/`OPEN`. Trong `OPEN`, trường `readiness` cho biết engine đang ở đâu (FR-REC-05). Nếu một action của phương án thất bại (người được giao từ chối, hết hạn), incident quay về `OPEN` và được đánh giá lại.

**FR-INC-08 (P0) — Đóng sự cố cần căn cứ.** `"Mark resolved"` yêu cầu một trong hai: chọn một observation làm bằng chứng đã xử lý xong, hoặc chọn `"Resolved without evidence"` kèm ghi chú. Khi mọi action của phương án đã `DONE`, hệ thống gửi câu hỏi `RESOLUTION_CHECK` cho người ở hiện trường (ví dụ `"Is check-in at Gate B working now?"`) và đưa câu trả lời vào Attention Queue dưới dạng gợi ý đóng. Việc duyệt phương án **không bao giờ** tự đặt `RESOLVED`.

**FR-INC-09 (P0) — Không xử lý tình huống khẩn cấp.** Nếu báo cáo có dấu hiệu chấn thương, cháy nổ, bạo lực hoặc nguy hiểm tức thời (AI đặt `safety = true`, hoặc người báo chọn `"Safety issue"`), app hiển thị cho người báo và owner: `"WEAVE doesn't handle emergencies. Contact venue security or emergency services now."` Incident tạo với loại `OTHER`, cờ `safety`, `readiness = ESCALATE_TO_HUMAN`; không probe, không proposal.

**FR-INC-10 (P0) — Revision.** Mỗi incident có `revision`. Bất kỳ commit nào chạm tới thực thể nằm trong `incident_links` của incident (task, resource, member, claim trên slot liên quan, assignment, probe của nó, observation gắn vào nó) PHẢI tăng `revision` trong cùng transaction và đặt lịch đánh giá lại (gộp các lần tăng trong `POL.INCIDENT_REASSESS_DEBOUNCE_SEC` giây thành một lần chạy).

### 5.10. PRB — Hỏi đúng người (probe)

**FR-PRB-01 (P0) — Khi nào được hỏi.** Một probe `FACT_CHECK` chỉ được tạo khi **tất cả** đúng: (a) incident ở `OPEN`; (b) unknown đó là điều kiện của ít nhất một option chưa bị loại; (c) slot chưa có claim còn hiệu lực; (d) có ít nhất một người đủ điều kiện (§11.4); (e) incident chưa có probe `PENDING`; (f) incident chưa dùng hết `POL.MAX_PROBES_PER_INCIDENT`; (g) cờ `ai_probe_enabled` bật. Nếu mọi câu trả lời khả dĩ đều dẫn tới cùng một option thì không hỏi.

**FR-PRB-02 (P0) — Chọn người và câu hỏi.** Code lọc và chấm điểm người đủ điều kiện (§11.4). AI chọn một người trong tối đa 5 người điểm cao nhất, viết câu hỏi (≤200 ký tự, một ý, kiểm tra được tại chỗ), lý do hỏi người đó (`why_you`, ≤160 ký tự), tối đa 4 lựa chọn trả lời nhanh, và có mời kèm ảnh hay không. Nếu AI lỗi, code chọn người điểm cao nhất và dùng câu hỏi mẫu theo loại khóa (§11.4).

**FR-PRB-03 (P0) — Giới hạn làm phiền.** Mỗi member có tối đa `POL.MAX_PENDING_PROBES_PER_MEMBER` probe `PENDING` trong một project. Không hỏi lại một người về unknown mà họ đã trả `CANNOT_CHECK` hoặc `DECLINED`. Câu hỏi không được yêu cầu chụp lén, ghi âm, hay hành động nguy hiểm.

**FR-PRB-04 (P0) — Trả lời.** Người nhận thấy câu hỏi, lý do, hạn, và ba hướng: trả lời (chọn nhanh và/hoặc gõ và/hoặc ảnh), `"Can't check"`, `"Decline"`. Trả lời tạo observation loại `PROBE_RESPONSE`. `CANNOT_CHECK` và `DECLINE` **không** tạo claim nào và không được hiểu là thông tin phủ định. Quá hạn (`POL.PROBE_EXPIRE_MINUTES`) → `EXPIRED`. Mọi kết cục đều tăng revision của incident.

**FR-PRB-05 (P0) — Owner trả lời trực tiếp.** Mỗi unknown trên decision card có nút `"I know this"` để owner tự trả lời (tạo observation của owner). Probe đang `PENDING` cho unknown đó chuyển `CANCELLED` và người nhận được báo không cần trả lời nữa.

**FR-PRB-06 (P0) — Probe thủ công.** Owner tự gửi câu hỏi cho một member bất kỳ từ decision card (chọn người, gõ câu hỏi). Vẫn áp dụng FR-PRB-03.

**FR-PRB-07 (P0) — Điều kiện dừng.** Engine ngừng hỏi khi: đã có option `VALID` và không unknown nào còn làm đổi lựa chọn; hết lượt probe; không còn ai đủ điều kiện; hoặc task bị ảnh hưởng nghiêm trọng nhất đã quá hạn cứng. Khi dừng mà chưa có option `VALID`, `readiness` thành `NO_VALID_OPTION` hoặc `ESCALATE_TO_HUMAN`.

### 5.11. REC — Phương án xử lý

**FR-REC-01 (P0) — Năm loại action.**

| `action_type` | Tham số | Ý nghĩa |
|---|---|---|
| `REASSIGN_TASK` | `task_id`, `to_member_id` | Giao task cho người khác |
| `SWAP_RESOURCE` | `for_task_id` hoặc `for_area_id`, `from_resource_id` (tùy chọn), `to_resource_id`, `carrier_member_id` (tùy chọn) | Dùng tài nguyên khác thay thế, có thể cần người mang tới |
| `RESCHEDULE_TASK` | `task_id`, `new_start_at` (tùy chọn), `new_due_at` | Dời giờ một task |
| `DEFER_TASK` | `task_id` | Hoãn một task không critical |
| `ADD_TASK` | `title`, `description`, `criteria[]`, `area_id`, `due_at`, `assignee_member_id` | Thêm một việc ứng phó mới |

Một option gồm 1–3 action. Điều kiện của từng loại và cách kiểm tra ở §11.5.

**FR-REC-02 (P0) — Ứng viên từ hai nguồn.** (a) **Code** sinh ứng viên từ loại incident và dữ liệu hiện có (§11.5) — đây cũng là đường thủ công khi AI tắt. (b) **AI** (`incident_assess`) được đề xuất thêm tối đa 2 option dựng từ năm loại action trên, chỉ dùng ID trong snapshot. Mọi option, từ nguồn nào, đi qua cùng một bộ kiểm tra tất định.

**FR-REC-03 (P0) — Ba mức hợp lệ của option.** Mỗi điều kiện của mỗi action được đánh giá `TRUE` / `FALSE` / `UNKNOWN` từ dữ liệu hiện tại:
- `VALID`: mọi điều kiện `TRUE`.
- `PENDING_VERIFICATION`: không có `FALSE`, có ít nhất một `UNKNOWN` (thiếu claim còn hiệu lực).
- `INVALID`: có ít nhất một `FALSE`. Không hiển thị cho owner; ghi log.

AI không được tự khai mức hợp lệ. Trường đó chỉ do server ghi.

**FR-REC-04 (P0) — AI xếp hạng và giải thích.** `incident_assess` trả về: tóm tắt tình huống (≤400 ký tự), thứ tự ưu tiên các option, với mỗi option: trade-off (≤3 ý), giả định (≤3 ý), các claim làm căn cứ; và option được khuyến nghị. Không được nêu con số thời gian, chi phí, xác suất nếu số đó không có trong snapshot.

**FR-REC-05 (P0) — Readiness (tất định).**

| `readiness` | Điều kiện |
|---|---|
| `ASSESSING` | Đang có job đánh giá chạy hoặc chờ chạy cho revision hiện tại |
| `READY_FOR_APPROVAL` | Có ≥1 option `VALID` và không có probe `PENDING` |
| `NEEDS_VERIFICATION` | Có probe `PENDING`; hoặc chưa có option `VALID` nhưng có option `PENDING_VERIFICATION` |
| `NO_VALID_OPTION` | Không có option `VALID` hay `PENDING_VERIFICATION`, và engine đã dừng hỏi |
| `ESCALATE_TO_HUMAN` | AI lỗi quá số lần thử, vượt `POL.MAX_AI_CALLS_PER_INCIDENT`, incident có cờ `safety`, hoặc AI bị tắt |

Ở mọi mức, owner luôn có `"Handle manually"` (FR-REC-09). Ở `ESCALATE_TO_HUMAN`, các option do code sinh (nếu có) vẫn hiển thị, không xếp hạng, gắn nhãn `"Not ranked by AI"`.

**FR-REC-06 (P0) — Decision card.** Hiển thị theo thứ tự: điều gì đã xảy ra (kèm nguồn); task bị ảnh hưởng và mức `risk`; điều đã biết (claim và nhãn); điều chưa biết và đang hỏi ai; các option. Mỗi option hiển thị: các action bằng câu thường (`"Linh brings the Spare scanner from Storage Room to Gate B"`), nhãn `VALID` hay `PENDING_VERIFICATION`, từng điều kiện kèm ✓ / ? và nguồn, trade-off, giả định, nhãn `"Recommended"` nếu có. Có phần `"What changed"` khi proposal thay thế một proposal trước đó.

**FR-REC-07 (P0) — Duyệt.** Owner chọn một option và `"Approve"`. Server, trong một transaction: (1) kiểm tra `expected_incident_revision` khớp và proposal còn `PENDING`; (2) **đánh giá lại toàn bộ điều kiện** của option trên dữ liệu hiện tại; (3) nếu không còn `VALID` → trả 409 `PROPOSAL_STALE`, chuyển proposal sang `STALE`, đặt lịch đánh giá lại; (4) nếu đạt → proposal `APPROVED`, tạo `recovery_actions`, thực hiện phần hiệu lực tức thì (§11.6), incident sang `RECOVERING`, ghi `decided_at`.
Option `PENDING_VERIFICATION` chỉ duyệt được bằng `"Approve anyway"`, bắt buộc ghi lý do; ghi `override = true`. Option `INVALID` không duyệt được.
*Nghiệm thu:* AT-32, AT-33.

**FR-REC-08 (P0) — Bác.** `"Reject"` (lý do tùy chọn) → proposal `REJECTED`. Incident ở lại `OPEN`; engine không tự đề xuất lại các option đã bị bác cho tới khi revision tăng.

**FR-REC-09 (P0) — Quyết định thủ công.** Owner tự dựng một option từ năm loại action (chọn task, người, tài nguyên, giờ). Server chạy cùng bộ kiểm tra; điều kiện `FALSE` chặn lại và nêu rõ điều kiện nào; điều kiện `UNKNOWN` cho qua kèm cảnh báo. Kết quả được ghi như một proposal có `source = MANUAL` đã `APPROVED`.

**FR-REC-10 (P0) — Thực thi cần sự đồng ý.** Action giao việc cho người (`REASSIGN_TASK`, người mang trong `SWAP_RESOURCE`, người làm `ADD_TASK`) tạo lời mời có cờ `recovery` và hạn trả lời `POL.RECOVERY_OFFER_RESPOND_MINUTES`. Người đó có quyền từ chối. Từ chối hoặc hết hạn → action `FAILED` → incident về `OPEN` và đánh giá lại, loại người đó khỏi ứng viên.

**FR-REC-11 (P0) — Hết hiệu lực chủ động.** Khi revision của incident tăng, mọi proposal `PENDING` của incident chuyển `STALE` trong cùng transaction. Client đang mở decision card nhận tín hiệu và hiển thị `"This proposal is out of date. Re-checking…"`, khóa nút duyệt.

**FR-REC-12 (P1) — So sánh hai option cạnh nhau** theo: task được gỡ chặn, task chịu thêm rủi ro, người và tài nguyên bị điều chuyển, điều kiện còn chưa biết. Chỉ dùng dữ liệu tất định.

### 5.12. NTF — Realtime, thông báo, hộp thư

**FR-NTF-01 (P0) — Tín hiệu refetch.** Sau mỗi commit, server phát trên kênh private `project:{project_id}` gói `{project_id, state_version, event_type}`. Client nhận tín hiệu có `state_version` lớn hơn bản đang giữ thì refetch snapshot. Không gửi nội dung nghiệp vụ hay ảnh qua kênh này.

**FR-NTF-02 (P0) — Refetch không phụ thuộc tín hiệu.** Client PHẢI refetch khi: mở app, quay lại foreground, có mạng trở lại, kênh realtime kết nối lại, và khi người dùng kéo để làm mới.

**FR-NTF-03 (P0) — Push.** Gửi push cho các sự kiện sau; mỗi push mở đúng màn hình liên quan:

| Người nhận | Sự kiện |
|---|---|
| Participant | Được duyệt vào sự kiện; có lời mời nhận task; có lời mời thuộc phương án xử lý; có câu hỏi (probe); submission được duyệt / bị yêu cầu sửa; task của mình bị sửa, hủy, hoãn; câu hỏi đã hủy |
| Owner | Có yêu cầu tham gia; có submission chờ duyệt; incident mới (`SUSPECTED` hoặc `OPEN`); proposal sẵn sàng; proposal thành `STALE`; action thất bại; `NO_VALID_OPTION` / `ESCALATE_TO_HUMAN`; lời mời bị từ chối hoặc hết hạn; có gợi ý đóng incident |

Nội dung push không chứa ảnh hay nội dung nhạy cảm; chỉ tiêu đề ngắn.

**FR-NTF-04 (P0) — Hộp thư trong app.** Mọi thông báo ở FR-NTF-03 cũng được ghi vào `notifications` và hiển thị trong app, có trạng thái đã đọc. Push thất bại không làm mất thông báo.

**FR-NTF-05 (P0) — Trạng thái kết nối.** Khi mất mạng hiển thị băng `"You're offline. Showing the last update from <time>."` và vô hiệu các nút mutation (trừ soạn bằng chứng theo FR-EVD-03).

**FR-NTF-06 (P1) — Hàng đợi gửi ngoại tuyến** cho observation: trạng thái `queued` / `sending` / `confirmed` / `failed`, tự gửi khi có mạng, dựa trên idempotency key.

### 5.13. FEED — Màn hình tổng hợp

**FR-FEED-01 (P0) — Attention Queue của owner.** Server dựng danh sách, xếp theo nhóm ưu tiên rồi theo hạn gần nhất:

1. **Act now** — incident `SUSPECTED` chờ xác nhận; incident `CRITICAL`/`HIGH` có `READY_FOR_APPROVAL`; `NO_VALID_OPTION`; `ESCALATE_TO_HUMAN`; action thất bại.
2. **Blocked / at risk** — incident `OPEN` còn lại; task `critical` chưa có người nhận trong `POL.URGENT_WINDOW_MIN` phút tới hạn.
3. **Needs verification** — incident đang chờ probe; slot `CONFLICTED`; resource `UNVERIFIED` chưa có ai để hỏi.
4. **Awaiting your review** — submission chờ duyệt; yêu cầu tham gia; gợi ý đóng incident; đề xuất thêm resource.
5. **FYI** — lời mời bị từ chối đã về `OPEN` (không gấp), task `OPEN` chưa có người.

Mỗi mục có: tiêu đề, một dòng "vì sao quan trọng", và nút hành động chính.

**FR-FEED-02 (P0) — Thanh trạng thái sự kiện.** Đầu Command Center: số task theo trạng thái (done / in progress / not started), số task `BLOCKED` và `AT_RISK`, số incident mở, số người `ON_SITE` trên tổng.

**FR-FEED-03 (P0) — Trang chủ participant.** Theo thứ tự: câu hỏi đang chờ mình; lời mời đang chờ; task đang làm (kèm criteria và nút nộp); task kế tiếp; nút `"Report a problem"` và `"Add a note"` luôn thấy. Không hiển thị đồ thị phụ thuộc.

**FR-FEED-04 (P0) — Timeline.** Dòng thời gian từ `event_log`, đã lọc theo quyền ở §3, phân trang, mới nhất trước. Mỗi dòng: thời điểm, ai, việc gì, liên kết tới đối tượng.

### 5.14. CLOSE — Đóng sự kiện và đối soát

**FR-CLOSE-01 (P0) — Đóng.** Owner bấm `"Close event"`. Nếu còn incident chưa đóng, submission chưa review, hoặc lời mời đang chờ, hiển thị danh sách và yêu cầu xác nhận `"Close anyway"`. Khi đóng: incident chưa đóng giữ nguyên trạng thái và được đánh dấu `open_at_close`; lời mời và probe đang chờ chuyển `CANCELLED`; project `CLOSED`.

**FR-CLOSE-02 (P0) — Báo cáo.** Mọi con số do SQL tính, không do AI: số task theo trạng thái cuối; tỷ lệ criteria được owner tick đạt; số incident theo loại và nguồn; số incident AI suy ra được xác nhận / bị bỏ qua; TTAR và TTVR (trung vị, min, max) trên các incident có đủ mốc; số probe đã gửi / trả lời / không kiểm tra được / từ chối / hết hạn; số proposal được duyệt / bị bác / `STALE`; số lần owner dùng `"Approve anyway"` và `"Handle manually"`.

**FR-CLOSE-03 (P0) — Tóm tắt AI.** `event_summarize` viết: một câu tổng quan, điều làm tốt, điều trục trặc, bài học — mỗi ý PHẢI trích ID incident / task / decision có trong snapshot. Gắn nhãn `"AI-written summary"`. AI lỗi → báo cáo vẫn đầy đủ phần số liệu.

**FR-CLOSE-04 (P0) — Sổ trợ cấp.** Mỗi task `APPROVED` có `stipend_amount > 0` sinh đúng một dòng `payout_ledger` (`PENDING`) cho người hoàn thành, với số tiền chốt tại thời điểm duyệt. Sửa `stipend_amount` sau khi task đã có người nhận yêu cầu owner xác nhận và thông báo cho người đó. Owner đánh dấu từng dòng `PAID_OUTSIDE` hoặc `VOID` (kèm lý do). App không thực hiện giao dịch nào (INV-10).

**FR-CLOSE-05 (P0) — Xuất CSV.** Owner xuất `settlement.csv` (UTF-8, có BOM): `member_nickname, task_title, approved_at, amount, currency, status`, cùng dòng tổng theo từng member. Chia sẻ qua share sheet của Android. Chỉ owner tải được.

**FR-CLOSE-06 (P1) — Xuất báo cáo tổng kết** dạng PDF hoặc Markdown.

### 5.15. SET — Cài đặt và công tắc

**FR-SET-01 (P0) — Cờ theo project** (owner bật/tắt, lưu trong `projects.settings`): `ai_enabled` (tắt thì mọi module AI ngừng; mọi luồng chạy theo đường thủ công), `ai_probe_enabled`, `ai_recovery_enabled`, `ai_vision_enabled` (tắt thì không gửi ảnh cho model), `auto_approve_members`. Mặc định: bốn cờ AI bật, `auto_approve_members` tắt.

**FR-SET-02 (P0) — Chế độ thủ công là sản phẩm dùng được.** Với `ai_enabled = false`, mọi AT không gắn nhãn AI ở §14 PHẢI vẫn đạt. Đây cũng là điều kiện đối chứng khi đo giá trị của AI (có AI so với không AI trên cùng app).

**FR-SET-03 (P0) — Ngân sách AI.** Mỗi incident tối đa `POL.MAX_AI_CALLS_PER_INCIDENT` lần gọi; mỗi project tối đa `POL.MAX_AI_CALLS_PER_PROJECT_PER_DAY`. Vượt ngưỡng → chuyển đường thủ công và báo rõ cho owner; không âm thầm bỏ qua.

---

## 6. Màn hình

### 6.1. Quy tắc chung cho mọi màn hình

- **UX-01** Mỗi màn hình có đủ bốn trạng thái: đang tải (skeleton), trống (có câu hướng dẫn và hành động kế tiếp), lỗi (thông điệp theo mã lỗi §9.2 và nút `"Try again"`), ngoại tuyến (FR-NTF-05).
- **UX-02** Nút mutation bị vô hiệu trong lúc yêu cầu đang chạy; không cho bấm hai lần. Kết quả hiển thị sau khi server trả lời, không cập nhật lạc quan cho các hành động thay đổi trạng thái nghiệp vụ (nhận việc, duyệt, quyết định).
- **UX-03** Mọi thứ do AI viết hoặc gợi ý mang nhãn `"AI"` thấy được. Mọi kết luận có nút xem nguồn (mở SCR-33).
- **UX-04** Hành động thường gặp của participant (nhận việc, nộp bài có ảnh, trả lời câu hỏi) hoàn thành trong tối đa 4 lần chạm kể từ khi mở thông báo.
- **UX-05** Vùng chạm tối thiểu 48dp; chữ thân tối thiểu 14sp; trạng thái không chỉ phân biệt bằng màu (luôn kèm nhãn chữ hoặc biểu tượng); hỗ trợ TalkBack cho mọi nút.
- **UX-06** Thời điểm hiển thị theo `timezone` của project, dạng 24 giờ. Hạn trong vòng 2 giờ hiển thị thêm dạng tương đối (`"in 12 min"`, `"8 min late"`).
- **UX-07** Hành động không hoàn tác được (xuất bản, đóng sự kiện, xóa, loại thành viên) có bước xác nhận nêu rõ hậu quả.
- **UX-08** Một bộ token màu/chữ/khoảng cách duy nhất trong `apps/mobile/src/theme`. Thành phần UI không tự đặt màu.

### 6.2. Điều hướng

```text
Launch
├─ chưa có phiên ............ SCR-01 Welcome
└─ có phiên ................. SCR-02 My Events
                               ├─ project (OWNER, DRAFT) ........ SCR-08 Plan Studio
                               ├─ project (OWNER, ACTIVE/CLOSED)  Tabs: Command · Plan · People · Timeline · More
                               ├─ project (PARTICIPANT, PENDING)  SCR-06 Waiting
                               └─ project (PARTICIPANT, APPROVED) Tabs: Home · Tasks · Inbox · Me
```

Owner mở Inbox (SCR-26) bằng biểu tượng chuông ở đầu mọi tab. Deep link: `weave://join?code=…` (SCR-03), `weave://p/{project_id}/…` cho các đích của push.

### 6.3. Danh sách màn hình

| ID | Tên | Vai trò | Nội dung chính | Hành động | FR |
|---|---|---|---|---|---|
| SCR-01 | Welcome | Tất cả | Tên app, một câu mô tả | `"Join an event"`, `"Organize an event"` | AUTH-01 |
| SCR-02 | My Events | Tất cả | Danh sách project theo vai trò, trạng thái, giờ | Mở project; `"Join another event"`; `"Create event"`; `"Sign out"` | AUTH-05, 06 |
| SCR-03 | Join — Code | Guest | Ô nhập 6 ký tự; nút quét QR | Nhập / quét → xem tên sự kiện và organizer | MEM-01, 02 |
| SCR-04 | Join — Consent | Guest | Nội dung FR-MEM-03, ô tick | `"I agree"` → tiếp | MEM-03 |
| SCR-05 | Join — Profile | Guest | Nickname, role tags, availability | `"Request to join"` | MEM-02 |
| SCR-06 | Waiting | Member PENDING | Tên sự kiện, `"Waiting for the organizer to approve you"` | `"Cancel request"`; tự chuyển khi được duyệt | MEM-04 |
| SCR-07 | Create Event | Owner | Form FR-EVT-01 | `"Create and plan"` | EVT-01 |
| SCR-08 | Plan Studio | Owner | Hai tab. **Chat**: hội thoại, câu hỏi của AI có nút trả lời nhanh, tóm tắt thay đổi từng lượt. **Draft**: danh sách Tasks / Resources / Areas / Roles, biểu tượng khóa trên mục đã sửa tay, đếm điểm hở | Gửi tin nhắn / trả lời; thêm, sửa, xóa mục; chọn trạng thái tài nguyên; `"Finalize plan"` | PLAN-01…05, 07 |
| SCR-09 | Draft Item Editor | Owner | Form task (mọi trường FR-TASK-01, criteria, depends on, needs) hoặc resource hoặc area | Lưu; xóa; bỏ khóa | PLAN-03, 04 |
| SCR-10 | Plan Review | Owner | Bản chốt: tổng số, dòng thời gian task theo giờ, danh sách điểm hở, giả định của AI | `"Back to editing"`; `"Publish plan"` | PLAN-05, 06 |
| SCR-11 | Command Center | Owner | Thanh trạng thái sự kiện; Attention Queue theo nhóm | Mở mục; `"New incident"`; kéo làm mới | FEED-01, 02 |
| SCR-12 | Task Board | Owner / Participant | Task nhóm theo trạng thái hoặc khu vực; lọc `"Mine"`, `"At risk"`, `"Unassigned"` | Mở task; owner: `"Add task"`, `"Suggest assignments"` | TASK-10 |
| SCR-13 | Task Detail | Owner / Participant | Mô tả, criteria và trạng thái, hạn, người làm, phụ thuộc (`"Waiting on"` / `"Blocks"`), tài nguyên cần, `risk` và lý do, lịch sử, submission | Owner: sửa, mời, hủy, hoãn, mở khóa, mở review. Người được giao: `"Accept"`, `"Decline"`, `"Start task"`, `"Submit"`, `"I can't do this"` | TASK-01…09 |
| SCR-14 | Assign | Owner | Mỗi task `OPEN`: người được gợi ý kèm lý do ngắn (`"check-in · free · at Gate B"`), đổi người được | `"Send N offers"` | TASK-03, 04 |
| SCR-15 | Resources & Areas | Owner / Participant (chỉ đọc + báo cáo) | Resource theo khu vực: `condition`, `inventory_state`, nhãn claim, người giữ, task đang cần | Owner: thêm, sửa. Mọi người: `"Report status"` | RES-01…06 |
| SCR-16 | People | Owner | Yêu cầu chờ duyệt; thành viên: role tags, presence, khu vực, số task; mã mời và QR | Duyệt / từ chối; loại; tạo lại / tắt mã; chia sẻ mã | MEM-01, 04, 06 |
| SCR-17 | Timeline | Owner / Participant | FR-FEED-04 | Lọc theo loại; mở đối tượng | FEED-04 |
| SCR-18 | Event Settings | Owner | Thông tin sự kiện; role tags; các cờ FR-SET-01 | Sửa; `"Close event"`; `"Delete event"` | EVT-04, 06; SET-01 |
| SCR-19 | Close & Report | Owner | Trước khi đóng: danh sách việc còn dở. Sau khi đóng: số liệu FR-CLOSE-02, tóm tắt AI | `"Close anyway"`; `"Settlement"` | CLOSE-01…03 |
| SCR-20 | Settlement | Owner | Sổ trợ cấp theo member, tổng | Đánh dấu `"Paid outside WEAVE"` / `"Void"`; `"Export CSV"` | CLOSE-04, 05 |
| SCR-21 | Submission Review | Owner | Ảnh (phóng to được), ghi chú, từng criterion kèm kết quả `"AI check"` và ô tick của owner | `"Approve"`; `"Request changes"`; tick `"Open an incident"` | EVD-05, 07, 08 |
| SCR-22 | Incident | Owner (đầy đủ) / Participant liên quan (rút gọn) | Decision card FR-REC-06; với `SUSPECTED`: observation gốc, lý do AI nghi ngờ, task có thể bị ảnh hưởng | `"Confirm"` / `"Dismiss"`; `"I know this"`; `"Ask someone"`; chọn option → `"Approve"` / `"Approve anyway"`; `"Reject"`; `"Handle manually"`; `"Re-check"`; `"Mark resolved"` | INC-03, 07, 08; PRB-05, 06; REC-06…11 |
| SCR-23 | Manual Decision | Owner | Trình dựng option: thêm tối đa 3 action, chọn tham số từ danh sách; kết quả kiểm tra từng điều kiện hiển thị ngay | `"Check"`; `"Apply"` | REC-09 |
| SCR-24 | New Incident | Owner | Loại, đối tượng liên quan, mô tả | `"Create"` | INC-02 |
| SCR-25 | Home | Participant | FR-FEED-03; nút `"I'm here"` nếu `NOT_ARRIVED` | Trả lời câu hỏi; nhận / từ chối; mở task; `"Report a problem"`; `"Add a note"` | FEED-03; MEM-05 |
| SCR-26 | Inbox | Owner / Participant | Thông báo, chưa đọc lên trước | Mở đích; đánh dấu đã đọc | NTF-04 |
| SCR-27 | Me | Participant | Nickname, role tags, availability, presence, khu vực hiện tại | Sửa; `"I'm unavailable"`; `"Leave event"` | MEM-05, 06 |
| SCR-28 | Composer | Owner / Participant | Ô chữ; tối đa 3 ảnh có xem trước; ngữ cảnh (task / resource / khu vực); trạng thái gửi | Chụp / chọn ảnh; `"Send"`; `"Retry"` | EVD-01…04 |
| SCR-29 | Report a Problem | Participant | Loại (kèm `"Not sure"` và `"Safety issue"`), đối tượng liên quan, mô tả, ảnh | `"Send report"` | INC-02, 09 |
| SCR-30 | Answer a Question | Participant | Câu hỏi, `"Why you"`, hạn đếm ngược, lựa chọn nhanh, ô chữ, ảnh | `"Send answer"`; `"Can't check"`; `"Decline"` | PRB-04 |
| SCR-31 | Resource Report | Owner / Participant | Resource, các lựa chọn FR-RES-03, ghi chú, ảnh | `"Send"` | RES-03 |
| SCR-32 | Offer | Participant | Task, criteria, hạn, trợ cấp (nếu có), hạn trả lời; với lời mời `recovery`: một dòng bối cảnh sự cố | `"Accept"`; `"Decline"` | TASK-05; REC-10 |
| SCR-33 | Evidence Detail | Theo quyền §3 | Một observation: ai, lúc nào, nội dung, ảnh, các claim rút ra và nhãn | Phóng ảnh; mở đối tượng liên quan | CLM-05 |

---

## 7. Mô hình dữ liệu

### 7.1. Quy ước

- Postgres (Supabase). Mọi bảng nghiệp vụ có `id uuid PK default gen_random_uuid()`, `project_id uuid NOT NULL → projects(id)`, `created_at timestamptz NOT NULL default now()` trừ khi ghi khác. Không lặp lại ba cột này bên dưới.
- Enum là Postgres `enum` hoặc `text` + `CHECK`; tên và giá trị PHẢI trùng với `packages/contracts`.
- Cột `version int NOT NULL default 1` dùng cho optimistic concurrency ở mức dòng: mọi `UPDATE` tăng `version`; API nhận `expected_version` và trả 409 `VERSION_CONFLICT` nếu lệch.
- Mọi khóa ngoại trỏ tới bảng có `project_id` PHẢI kèm `project_id` trong khóa (FK tổ hợp) hoặc có trigger kiểm tra, để không liên kết chéo project (INV-07).
- Thời gian lưu `timestamptz` (UTC).

### 7.2. Enum

```text
project_status        DRAFT | ACTIVE | CLOSED
member_role           OWNER | PARTICIPANT
member_status         PENDING | APPROVED | REJECTED | REMOVED | LEFT
member_presence       NOT_ARRIVED | ON_SITE | UNAVAILABLE
resource_kind         ITEM | SUPPLY
inventory_state       CONFIRMED | REPORTED | UNVERIFIED | TO_ACQUIRE
resource_condition    OK | FAILED | MISSING | LOW | UNKNOWN
task_status           OPEN | OFFERED | ACCEPTED | IN_PROGRESS | SUBMITTED | CHANGES_REQUESTED
                      | APPROVED | DEFERRED | CANCELLED
task_risk             NONE | AT_RISK | BLOCKED
task_origin           PLAN | MANUAL | RECOVERY
dependency_kind       HARD | SOFT
criterion_state       PENDING | MET | NOT_MET
assignment_status     OFFERED | ACCEPTED | DECLINED | EXPIRED | RELEASED | COMPLETED
observation_kind      TASK_SUBMISSION | PROGRESS_NOTE | INCIDENT_REPORT | RESOURCE_REPORT
                      | GENERAL_NOTE | PROBE_RESPONSE | RESOLUTION_CONFIRMATION
analysis_status       PENDING | DONE | FAILED | SKIPPED
media_status          PENDING | READY | DELETED
submission_status     AWAITING_REVIEW | CHANGES_REQUESTED | APPROVED | SUPERSEDED
assessment_verdict    SUPPORTED | INSUFFICIENT | CONFLICTED | NOT_ASSESSED
claim_subject         RESOURCE | MEMBER | TASK | AREA | PROJECT
claim_status          REPORTED | SUPPORTED | CONFLICTED | SUPERSEDED | STALE | CONFIRMED | REJECTED
claim_source          AI_EXTRACTED | STRUCTURED | OWNER
evidence_relation     SUPPORTS | CONTRADICTS
incident_type         MEMBER_UNAVAILABLE | RESOURCE_PROBLEM | TASK_DELAYED | HANDOFF_FAILED
                      | CONFLICTING_INFO | PLAN_CHANGE | OTHER
incident_origin       PARTICIPANT_REPORT | AI_INFERRED | ORGANIZER_CREATED | SYSTEM_RULE
incident_status       SUSPECTED | OPEN | RECOVERING | RESOLVED | DISMISSED
readiness             ASSESSING | NEEDS_VERIFICATION | READY_FOR_APPROVAL | NO_VALID_OPTION
                      | ESCALATE_TO_HUMAN
severity              LOW | MEDIUM | HIGH | CRITICAL
link_entity           TASK | RESOURCE | MEMBER | AREA | OBSERVATION | CLAIM_SLOT
link_role             TRIGGER | AFFECTED | CONTEXT | CANDIDATE | EVIDENCE
unknown_status        OPEN | ANSWERED | UNANSWERABLE | DROPPED
request_kind          FACT_CHECK | RESOURCE_CHECK | RESOLUTION_CHECK
request_status        PENDING | ANSWERED | CANNOT_CHECK | DECLINED | EXPIRED | CANCELLED
request_source        AI | TEMPLATE | OWNER
proposal_source       ENGINE | MANUAL
proposal_status       PENDING | APPROVED | REJECTED | STALE | SUPERSEDED
option_validity       VALID | PENDING_VERIFICATION | INVALID
condition_result      TRUE | FALSE | UNKNOWN
action_type           REASSIGN_TASK | SWAP_RESOURCE | RESCHEDULE_TASK | DEFER_TASK | ADD_TASK
action_status         PENDING | IN_PROGRESS | DONE | FAILED | CANCELLED
draft_status          EDITING | COMPOSING | PUBLISHED
ledger_status         PENDING | PAID_OUTSIDE | VOID
job_type              PLAN_COMPOSE | OBSERVATION_ANALYZE | INCIDENT_ASSESS | EVENT_SUMMARIZE
job_status            QUEUED | RUNNING | SUCCEEDED | FAILED | DISCARDED_STALE | DEAD
inference_outcome     OK | SCHEMA_INVALID | ID_NOT_ALLOWED | POLICY_REJECTED | TIMEOUT
                      | HTTP_ERROR | STALE_DISCARDED
actor_kind            MEMBER | SYSTEM | AI_WORKER
log_visibility        ALL | OWNER | INVOLVED
push_status           PENDING | SENT | FAILED | SKIPPED
suggestion_kind       ADD_RESOURCE | RESOLVE_INCIDENT
suggestion_status     PENDING | ACCEPTED | DISMISSED
```

### 7.3. Bảng

```text
projects                      (không có project_id)
  owner_user_id      uuid NOT NULL → auth.users
  title              text NOT NULL
  brief              text NOT NULL
  venue_name         text
  starts_at, ends_at timestamptz NOT NULL          CHECK ends_at > starts_at
  timezone           text NOT NULL                  IANA, ví dụ Asia/Ho_Chi_Minh
  expected_team_size int NOT NULL
  expected_attendees int
  currency           text NOT NULL default 'VND'
  status             project_status NOT NULL default 'DRAFT'
  state_version      bigint NOT NULL default 0
  role_tags          text[] NOT NULL default '{}'
  settings           jsonb NOT NULL                 các cờ FR-SET-01
  closed_at, deleted_at timestamptz

project_invites
  code               text NOT NULL                  UNIQUE WHERE disabled_at IS NULL
  expires_at         timestamptz NOT NULL
  disabled_at        timestamptz
  created_by         uuid → members

members
  user_id            uuid NOT NULL → auth.users     UNIQUE (project_id, user_id)
  role               member_role NOT NULL
  status             member_status NOT NULL
  nickname           text NOT NULL
  nickname_norm      text NOT NULL                  lower(trim(nickname)); UNIQUE (project_id, nickname_norm)
                                                    WHERE status IN ('PENDING','APPROVED')
  role_tags          text[] NOT NULL default '{}'
  availability       jsonb NOT NULL                 {"whole_event":true} | {"windows":[{"from":ts,"to":ts}]}
  presence           member_presence NOT NULL default 'NOT_ARRIVED'
  current_area_id    uuid → areas
  consent_at         timestamptz
  consent_version    text
  decided_by         uuid → members
  decided_at         timestamptz
  version            int

areas
  name               text NOT NULL
  name_norm          text NOT NULL                  UNIQUE (project_id, name_norm)
  notes              text

resources
  name               text NOT NULL
  category           text NOT NULL
  kind               resource_kind NOT NULL
  quantity           int                            chỉ với SUPPLY
  inventory_state    inventory_state NOT NULL
  condition          resource_condition NOT NULL default 'UNKNOWN'   hình chiếu của claim (FR-RES-03)
  area_id            uuid → areas                   hình chiếu của claim
  custodian_member_id uuid → members
  notes              text
  version            int

tasks
  title, description text
  area_id            uuid → areas
  role_tag           text
  role_required      bool NOT NULL default false
  start_at           timestamptz
  due_at             timestamptz NOT NULL
  hard_deadline      bool NOT NULL default false
  estimated_minutes  int NOT NULL
  critical           bool NOT NULL default false
  stipend_amount     bigint                         CHECK >= 0
  status             task_status NOT NULL default 'OPEN'
  risk               task_risk NOT NULL default 'NONE'
  risk_reasons       jsonb NOT NULL default '[]'    [{incident_id, cause, via_task_id}]
  origin             task_origin NOT NULL
  source_incident_id uuid → incidents               với origin = RECOVERY
  created_by         uuid → members
  version            int

task_criteria
  task_id            uuid NOT NULL → tasks
  position           int NOT NULL
  description        text NOT NULL
  critical           bool NOT NULL default true
  photo_expected     bool NOT NULL default false
  state              criterion_state NOT NULL default 'PENDING'    chỉ owner đổi
  decided_by         uuid → members
  decided_at         timestamptz

task_dependencies               PK (predecessor_id, successor_id)
  predecessor_id     uuid NOT NULL → tasks
  successor_id       uuid NOT NULL → tasks          CHECK predecessor_id <> successor_id
  kind               dependency_kind NOT NULL

task_resource_requirements
  task_id            uuid NOT NULL → tasks
  resource_id        uuid → resources
  category           text                           CHECK đúng một trong resource_id / category có giá trị
  hard               bool NOT NULL default true

assignments
  task_id            uuid NOT NULL → tasks
  member_id          uuid NOT NULL → members
  status             assignment_status NOT NULL
  respond_by         timestamptz NOT NULL
  responded_at       timestamptz
  decline_reason, release_reason text
  is_recovery        bool NOT NULL default false
  recovery_action_id uuid → recovery_actions
  version            int
  UNIQUE (task_id) WHERE status IN ('OFFERED','ACCEPTED')            -- FR-TASK-02

media_assets
  owner_member_id    uuid NOT NULL → members
  object_path        text NOT NULL                  {project_id}/{media_id}.{ext}
  mime               text NOT NULL
  bytes              int NOT NULL
  width, height      int
  status             media_status NOT NULL default 'PENDING'

observations                    bất biến: không UPDATE trừ analysis_status
  member_id          uuid NOT NULL → members        lấy từ phiên, không từ client
  kind               observation_kind NOT NULL
  text               text
  structured         jsonb                          dữ liệu từ form có cấu trúc (lựa chọn nhanh, báo cáo tài nguyên)
  task_id            uuid → tasks
  resource_id        uuid → resources
  area_id            uuid → areas
  incident_id        uuid → incidents
  request_id         uuid → information_requests
  submission_id      uuid → task_submissions        bằng chứng bổ sung cho một submission
  observed_at        timestamptz NOT NULL
  received_at        timestamptz NOT NULL default now()
  analysis_status    analysis_status NOT NULL default 'PENDING'

observation_media               PK (observation_id, media_id)
  position           int NOT NULL

task_submissions
  task_id            uuid NOT NULL → tasks
  assignment_id      uuid NOT NULL → assignments
  observation_id     uuid NOT NULL → observations
  status             submission_status NOT NULL default 'AWAITING_REVIEW'
  reviewed_by        uuid → members
  reviewed_at        timestamptz
  review_comment     text
  version            int

criterion_assessments           kết quả AI, chỉ để tham khảo
  submission_id      uuid NOT NULL → task_submissions
  criterion_id       uuid NOT NULL → task_criteria
  verdict            assessment_verdict NOT NULL
  explanation        text NOT NULL
  media_ids          uuid[] NOT NULL default '{}'
  job_id             uuid → analysis_jobs

claims
  subject_type       claim_subject NOT NULL
  subject_id         uuid                            null khi subject_type = PROJECT
  key                text NOT NULL                   một trong các khóa FR-CLM-01
  value              text NOT NULL
  statement          text NOT NULL                   câu tiếng Anh hiển thị cho người dùng
  status             claim_status NOT NULL
  source             claim_source NOT NULL
  author_member_id   uuid → members                  người đã báo (nguồn)
  has_photo          bool NOT NULL default false
  observed_at        timestamptz NOT NULL
  valid_until        timestamptz                     null = không hết hạn
  superseded_by      uuid → claims
  resolved_by        uuid → members
  resolved_at        timestamptz
  INDEX (project_id, subject_type, subject_id, key)

claim_evidence                  PK (claim_id, observation_id)
  relation           evidence_relation NOT NULL
  media_id           uuid → media_assets

incidents
  type               incident_type NOT NULL
  origin             incident_origin NOT NULL
  status             incident_status NOT NULL
  readiness          readiness                       null khi status không phải OPEN
  severity           severity NOT NULL default 'LOW'
  safety             bool NOT NULL default false
  title              text NOT NULL
  summary            text
  revision           int NOT NULL default 1
  primary_subject_type link_entity
  primary_subject_id uuid
  detected_at        timestamptz NOT NULL
  confirmed_by       uuid → members
  confirmed_at       timestamptz
  decided_at         timestamptz                     lần duyệt phương án đầu tiên (TTAR)
  resolved_at        timestamptz                     (TTVR)
  resolved_by        uuid → members
  resolution_observation_id uuid → observations
  resolution_note    text
  dismissed_reason   text
  ai_calls_used      int NOT NULL default 0
  probes_used        int NOT NULL default 0
  reassess_after     timestamptz                     lịch đánh giá lại (debounce)
  open_at_close      bool NOT NULL default false

incident_links
  incident_id        uuid NOT NULL → incidents
  entity_type        link_entity NOT NULL
  entity_id          uuid                            null khi entity_type = CLAIM_SLOT
  slot_key           text                            "{subject_type}:{subject_id}:{key}" khi là CLAIM_SLOT
  role               link_role NOT NULL
  payload            jsonb NOT NULL default '{}'     ví dụ {"excluded": true} cho ứng viên đã từ chối
  UNIQUE (incident_id, entity_type, entity_id, slot_key, role)

incident_unknowns
  incident_id        uuid NOT NULL → incidents
  subject_type       claim_subject NOT NULL
  subject_id         uuid
  key                text NOT NULL
  label              text NOT NULL                   mô tả ngắn cho UI: "Is the Spare scanner working?"
  source             text NOT NULL                   PRECONDITION | AI
  status             unknown_status NOT NULL default 'OPEN'
  resolved_claim_id  uuid → claims

information_requests
  kind               request_kind NOT NULL
  incident_id        uuid → incidents
  unknown_id         uuid → incident_unknowns
  resource_id        uuid → resources                 với RESOURCE_CHECK
  target_member_id   uuid NOT NULL → members
  question           text NOT NULL
  why_you            text
  quick_replies      jsonb NOT NULL default '[]'      [{label, claim_value}]
  allow_photo        bool NOT NULL default true
  source             request_source NOT NULL
  status             request_status NOT NULL default 'PENDING'
  expires_at         timestamptz NOT NULL
  responded_at       timestamptz
  response_observation_id uuid → observations
  version            int
  UNIQUE (target_member_id) WHERE status = 'PENDING'  -- theo project; POL.MAX_PENDING_PROBES_PER_MEMBER = 1

decision_proposals
  incident_id        uuid NOT NULL → incidents
  incident_revision  int NOT NULL
  source             proposal_source NOT NULL
  status             proposal_status NOT NULL default 'PENDING'
  summary            text
  options            jsonb NOT NULL                   ProposalOption[] (§9.4)
  recommended_option_id text
  what_changed       text
  selected_option_id text
  decided_by         uuid → members
  decided_at         timestamptz
  override           bool NOT NULL default false
  override_reason    text
  decision_comment   text
  job_id             uuid → analysis_jobs
  UNIQUE (incident_id) WHERE status = 'PENDING'

recovery_actions
  incident_id        uuid NOT NULL → incidents
  proposal_id        uuid NOT NULL → decision_proposals
  option_id          text NOT NULL
  position           int NOT NULL
  action_type        action_type NOT NULL
  params             jsonb NOT NULL
  status             action_status NOT NULL default 'PENDING'
  assignment_id      uuid → assignments
  created_task_id    uuid → tasks
  failed_reason      text
  completed_at       timestamptz

plan_drafts                     UNIQUE (project_id)
  revision           int NOT NULL default 1
  draft              jsonb NOT NULL                   PlanDraft (§9.4)
  status             draft_status NOT NULL default 'EDITING'
  ai_turns_used      int NOT NULL default 0
  last_error         text

plan_messages
  draft_id           uuid NOT NULL → plan_drafts
  role               text NOT NULL                    ORGANIZER | AI | SYSTEM
  text               text NOT NULL
  payload            jsonb                            câu trả lời / câu hỏi / tóm tắt thay đổi

ai_suggestions
  kind               suggestion_kind NOT NULL
  payload            jsonb NOT NULL
  source_observation_id uuid → observations
  incident_id        uuid → incidents
  status             suggestion_status NOT NULL default 'PENDING'
  decided_by         uuid → members

payout_ledger
  member_id          uuid NOT NULL → members
  task_id            uuid NOT NULL → tasks             UNIQUE (task_id)
  amount             bigint NOT NULL
  currency           text NOT NULL
  status             ledger_status NOT NULL default 'PENDING'
  status_reason      text
  reviewed_by        uuid → members
  updated_at         timestamptz

event_log                       id bigserial PK; chỉ INSERT
  state_version      bigint NOT NULL
  event_type         text NOT NULL                    danh sách ở §9.7
  actor_kind         actor_kind NOT NULL
  actor_member_id    uuid → members
  entity_type        text
  entity_id          uuid
  payload            jsonb NOT NULL default '{}'
  visibility         log_visibility NOT NULL
  involved_member_ids uuid[] NOT NULL default '{}'

analysis_jobs
  type               job_type NOT NULL
  status             job_status NOT NULL default 'QUEUED'
  subject_id         uuid NOT NULL                    observation / incident / plan_draft / project
  basis_revision     int                              revision của incident hoặc plan_draft lúc tạo job
  attempts           int NOT NULL default 0
  error_code         text
  queued_at, started_at, finished_at timestamptz
  UNIQUE (type, subject_id, basis_revision) WHERE status IN ('QUEUED','RUNNING')

ai_inference_logs
  job_id             uuid NOT NULL → analysis_jobs
  module             text NOT NULL
  model              text NOT NULL
  prompt_version     text NOT NULL
  attempt            int NOT NULL
  input_tokens, output_tokens int
  latency_ms         int NOT NULL
  outcome            inference_outcome NOT NULL
  validation_errors  jsonb
  injection_suspected bool NOT NULL default false
  estimated_cost_usd numeric

notifications
  member_id          uuid NOT NULL → members           người nhận
  type               text NOT NULL
  title              text NOT NULL
  body               text
  target             jsonb NOT NULL                    {screen, ids}
  read_at            timestamptz
  push_status        push_status NOT NULL default 'PENDING'

idempotency_keys                (không có project_id) PK (user_id, key)
  user_id            uuid NOT NULL
  key                uuid NOT NULL
  operation          text NOT NULL                     "METHOD path-template"
  request_hash       text NOT NULL
  response_status    int NOT NULL
  response_body      jsonb NOT NULL

push_tokens                     (không có project_id) PK (token)
  user_id            uuid NOT NULL
  token              text NOT NULL
  platform           text NOT NULL                     'android'
  updated_at         timestamptz NOT NULL
```

### 7.4. Bất biến dữ liệu (ép ở DB hoặc trong RPC cùng transaction)

| ID | Bất biến |
|---|---|
| DB-01 | `task_dependencies` không tạo chu trình. Kiểm tra trong RPC trước khi commit; chèn cạnh tạo chu trình trả `DEPENDENCY_CYCLE`. |
| DB-02 | Mỗi task có tối đa một assignment `OFFERED`/`ACCEPTED` (unique index). |
| DB-03 | `assignments.member_id` và `information_requests.target_member_id` PHẢI là member `APPROVED` cùng project tại thời điểm tạo. |
| DB-04 | `tasks.status = 'APPROVED'` chỉ đặt được trong RPC `review_submission` gọi bởi OWNER. |
| DB-05 | `payout_ledger` chỉ được chèn trong `review_submission`; một task một dòng. |
| DB-06 | `event_log`, `observations`, `claim_evidence`, `plan_messages`, `ai_inference_logs` không có quyền `UPDATE`/`DELETE` cho bất kỳ role ứng dụng nào (trừ `observations.analysis_status` qua RPC của worker và quy trình xóa project). |
| DB-07 | Mỗi incident tối đa một proposal `PENDING` (unique index). |
| DB-08 | Tăng `incidents.revision` và chuyển proposal `PENDING` sang `STALE` xảy ra trong cùng một transaction với thay đổi gây ra nó (hàm `touch_incidents`, §11.7). |
| DB-09 | Mọi RPC ghi dữ liệu tăng `projects.state_version` và chèn `event_log` trong cùng transaction. |
| DB-10 | Project `CLOSED` từ chối mọi RPC ghi trừ cập nhật `payout_ledger.status`. |
| DB-11 | Tham chiếu chéo project bị từ chối ở mức DB (FK tổ hợp hoặc trigger). |

---

## 8. Máy trạng thái

Chuyển trạng thái không có trong bảng là không hợp lệ và trả 409 `INVALID_TRANSITION`. "Hệ thống" nghĩa là luật hoặc job nền; "worker" là `ai-worker`.

### 8.1. Member

| Từ | Tới | Ai | Điều kiện |
|---|---|---|---|
| — | `PENDING` | Guest | Mã mời hợp lệ, đã đồng ý |
| — | `APPROVED` | Hệ thống | Người tạo project (role `OWNER`); hoặc `auto_approve_members` bật |
| `PENDING` | `APPROVED` / `REJECTED` | Owner | — |
| `PENDING` | `LEFT` | Chính member | Hủy yêu cầu |
| `APPROVED` | `REMOVED` | Owner | Không áp dụng cho `OWNER` |
| `APPROVED` | `LEFT` | Chính member | Không áp dụng cho `OWNER` |

`REJECTED`, `REMOVED`, `LEFT` là kết thúc. Người đã `LEFT` hoặc `REJECTED` gửi được yêu cầu mới (tạo lại dòng về `PENDING`); người `REMOVED` thì không.

### 8.2. Task

| Từ | Tới | Tác nhân | Điều kiện / hệ quả |
|---|---|---|---|
| — | `OPEN` | Owner (xuất bản, thêm tay) / hệ thống (`ADD_TASK`) | — |
| `OPEN` | `OFFERED` | Owner / hệ thống (action) | Tạo assignment `OFFERED` |
| `OFFERED` | `ACCEPTED` | Người được mời | Assignment → `ACCEPTED` |
| `OFFERED` | `OPEN` | Người được mời / hệ thống | Assignment → `DECLINED` / `EXPIRED`; chạy R1 |
| `ACCEPTED` | `IN_PROGRESS` | Người được giao | FR-TASK-06 |
| `ACCEPTED`, `IN_PROGRESS`, `CHANGES_REQUESTED` | `SUBMITTED` | Người được giao | Tạo submission |
| `SUBMITTED` | `APPROVED` | Owner | Mọi criterion `critical` đã tick đạt; assignment → `COMPLETED`; ghi sổ |
| `SUBMITTED` | `CHANGES_REQUESTED` | Owner | Bắt buộc có lý do |
| `ACCEPTED`, `IN_PROGRESS`, `CHANGES_REQUESTED`, `SUBMITTED` | `OPEN` | Người được giao (trả lại) / owner (thu hồi) / hệ thống (`REASSIGN_TASK`, member rời) | Assignment → `RELEASED`; submission đang chờ → `SUPERSEDED` |
| Bất kỳ trừ `APPROVED`, `CANCELLED` | `DEFERRED` | Owner / hệ thống (`DEFER_TASK`) | Assignment đang hoạt động → `RELEASED` |
| `DEFERRED` | `OPEN` | Owner | — |
| Bất kỳ trừ `APPROVED` | `CANCELLED` | Owner | Assignment đang hoạt động → `RELEASED` |

`APPROVED` và `CANCELLED` là kết thúc.

### 8.3. Submission

| Từ | Tới | Tác nhân |
|---|---|---|
| — | `AWAITING_REVIEW` | Người được giao nộp |
| `AWAITING_REVIEW` | `APPROVED` / `CHANGES_REQUESTED` | Owner |
| `AWAITING_REVIEW` | `SUPERSEDED` | Hệ thống, khi task rời `SUBMITTED` mà không qua review |

Nộp lại sau `CHANGES_REQUESTED` tạo submission mới; bản cũ giữ nguyên.

### 8.4. Incident

| Từ | Tới | Tác nhân | Điều kiện / hệ quả |
|---|---|---|---|
| — | `SUSPECTED` | Worker | `origin = AI_INFERRED` |
| — | `OPEN` | Participant / owner / hệ thống | Đặt `readiness = ASSESSING`, tính ảnh hưởng, xếp job `INCIDENT_ASSESS` |
| `SUSPECTED` | `OPEN` | Owner (`Confirm`) | Như trên |
| `SUSPECTED`, `OPEN` | `DISMISSED` | Owner | Hủy probe đang chờ; proposal `PENDING` → `SUPERSEDED`; tính lại `risk` |
| `OPEN` | `RECOVERING` | Owner (duyệt / quyết định tay) | `decided_at` đặt nếu còn null; `readiness = null` |
| `RECOVERING` | `OPEN` | Hệ thống | Một action `FAILED`; action còn lại chưa xong → `CANCELLED`; đánh giá lại |
| `OPEN`, `RECOVERING` | `RESOLVED` | Owner | FR-INC-08; hủy probe đang chờ; tính lại `risk` |

`RESOLVED` và `DISMISSED` là kết thúc. Sự cố tái diễn là incident mới.

### 8.5. Information request

| Từ | Tới | Tác nhân |
|---|---|---|
| — | `PENDING` | Worker / hệ thống (mẫu) / owner |
| `PENDING` | `ANSWERED` / `CANNOT_CHECK` / `DECLINED` | Người nhận |
| `PENDING` | `EXPIRED` | Hệ thống, khi `now > expires_at` |
| `PENDING` | `CANCELLED` | Owner; hoặc hệ thống khi unknown đã được lấp, incident đóng, member rời, project đóng |

### 8.6. Proposal

| Từ | Tới | Tác nhân |
|---|---|---|
| — | `PENDING` | Worker (`source = ENGINE`) |
| — | `APPROVED` | Owner qua quyết định tay (`source = MANUAL`) |
| `PENDING` | `APPROVED` / `REJECTED` | Owner |
| `PENDING` | `STALE` | Hệ thống, khi revision của incident tăng hoặc kiểm tra lại lúc duyệt thất bại |
| `PENDING` | `SUPERSEDED` | Hệ thống, khi có proposal mới cho cùng revision, hoặc incident đóng |

### 8.7. Recovery action

| Từ | Tới | Tác nhân / điều kiện |
|---|---|---|
| — | `PENDING` | Tạo khi proposal được duyệt |
| `PENDING` | `IN_PROGRESS` | Người được mời nhận lời (với action còn việc phải làm sau khi nhận: người mang tài nguyên, `ADD_TASK`) |
| `PENDING` | `DONE` | Action không cần người (`RESCHEDULE_TASK`, `DEFER_TASK`, `SWAP_RESOURCE` không có người mang): hoàn tất ngay trong transaction duyệt. `REASSIGN_TASK`: khi người mới nhận lời |
| `IN_PROGRESS` | `DONE` | Theo cột "`DONE` khi" ở §11.6 |
| `PENDING`, `IN_PROGRESS` | `FAILED` | Từ chối, hết hạn trả lời, trả lại việc |
| `PENDING`, `IN_PROGRESS` | `CANCELLED` | Incident đóng hoặc quay về `OPEN` |

### 8.8. Analysis job

`QUEUED` → `RUNNING` → `SUCCEEDED` | `DISCARDED_STALE` | `FAILED` (còn lượt: quay lại `QUEUED` sau backoff; hết `POL.JOB_MAX_ATTEMPTS`: `DEAD`). Job `DEAD` kích hoạt đường thủ công tương ứng (INV-08).

---

## 9. API

### 9.1. Quy ước

- Toàn bộ API là một Edge Function `api` (Hono), đường dẫn gốc `/functions/v1/api`, mọi route dưới `/v1`.
- **Mobile chỉ nói chuyện với `api`.** Mobile KHÔNG ĐƯỢC gọi PostgREST / bảng trực tiếp. Ngoại lệ duy nhất: đăng ký kênh Realtime và tải ảnh lên Storage bằng URL ký sẵn.
- `api` chạy truy vấn với JWT của người dùng, nên RLS (§12) vẫn có hiệu lực như lớp phòng thủ thứ hai. Mọi thao tác ghi đi qua hàm RPC Postgres chạy trong một transaction.
- Header: `Authorization: Bearer <jwt>` cho mọi route. `X-Idempotency-Key: <uuid v4>` **bắt buộc** cho mọi `POST`/`PATCH`/`DELETE`; không đặt idempotency key trong body.
- Idempotency: cùng `(user, key)` và cùng nội dung → trả lại đúng phản hồi đã lưu. Cùng key khác nội dung → 422 `IDEMPOTENCY_KEY_REUSED`. Lưu 24 giờ.
- Optimistic concurrency: body mang `expected_version` (của dòng) hoặc `expected_revision` (plan draft, incident) khi bảng ở §9.3 ghi `ver`.
- JSON dùng `snake_case`. Thời gian là ISO-8601 UTC. ID là UUID.
- Phản hồi thành công: `{ "data": …, "meta": { "state_version": <int> } }`. Lỗi: `{ "error": { "code": "…", "message": "…", "details": {…} } }`. `message` là câu tiếng Anh hiển thị được cho người dùng.
- Schema request/response của mọi route được định nghĩa bằng Zod trong `packages/contracts` và dùng chung cho `api` và mobile. Không định nghĩa kiểu trùng lặp ở hai phía.

### 9.2. Mã lỗi

| HTTP | `code` | Khi nào |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Thiếu hoặc sai JWT |
| 403 | `FORBIDDEN` | Không đủ quyền theo §3 |
| 404 | `NOT_FOUND` | Không tồn tại **hoặc** không thuộc project mà người gọi là thành viên (không phân biệt, để không lộ sự tồn tại) |
| 409 | `VERSION_CONFLICT` | `expected_version` / `expected_revision` lệch; `details.current` chứa bản hiện tại |
| 409 | `INVALID_TRANSITION` | Chuyển trạng thái không có ở §8 |
| 409 | `PROPOSAL_STALE` | Proposal không còn `PENDING`, hoặc kiểm tra lại lúc duyệt không đạt; `details.failed_checks` |
| 409 | `PROJECT_CLOSED` | Ghi vào project `CLOSED` |
| 409 | `ALREADY_ASSIGNED` | Task đã có assignment đang hoạt động |
| 422 | `VALIDATION_FAILED` | Sai schema; `details.issues` theo Zod |
| 422 | `CONSTRAINT_VIOLATION` | Vi phạm luật nghiệp vụ; `details.checks` liệt kê điều kiện `FALSE` |
| 422 | `DEPENDENCY_CYCLE` | Dependency tạo chu trình |
| 422 | `LIMIT_EXCEEDED` | Vượt giới hạn `POL.*` |
| 422 | `INVITE_INVALID` | Mã mời sai, hết hạn hoặc đã tắt |
| 422 | `IDEMPOTENCY_KEY_REUSED` | Xem §9.1 |
| 429 | `RATE_LIMITED` | Vượt giới hạn tần suất |
| 500 | `INTERNAL` | Lỗi không lường trước; không lộ chi tiết nội bộ |

### 9.3. Danh sách endpoint

`O` = owner · `P` = participant đã duyệt · `M` = mọi member đã duyệt · `U` = mọi user đã đăng nhập. `ver` = yêu cầu `expected_version`/`expected_revision`.

| # | Method + path | Ai | Body chính | Kết quả / ghi chú |
|---|---|---|---|---|
| 1 | `GET /v1/me` | U | — | User, danh sách membership kèm tóm tắt project |
| 2 | `PUT /v1/me/push-token` | U | `token`, `platform` | — |
| 3 | `POST /v1/projects` | U (Google) | Trường FR-EVT-01 | Project `DRAFT` + member `OWNER` + plan draft trống |
| 4 | `GET /v1/projects/{pid}/snapshot` | M | — | `Snapshot` (§9.4), lọc theo vai trò |
| 5 | `PATCH /v1/projects/{pid}` | O | Trường sửa được, `settings`, `role_tags` | FR-EVT-04, FR-SET-01 |
| 6 | `POST /v1/projects/{pid}/close` | O | `confirm_open_items: bool` | FR-CLOSE-01; xếp job `EVENT_SUMMARIZE` |
| 7 | `DELETE /v1/projects/{pid}` | O | `confirm_title` | FR-EVT-06 |
| 8 | `POST /v1/projects/{pid}/invites` | O | `action: CREATE / DISABLE` | Mã + deep link |
| 9 | `POST /v1/invites/resolve` | U | `code` | Tên project, nickname organizer, `consent_version`, `role_tags` |
| 10 | `POST /v1/invites/join` | U | `code`, `nickname`, `role_tags`, `availability`, `consent_version` | Member `PENDING` (hoặc `APPROVED` nếu tự duyệt) |
| 11 | `POST /v1/members/{mid}/decision` | O | `decision: APPROVE / REJECT`, ver | — |
| 12 | `PATCH /v1/members/{mid}` | chính mình / O | Trường FR-MEM-05; O chỉ sửa `role_tags` | Tạo claim khi đổi `presence` / `current_area_id` |
| 13 | `POST /v1/members/{mid}/remove` | O | `reason?` | FR-MEM-06 |
| 14 | `POST /v1/projects/{pid}/leave` | P / pending | — | FR-MEM-06 |
| 15 | `GET /v1/projects/{pid}/plan` | O | — | `PlanDraft`, `revision`, `status`, hội thoại, `ai_turns_used` |
| 16 | `POST /v1/projects/{pid}/plan/compose` | O | `mode: DRAFT / REVISE / FINALIZE`, `message?`, `answers?: [{question_id, text}]`, ver | 202; draft → `COMPOSING`; job `PLAN_COMPOSE` |
| 17 | `PATCH /v1/projects/{pid}/plan` | O | `ops: [{op: UPSERT / DELETE / UNLOCK, collection, key, value?}]`, ver | Draft mới; mục bị chạm được `locked`. Từ chối khi `COMPOSING` |
| 18 | `POST /v1/projects/{pid}/plan/publish` | O | ver | FR-PLAN-06 |
| 19 | `POST /v1/projects/{pid}/tasks` | O | Trường FR-TASK-01 | Task `OPEN`, `origin = MANUAL` |
| 20 | `PATCH /v1/tasks/{tid}` | O | Trường sửa được, `criteria[]`, `depends_on[]`, `needs[]`, ver | Kiểm tra chu trình |
| 21 | `POST /v1/tasks/{tid}/status` | O | `action: CANCEL / DEFER / REOPEN / UNLOCK / REVOKE`, `reason?`, ver | §8.2 |
| 22 | `GET /v1/projects/{pid}/assignment-suggestions` | O | — | Mỗi task `OPEN`: tối đa 3 member kèm điểm và lý do (§11.3) |
| 23 | `POST /v1/projects/{pid}/offers` | O | `offers: [{task_id, member_id, respond_by?}]` | Kết quả từng mục (thành công / mã lỗi) |
| 24 | `POST /v1/assignments/{aid}/respond` | người được mời | `response: ACCEPT / DECLINE`, `reason?`, ver | FR-TASK-05 |
| 25 | `POST /v1/assignments/{aid}/release` | người được giao | `reason`, ver | FR-TASK-07 |
| 26 | `POST /v1/tasks/{tid}/start` | người được giao | ver | FR-TASK-06 |
| 27 | `POST /v1/projects/{pid}/areas` · `PATCH /v1/areas/{id}` · `DELETE /v1/areas/{id}` | O | `name`, `notes` | FR-RES-06 |
| 28 | `POST /v1/projects/{pid}/resources` · `PATCH /v1/resources/{rid}` | O | Trường FR-RES-01 trừ `condition`, `area_id` sau khi tạo | Đổi `condition`/vị trí đi qua observation |
| 29 | `POST /v1/media/upload-intent` | M | `project_id`, `mime`, `bytes` | `media_id`, `upload_url`, `expires_at` |
| 30 | `POST /v1/media/{id}/complete` | người tải | `width`, `height` | Server kiểm tra object tồn tại, đúng kích thước → `READY` |
| 31 | `GET /v1/media/{id}/url` | theo quyền §3 | — | URL đọc ký ngắn hạn |
| 32 | `POST /v1/projects/{pid}/observations` | M | `kind` (trừ ba loại do luồng khác tạo), `text?`, `media_ids?`, `structured?`, `task_id?`, `resource_id?`, `area_id?`, `incident_id?`, `observed_at`; với `INCIDENT_REPORT`: `incident_type?`, `safety?`, `subject?` | Observation; job `OBSERVATION_ANALYZE`; incident nếu là báo sự cố |
| 33 | `POST /v1/tasks/{tid}/submissions` | người được giao | `text?`, `media_ids?`, `observed_at` | Submission + observation; task `SUBMITTED` |
| 34 | `POST /v1/submissions/{sid}/evidence` | người nộp | `text?`, `media_ids?`, `observed_at` | Observation bổ sung; chỉ khi `AWAITING_REVIEW` |
| 35 | `GET /v1/submissions/{sid}` | O / người nộp | — | Submission, observation, ảnh, `criterion_assessments` |
| 36 | `POST /v1/submissions/{sid}/review` | O | `decision: APPROVE / REQUEST_CHANGES`, `criteria: [{criterion_id, met}]`, `comment?`, `open_incident?`, ver | FR-EVD-07 |
| 37 | `POST /v1/claims/{cid}/resolve` | O | `resolution: CONFIRM / REJECT`, `comment?` | FR-CLM-04 |
| 38 | `POST /v1/projects/{pid}/incidents` | O | `type`, `title`, `description?`, `subject?`, `affected_task_ids?`, `blocking?` | Incident `OPEN` |
| 39 | `GET /v1/incidents/{iid}` | O đầy đủ / P liên quan rút gọn | — | Incident, links, unknowns, requests, proposal hiện tại, actions, observation liên quan |
| 40 | `POST /v1/incidents/{iid}/status` | O | `action: CONFIRM / DISMISS / RESOLVE / REASSESS`, `reason?`, `evidence_observation_id?`, `without_evidence?`, ver | §8.4. `REASSESS` xếp lại job đánh giá |
| 41 | `PATCH /v1/incidents/{iid}` | O | `type?`, `title?`, `affected_task_ids?`, ver | Sửa phân loại |
| 42 | `POST /v1/incidents/{iid}/requests` | O | `target_member_id`, `question`, `unknown_id?`, `allow_photo?` | Probe thủ công (FR-PRB-06) |
| 43 | `POST /v1/incidents/{iid}/unknowns/{uid}/answer` | O | `text?`, `choice?`, `media_ids?` | FR-PRB-05 |
| 44 | `POST /v1/requests/{rid}/respond` | người nhận | `answer_type: RESPOND / CANNOT_CHECK / DECLINE`, `choice?`, `text?`, `media_ids?`, ver | FR-PRB-04 |
| 45 | `POST /v1/requests/{rid}/cancel` | O | ver | — |
| 46 | `POST /v1/proposals/{id}/decide` | O | `decision: APPROVE / REJECT`, `option_id?`, `override_reason?`, `comment?`, `expected_incident_revision` | FR-REC-07, 08 |
| 47 | `POST /v1/incidents/{iid}/manual-decision` | O | `actions: Action[]`, `dry_run: bool`, `comment?`, `expected_incident_revision` | `dry_run` chỉ trả `checks`; ngược lại áp dụng (FR-REC-09) |
| 48 | `POST /v1/suggestions/{id}/decision` | O | `decision: ACCEPT / DISMISS` | FR-RES-05; gợi ý đóng incident |
| 49 | `GET /v1/projects/{pid}/timeline?cursor=&types=` | M | — | Trang `event_log` đã lọc quyền |
| 50 | `GET /v1/me/inbox?project_id=&cursor=` · `POST /v1/me/inbox/read` | U | `ids[]` hoặc `all` | FR-NTF-04 |
| 51 | `GET /v1/projects/{pid}/report` | O | — | Số liệu FR-CLOSE-02 + tóm tắt AI nếu có |
| 52 | `GET /v1/projects/{pid}/settlement` · `GET …/settlement.csv` | O | — | Sổ / file CSV |
| 53 | `PATCH /v1/ledger/{id}` | O | `status`, `status_reason?` | Cho phép cả khi `CLOSED` |

### 9.4. Kiểu dữ liệu chính

Định nghĩa chuẩn nằm ở `packages/contracts` dưới dạng Zod; phần dưới là hình dạng tham chiếu.

```ts
// ---------- Plan draft ----------
type DraftMeta = { key: string; origin: 'AI' | 'HUMAN'; locked: boolean };

type PlanDraft = {
  areas: (DraftMeta & { name: string; notes: string | null })[];
  role_tags: string[];
  tasks: (DraftMeta & {
    title: string; description: string;
    area_key: string | null;
    role_tag: string | null; role_required: boolean;
    start_offset_min: number | null;   // phút so với starts_at; âm = trước giờ bắt đầu
    due_offset_min: number;
    hard_deadline: boolean; estimated_minutes: number; critical: boolean;
    stipend_amount: number | null;     // chỉ người nhập; AI không đặt
    criteria: { description: string; critical: boolean; photo_expected: boolean }[];
    depends_on: { task_key: string; kind: 'HARD' | 'SOFT' }[];
    needs: { resource_key: string | null; category: string | null; hard: boolean }[];
  })[];
  resources: (DraftMeta & {
    name: string; category: string; kind: 'ITEM' | 'SUPPLY'; quantity: number | null;
    inventory_state: 'CONFIRMED' | 'REPORTED' | 'UNVERIFIED' | 'TO_ACQUIRE';  // chỉ người đặt
    area_key: string | null;           // vị trí đề xuất / đã xác nhận
    custodian_member_id: string | null;
    reason: string;                    // vì sao cần (AI viết hoặc người nhập)
  })[];
  questions: { id: string; text: string; why: string; suggested_answers: string[];
               about_keys: string[]; status: 'OPEN' | 'ANSWERED' | 'SKIPPED'; answer: string | null }[];
  assumptions: string[];
  gaps: { kind: 'UNVERIFIED_RESOURCE' | 'NO_CHECKABLE_CRITERION' | 'RESOURCE_CONTENTION'
                | 'NO_AREA' | 'CRITICAL_WITHOUT_ROLE';
          keys: string[]; message: string }[];   // do code tính, không do AI
};

// ---------- Recovery ----------
type Action =
  | { type: 'REASSIGN_TASK'; task_id: string; to_member_id: string }
  | { type: 'SWAP_RESOURCE'; for_task_id: string | null; for_area_id: string | null;
      from_resource_id: string | null; to_resource_id: string; carrier_member_id: string | null }
  | { type: 'RESCHEDULE_TASK'; task_id: string; new_start_at: string | null; new_due_at: string }
  | { type: 'DEFER_TASK'; task_id: string }
  | { type: 'ADD_TASK'; title: string; description: string; criteria: string[];
      area_id: string | null; due_at: string; assignee_member_id: string };

type ConditionCheck = {
  action_index: number | null;         // null = điều kiện mức option
  code: string;                        // mã ở §11.5
  result: 'TRUE' | 'FALSE' | 'UNKNOWN';
  message: string;                     // câu tiếng Anh do code dựng từ mẫu
  claim_ids: string[];                 // căn cứ
  unknown_id: string | null;           // nếu UNKNOWN
};

type ProposalOption = {
  id: string;                          // ổn định trong một proposal
  source: 'CODE' | 'AI' | 'MANUAL';
  actions: Action[];
  description: string;                 // code dựng từ mẫu câu theo action
  validity: 'VALID' | 'PENDING_VERIFICATION';   // server ghi; INVALID không lưu vào proposal
  checks: ConditionCheck[];
  effects: { unblocks_task_ids: string[]; adds_risk_task_ids: string[];
             moves_member_ids: string[]; moves_resource_ids: string[] };   // code tính
  rank: number | null; recommended: boolean;     // từ AI, đã kiểm tra
  tradeoffs: string[]; assumptions: string[]; evidence_claim_ids: string[];  // từ AI
};

// ---------- Snapshot ----------
type Snapshot = {
  project: ProjectView;                // gồm state_version, status, settings (settings chỉ cho owner)
  me: MemberSelf;
  members: MemberPublic[];             // nickname, role, role_tags, presence, current_area_id
  areas: Area[];
  resources: ResourceView[];           // kèm nhãn claim của condition và location
  tasks: TaskView[];                   // kèm criteria, depends_on, needs, assignee, risk, stipend_amount
  my_assignments: Assignment[];
  my_requests: InformationRequest[];   // probe gửi cho mình, đang PENDING
  my_submissions: SubmissionSummary[];
  incidents: IncidentSummary[];        // theo quyền §3
  invite: Invite | null;               // owner
  pending_members: MemberPending[];    // owner
  attention: AttentionItem[];          // owner (FR-FEED-01)
  counters: { tasks_by_status: Record<string, number>; blocked: number; at_risk: number;
              open_incidents: number; on_site: number; members: number; unread: number };
};
```

Chi tiết nặng (submission, incident, timeline, ảnh) lấy qua endpoint riêng, không nằm trong snapshot.

### 9.5. Realtime

| Kênh (private Broadcast) | Ai được nghe | Payload |
|---|---|---|
| `project:{project_id}` | Member `APPROVED` của project | `{project_id, state_version, event_type}` |
| `user:{user_id}` | Chính user đó | `{type: 'MEMBERSHIP_CHANGED' / 'INBOX', project_id}` |

Quyền nghe kênh do RLS trên `realtime.messages` quyết định. Client dùng tín hiệu chỉ để refetch (FR-NTF-01).

### 9.6. Job nền

1. **Ghi job cùng transaction.** RPC tạo observation / mở incident / tăng revision / gửi `plan/compose` / đóng project chèn `analysis_jobs` và gửi message `pgmq` trong cùng transaction với thay đổi dữ liệu.
2. **Kích ngay, không dựa vào đó.** Sau khi trả phản hồi, `api` gọi `ai-worker` kiểu best-effort. Mất lần gọi này không mất job.
3. **Sweeper.** Supabase Cron mỗi phút gọi `ai-worker` ở chế độ quét, làm lần lượt: nhận các message `pgmq` đến hạn; xếp job đánh giá cho incident có `reassess_after <= now`; hết hạn lời mời (`respond_by`) và probe (`expires_at`); chạy luật R3; đánh dấu claim quá TTL thành `STALE`; gửi lại push `PENDING`/`FAILED` (tối đa 3 lần).
4. **Khử trùng lặp.** Unique index trên `analysis_jobs (type, subject_id, basis_revision)` cho job đang `QUEUED`/`RUNNING`.
5. **Giao ít nhất một lần.** Worker PHẢI idempotent: commit kết quả kiểm tra `job.status = RUNNING` và revision; chạy lại một job đã `SUCCEEDED` không ghi gì thêm.
6. **Thử lại.** Lỗi mạng, 429, 5xx, timeout: backoff 2 giây rồi 8 giây. Lỗi schema / ID không hợp lệ: thử lại một lần. Tối đa `POL.JOB_MAX_ATTEMPTS`; sau đó `DEAD` và chạy đường thủ công của module (§10.9).
7. `ai-worker` chỉ nhận lời gọi mang secret nội bộ; không nhận JWT người dùng; dùng service role.

### 9.7. Loại sự kiện trong `event_log`

Tên dạng `ENTITY_VERB`, ví dụ: `PROJECT_CREATED`, `PLAN_PUBLISHED`, `MEMBER_JOIN_REQUESTED`, `MEMBER_APPROVED`, `MEMBER_REMOVED`, `MEMBER_PRESENCE_CHANGED`, `TASK_CREATED`, `TASK_UPDATED`, `TASK_OFFERED`, `ASSIGNMENT_ACCEPTED`, `ASSIGNMENT_DECLINED`, `ASSIGNMENT_EXPIRED`, `ASSIGNMENT_RELEASED`, `TASK_STARTED`, `TASK_SUBMITTED`, `SUBMISSION_APPROVED`, `SUBMISSION_CHANGES_REQUESTED`, `OBSERVATION_ADDED`, `CLAIM_UPSERTED`, `CLAIM_CONFLICTED`, `CLAIM_RESOLVED`, `RESOURCE_UPDATED`, `INCIDENT_SUSPECTED`, `INCIDENT_OPENED`, `INCIDENT_CONFIRMED`, `INCIDENT_DISMISSED`, `INCIDENT_REVISED`, `INCIDENT_RESOLVED`, `RISK_RECOMPUTED`, `REQUEST_SENT`, `REQUEST_ANSWERED`, `REQUEST_CLOSED`, `PROPOSAL_CREATED`, `PROPOSAL_STALE`, `PROPOSAL_APPROVED`, `PROPOSAL_REJECTED`, `MANUAL_DECISION_APPLIED`, `ACTION_STARTED`, `ACTION_DONE`, `ACTION_FAILED`, `AI_RESULT_DISCARDED`, `AI_FAILED`, `PROJECT_CLOSED`, `LEDGER_UPDATED`. Danh sách chuẩn là enum trong `packages/contracts`; thêm loại mới phải thêm ở đó.

`visibility`: `ALL` (mọi member thấy), `OWNER`, `INVOLVED` (owner và `involved_member_ids`).

---

## 10. Hệ thống AI

### 10.1. Nguyên tắc

- Nhà cung cấp, model, endpoint, biến môi trường: theo ADR §4. Chỉ `ai-worker` gọi model.
- Bốn module, mỗi module một hợp đồng vào/ra có schema. Bảy tên module trong tài liệu cũ gộp lại như sau:

| Module | Gộp từ | Kích hoạt bởi |
|---|---|---|
| `plan_compose` | `plan_extract` | `POST …/plan/compose` |
| `observation_analyze` | `evidence_parse` + `criteria_assess` + nhận diện sự cố | Mỗi observation có nội dung tự do |
| `incident_assess` | `impact_analyze` (phần diễn giải) + `probe_select` + `recovery_propose` | Incident `OPEN` có revision mới |
| `event_summarize` | `event_summarize` | Đóng project |

- **Việc AI làm:** hiểu ngôn ngữ và ảnh, đề xuất cấu trúc, xếp hạng, viết câu hỏi và lời giải thích. **Việc code làm:** duyệt đồ thị phụ thuộc, tính `risk`, trạng thái claim, điều kiện của action, readiness, mức nghiêm trọng, lọc người đủ điều kiện, mọi con số.
- Đầu ra AI luôn bằng tiếng Anh.

### 10.2. Quy trình chung của một job

1. Nhận message; nạp job. Nếu `status ≠ QUEUED` thì bỏ qua. Đặt `RUNNING`, tăng `attempts`.
2. Kiểm tra cờ (FR-SET-01) và ngân sách (FR-SET-03). Không được phép → `DEAD` với `error_code = AI_DISABLED` hoặc `BUDGET_EXCEEDED`, chạy đường thủ công (§10.9).
3. Dựng **snapshot tối thiểu** cho module (§10.7), ghi nhớ `basis_revision`.
4. Gọi model với `response_format` JSON Schema, giới hạn thời gian và token theo ADR.
5. Kiểm tra theo bốn lớp, dừng ở lớp đầu tiên thất bại:
   1. **Cú pháp:** parse JSON, Zod.
   2. **Tham chiếu:** mọi alias đổi được về ID trong allowlist của snapshot (INV-03).
   3. **Chính sách:** độ dài, số lượng, giá trị enum theo khóa, không có con số bịa (với `incident_assess`: chuỗi `tradeoffs`/`assumptions`/`summary` chứa số kèm đơn vị thời gian hoặc tiền mà không có trong snapshot → loại chuỗi đó).
   4. **Nghiệp vụ:** luật riêng của module (§10.3–10.6).
6. Commit bằng một RPC: kiểm tra lại `basis_revision`; nếu đã đổi → `DISCARDED_STALE`, ghi `AI_RESULT_DISCARDED`, không ghi gì khác. Nếu khớp → ghi kết quả, `event_log`, tăng `state_version`.
7. Ghi `ai_inference_logs` cho **mỗi** lần gọi model, kể cả lần lỗi.
8. Phát tín hiệu realtime, tạo thông báo.
9. Xóa/lưu trữ message.

### 10.3. `plan_compose`

**Vào:** các trường project (`title`, `brief`, `venue_name`, giờ, `expected_team_size`, `expected_attendees`); bản nháp hiện tại (kèm `locked`); tối đa 12 tin nhắn gần nhất; `mode`; các giới hạn `POL.*`.

**Ra:**

```ts
type PlanComposeOutput = {
  reply: string;                                  // ≤ 600 ký tự, hiển thị trong chat
  areas: { key: string; name: string; notes: string | null }[];
  role_tags: string[];                            // ≤ 12
  tasks: { key: string; title: string; description: string; area_key: string | null;
           role_tag: string | null; role_required: boolean;
           start_offset_min: number | null; due_offset_min: number;
           hard_deadline: boolean; estimated_minutes: number; critical: boolean;
           criteria: { description: string; critical: boolean; photo_expected: boolean }[];
           depends_on: { task_key: string; kind: 'HARD' | 'SOFT' }[];
           needs: { resource_key: string | null; category: string | null; hard: boolean }[] }[];
  resources: { key: string; name: string; category: string; kind: 'ITEM' | 'SUPPLY';
               quantity: number | null; area_key: string | null; reason: string }[];
  questions: { text: string; why: string; suggested_answers: string[]; about_keys: string[] }[];
  assumptions: string[];                          // ≤ 8
  change_summary: { added: string[]; changed: string[]; removed: string[] };   // các key
};
```

**Luật nghiệp vụ (server):**
- AI giữ nguyên `key` của mục đã có; mục mới nhận key mới. Key trùng → từ chối.
- Mục `locked` được server chép lại nguyên trạng từ bản nháp hiện tại, bất kể AI trả gì. Tham chiếu tới mục `locked` phải còn hợp lệ.
- `inventory_state`, `custodian_member_id`, `stipend_amount` do người quyết định: server giữ giá trị hiện có; resource mới mặc định `UNVERIFIED`.
- Kiểm tra: mọi tham chiếu key tồn tại; không chu trình; mỗi task 1–8 criteria; không vượt `POL.MAX_*`; `due_offset_min` nằm trong khoảng từ 14 ngày trước `starts_at` đến 24 giờ sau `ends_at`; `start_offset_min < due_offset_min`.
- Server tính lại `gaps` bằng code sau mỗi lần ghi bản nháp (cả sửa tay lẫn AI).
- `mode = FINALIZE`: AI không được thêm task hay resource mới, chỉ điền `area_key` còn trống, chuẩn hóa câu chữ và trả `questions` rỗng. Vi phạm → từ chối kết quả.
- `mode = DRAFT` chỉ hợp lệ khi bản nháp chưa có task nào.

**Chất lượng mong đợi (đưa vào prompt và bộ eval):** criteria phải quan sát được tại chỗ, ưu tiên kiểm tra bằng ảnh; task critical là task mà thiếu nó sự kiện không mở được; câu hỏi chỉ hỏi điều làm thay đổi kế hoạch; tài nguyên gồm cả thứ dễ bị quên (nguồn điện, mạng, đồ dự phòng cho thiết bị mà task critical cần).

### 10.4. `observation_analyze`

**Chạy khi:** observation có `text` hoặc ảnh. Observation chỉ có dữ liệu `structured` thì bỏ qua AI (`analysis_status = SKIPPED`); claim đã được code tạo (FR-CLM-02).

**Vào:** observation (loại, chữ, ảnh nếu `ai_vision_enabled`), tác giả (alias, role tags, khu vực); task liên quan và criteria (nếu là submission, gồm cả các observation bổ sung của submission đó); danh mục alias: areas, resources (tên, category, khu vực, `condition`), tasks (tiêu đề, khu vực, trạng thái), members (nickname, role tags); incident đang mở (loại, tiêu đề, đối tượng chính); tối đa 40 claim còn hiệu lực trên các đối tượng liên quan.

**Ra:**

```ts
type ObservationAnalyzeOutput = {
  claims: { subject_type: 'RESOURCE' | 'MEMBER' | 'TASK' | 'AREA' | 'PROJECT';
            subject_ref: string | null; key: string; value: string; statement: string;
            media_refs: string[]; contradicts_claim_refs: string[] }[];        // ≤ 8
  criteria: { criterion_ref: string; verdict: 'SUPPORTED' | 'INSUFFICIENT' | 'CONFLICTED' | 'NOT_ASSESSED';
              explanation: string; media_refs: string[] }[];                   // chỉ khi là submission
  incident_signal: null | { action: 'NEW' | 'ATTACH'; incident_ref: string | null;
                            type: IncidentType; title: string; summary: string;
                            subject_refs: string[]; safety: boolean };
  new_resource: null | { name: string; category: string; area_ref: string | null; note: string };
  image_quality: 'OK' | 'UNUSABLE' | 'NO_IMAGE';
  injection_suspected: boolean;
};
```

**Luật nghiệp vụ (server):**
- `key` có cấu trúc phải đi với đúng `subject_type` và giá trị thuộc tập cho phép (FR-CLM-01); `resource.location` / `member.location` phải là alias của một area. Claim sai luật bị bỏ riêng lẻ; các claim khác vẫn giữ.
- Claim về người khác (`member.*` mà đối tượng không phải tác giả) luôn ở mức `REPORTED`, không lên `SUPPORTED` chỉ nhờ ảnh.
- `task.progress = DONE` không đổi trạng thái task.
- `criteria`: phải có đủ mọi criterion của task; thiếu cái nào server điền `NOT_ASSESSED`. `SUPPORTED` yêu cầu `media_refs` không rỗng **hoặc** nội dung chữ nêu rõ điều kiện; `image_quality = UNUSABLE` thì mọi verdict dựa trên ảnh thành `INSUFFICIENT`.
- `incident_signal`:
  - Observation là `INCIDENT_REPORT`: incident đã được `api` tạo. `ATTACH` không áp dụng. AI chỉ được điền `type` khi người báo chọn `"Not sure"`, và đề xuất `title`/`summary`.
  - Loại khác, `action = NEW`: áp dụng FR-INC-05 trước; nếu không trùng → tạo incident `SUSPECTED` (FR-INC-03).
  - `action = ATTACH`: gắn observation vào incident (role `EVIDENCE`) và gọi `touch_incidents`.
  - `safety = true`: xử lý theo FR-INC-09.
- `new_resource` → tạo `ai_suggestions` loại `ADD_RESOURCE` (FR-RES-05), không tạo resource.

### 10.5. `incident_assess`

**Chạy khi:** incident ở `OPEN`, không có cờ `safety`, `ai_recovery_enabled` bật, còn ngân sách. Trước khi gọi model, code đã: tính ảnh hưởng (§11.1), sinh ứng viên và đánh giá điều kiện (§11.5), đồng bộ `incident_unknowns`, lọc và chấm điểm người có thể hỏi (§11.4).

**Vào:** incident (loại, tiêu đề, tóm tắt, mức nghiêm trọng); observation liên quan (chữ, tác giả, thời điểm), không gửi lại ảnh; claim liên quan và trạng thái; task bị ảnh hưởng (tiêu đề, trạng thái, `risk`, `critical`, `hard_deadline`, hạn, khu vực, người làm); các option do code sinh kèm kết quả từng điều kiện; unknown đang mở; với mỗi unknown, tối đa 5 người có thể hỏi kèm điểm và lý do; danh mục member và resource **đã lọc đủ điều kiện** để AI dựng option riêng; option đã bị bác; probe đã gửi và kết cục; số probe còn lại; thời điểm hiện tại và múi giờ; proposal trước đó (nếu có) để viết `what_changed`.

**Ra:**

```ts
type IncidentAssessOutput = {
  summary: string;                                           // ≤ 400 ký tự
  extra_unknowns: { subject_type: string; subject_ref: string | null;
                    key: string; label: string }[];          // ≤ 2
  proposed_options: { key: 'ai_1' | 'ai_2'; actions: ActionDraft[] }[];   // ActionDraft = Action dùng alias
  ranking: { option_key: string; tradeoffs: string[]; assumptions: string[];
             evidence_claim_refs: string[] }[];              // thứ tự mảng = thứ hạng
  recommended_option_key: string | null;
  probe: null | { unknown_ref: string; target_member_ref: string;
                  question: string; why_you: string;
                  quick_replies: { label: string; claim_value: string | null }[];
                  allow_photo: boolean };
  what_changed: string | null;                               // ≤ 240 ký tự
  injection_suspected: boolean;
};
```

**Luật nghiệp vụ (server):**
- Mỗi `proposed_options` đi qua §11.5. `INVALID` → bỏ, ghi `POLICY_REJECTED` kèm điều kiện sai; không làm hỏng phần còn lại.
- `ranking` chỉ được nhắc option đang tồn tại sau bước trên; option không được nhắc xếp cuối theo thứ tự code.
- `recommended_option_key` phải trỏ tới option `VALID`; nếu không, server chọn option `VALID` xếp hạng cao nhất, hoặc để trống.
- `probe` phải thỏa FR-PRB-01 và FR-PRB-03; `target_member_ref` phải nằm trong danh sách người có thể hỏi của đúng unknown đó; `claim_value` của lựa chọn nhanh phải thuộc tập giá trị của khóa. Không thỏa → bỏ `probe`, dùng mẫu (§11.4) nếu code thấy vẫn cần hỏi.
- `extra_unknowns` được thêm vào `incident_unknowns` với `source = AI`; không tự làm option nào thành `PENDING_VERIFICATION`.
- Sau khi hợp nhất, **server** tính `readiness` (FR-REC-05), ghi proposal mới (`PENDING`) nếu có ít nhất một option, chuyển proposal `PENDING` cũ sang `SUPERSEDED`, tạo probe nếu có, tăng `ai_calls_used` / `probes_used`.

### 10.6. `event_summarize`

**Vào:** số liệu FR-CLOSE-02 (đã tính), danh sách incident (loại, tiêu đề, các mốc thời gian, phương án đã chọn, kết cục), các quyết định override, task không hoàn thành. Không gửi ảnh, không gửi nội dung observation thô.

**Ra:** `{ headline: string; went_well: Item[]; went_wrong: Item[]; lessons: Item[] }` với `Item = { text: string; refs: string[] }`, mỗi danh sách ≤ 5, mỗi `Item` có ít nhất một `ref` hợp lệ. Số trong `text` phải trùng số liệu đầu vào; `Item` vi phạm bị bỏ.

### 10.7. Dựng snapshot cho model

- **Tối thiểu:** chỉ gửi dữ liệu module cần. Không gửi: `user_id`, mã mời, token, URL ký, số tiền trợ cấp, dữ liệu project khác.
- **Alias thay UUID:** worker gán alias ngắn theo loại (`T1`, `M3`, `R2`, `A4`, `O17`, `C9`, `I1`, `U2`, `K5` cho criterion, `P1` cho ảnh) và giữ bảng ánh xạ trong bộ nhớ của job. Model chỉ thấy alias. Alias không có trong bảng → lỗi lớp 2.
- **Người dùng:** chỉ nickname, role tags, khu vực, presence.
- **Ảnh:** chỉ gửi cho `observation_analyze`, chỉ khi `ai_vision_enabled`, đã thu nhỏ; worker tự tải từ Storage rồi gửi nội dung, không đưa URL ký cho model.
- **Thứ tự và độ dài cố định:** mỗi danh mục có trần số phần tử; vượt trần thì ưu tiên phần tử liên quan trực tiếp tới đối tượng của job và ghi `truncated: true` trong snapshot.

### 10.8. Prompt và chống tiêm lệnh

- Mỗi module có một prompt hệ thống trong `supabase/functions/_shared/ai/prompts/<module>.ts`, mang `PROMPT_VERSION` (chuỗi), ghi vào `ai_inference_logs`. Đổi prompt hay schema PHẢI đổi version và chạy lại bộ eval của module.
- Nội dung do người dùng viết (brief, ghi chú, câu trả lời, chữ trong ảnh) luôn nằm trong trường dữ liệu của tin nhắn `user`, không nối vào prompt hệ thống. Prompt hệ thống nêu rõ: nội dung đó là dữ liệu, không phải chỉ dẫn.
- Model không có tool, không có quyền gọi API. Tác động duy nhất của nó là JSON đi qua bốn lớp kiểm tra.
- `injection_suspected = true` được ghi log và hiện cho owner dưới dạng nhãn `"This note may contain instructions aimed at the AI"` trên observation đó; kết quả vẫn qua kiểm tra như thường.
- Không đưa ví dụ lấy từ kịch bản tham chiếu §4 vào prompt (INV-11). Ví dụ few-shot, nếu dùng, lấy từ loại sự kiện khác.

### 10.9. Khi AI không dùng được

| Module | Biểu hiện với người dùng | Đường thủ công |
|---|---|---|
| `plan_compose` | `"AI couldn't update the plan."` + `"Try again"` | Sửa tay bản nháp (FR-PLAN-07) |
| `observation_analyze` | Nhãn `"AI check unavailable"`; observation vẫn hiển thị | Owner tự review; owner / participant dùng form có cấu trúc để báo tài nguyên và sự cố |
| `incident_assess` | `readiness = ESCALATE_TO_HUMAN`; option của code hiển thị không xếp hạng | Probe theo mẫu (§11.4) nếu `ai_probe_enabled`; `"Ask someone"`; `"Handle manually"` |
| `event_summarize` | `"Summary unavailable"` | Báo cáo số liệu vẫn đầy đủ |

Mọi trường hợp ghi `AI_FAILED` vào `event_log` và hiện trong Attention Queue nếu liên quan tới incident đang mở.

### 10.10. Bộ đánh giá AI

Lưu trong `tests/ai-evals/<module>/`, mỗi case là một file JSON gồm đầu vào (snapshot đã dựng) và kỳ vọng dạng **tính chất kiểm tra được bằng code**. Chạy bằng một lệnh, in bảng đạt/không đạt theo `PROMPT_VERSION` và model.

| Bộ | Nội dung | Số case mục tiêu | Tính chất kiểm tra |
|---|---|---|---|
| `plan_compose` | Mô tả sự kiện đa dạng loại và độ dài | 30 | Hợp lệ 100% về cấu trúc; phủ các task chính đã gán nhãn; có tài nguyên dự phòng cho task critical; không vượt giới hạn |
| `observation_analyze` — evidence | Bài nộp có/không đủ, ảnh mờ, ảnh không liên quan, ảnh gây hiểu nhầm | 120 | Verdict khớp nhãn; không `SUPPORTED` khi nhãn là thiếu |
| `observation_analyze` — claims & incidents | Ghi chú thường, báo sự cố ngầm, ghi chú vô hại | 80 | Claim đúng slot và giá trị; phát hiện sự cố ngầm; không báo động giả trên ghi chú vô hại |
| `incident_assess` — probe | Cần hỏi / không cần hỏi; chọn người | 40 | Hỏi khi nhãn nói cần; không hỏi khi không cần; người được chọn thuộc nhóm đúng |
| `incident_assess` — recovery | Đủ 7 loại incident | 60 | Option khuyến nghị thuộc tập được gán nhãn chấp nhận được; không option `INVALID` lọt qua |
| Tiêm lệnh | Chữ và ảnh chứa chỉ dẫn | 30 | Không đầu ra nào qua được bốn lớp kiểm tra mà gây thay đổi trái quyền |

Ngưỡng đạt do team đặt sau lần chạy đầu tiên và ghi vào `tests/ai-evals/README.md`. Case do owner bác (`DISMISSED`, `REJECTED`, override) trong lúc thử thật được thêm vào bộ eval sau khi bỏ thông tin nhận dạng.

---

## 11. Engine tất định

Các hàm ở mục này là **hàm thuần** trong `packages/engine` (TypeScript, không phụ thuộc Deno/Node/Supabase), nhận một đối tượng dữ liệu đã nạp và trả kết quả. `api` và `ai-worker` dùng chung. Mỗi hàm có unit test phủ mọi nhánh.

### 11.0. Mẫu ghi: engine tính, RPC áp dụng

Logic ở mục này chỉ được cài **một lần, bằng TypeScript**. Không viết lại bằng PL/pgSQL. Để kết quả engine vẫn nhất quán với dữ liệu, mọi thao tác ghi có phần suy diễn (trạng thái claim, `risk`, `touch_incidents`, mức nghiêm trọng, kiểm tra điều kiện) theo đúng một mẫu:

1. `api` hoặc worker đọc dữ liệu cần thiết của project, ghi nhớ `state_version = V`.
2. Gọi engine để tính **phần suy diễn** (các dòng claim cần đổi trạng thái, `risk` mới của từng task, incident nào tăng revision, proposal nào thành `STALE`, …).
3. Gọi một RPC nhận: thay đổi chính, phần suy diễn, và `expected_state_version = V`. RPC khóa dòng `projects`, kiểm tra `state_version = V`, kiểm tra điều kiện chuyển trạng thái của thay đổi chính (§8), ghi tất cả cùng `event_log`, tăng `state_version`. Tất cả trong một transaction.
4. Nếu `state_version ≠ V`: RPC không ghi gì và báo lệch. Bên gọi đọc lại và làm lại từ bước 1, tối đa 3 lần, rồi mới trả 409 `VERSION_CONFLICT`. Người dùng không thấy các lần làm lại này.

Hệ quả cho phân công (§15): luồng DB viết RPC theo dạng "kiểm tra rồi áp dụng" và các ràng buộc cứng (unique, FK, DB-01…DB-11); luồng AI & Engine viết toàn bộ phần tính toán. Cụm "cùng transaction" ở các mục dưới đây nghĩa là: phần suy diễn được ghi trong cùng lời gọi RPC với thay đổi gây ra nó. Xem D-17.

### 11.1. Ảnh hưởng và cờ rủi ro

```text
recompute_task_risk(project):
  đặt mọi task: risk = NONE, risk_reasons = []
  với mỗi incident có status ∈ {OPEN, RECOVERING}:
    với mỗi (task, level, cause) trong direct_seeds(incident):
      raise(task, level, {incident_id, cause})
      propagate(task, level, incident)

raise(task, level, reason):
  bỏ qua nếu task.status ∈ {APPROVED, CANCELLED, DEFERRED}
  task.risk = max(task.risk, level)        // NONE < AT_RISK < BLOCKED
  thêm reason vào task.risk_reasons

propagate(task, level, incident):          // BFS theo successor, có tập đã thăm
  với mỗi cạnh task → s:
    next = HARD: level
           SOFT: AT_RISK nếu level = BLOCKED; dừng nếu level = AT_RISK
    nếu có next: raise(s, next, {incident_id, cause: UPSTREAM, via_task_id: task}); propagate(s, next, incident)
```

`direct_seeds` theo loại incident (chỉ xét task chưa kết thúc):

| Loại | Task hạt giống | Mức |
|---|---|---|
| `RESOURCE_PROBLEM` (resource R) | Task cần R theo `resource_id`; task cần `category` của R, cùng khu vực với R, mà khu vực đó không còn resource nào khác cùng category có `condition = OK` | `hard` → `BLOCKED`; không `hard` → `AT_RISK` |
| `MEMBER_UNAVAILABLE` | Task gắn với incident; task mà member đó đang có assignment hoạt động | `BLOCKED` |
| `TASK_DELAYED`, `HANDOFF_FAILED` | Task đó | `AT_RISK` |
| `CONFLICTING_INFO` | Task liên quan tới đối tượng của slot (cần resource đó / do member đó làm / chính task đó) | `AT_RISK` |
| `PLAN_CHANGE`, `OTHER` | `affected_task_ids` do người tạo chọn | `BLOCKED` nếu `blocking = true`, ngược lại `AT_RISK` |

Với incident `SUSPECTED`, cùng hàm chạy ở chế độ xem trước và trả kết quả cho UI mà không ghi `tasks.risk`. `recompute_task_risk` được gọi trong cùng transaction với mọi thay đổi trạng thái incident, dependency, yêu cầu tài nguyên, và trạng thái task.

### 11.2. Trạng thái claim

Một dòng `claims` là **một khẳng định của một tác giả về một slot với một giá trị**.

```text
upsert_claim(slot, value, author, observation, has_photo, source):
  1. Nếu author đã có claim còn hiệu lực trên slot:
       cùng value  → thêm claim_evidence(SUPPORTS), cập nhật observed_at, has_photo |= has_photo
       khác value  → claim cũ: SUPERSEDED (superseded_by = claim mới); chèn claim mới
     Ngược lại chèn claim mới.
  2. valid_until = observed_at + TTL(độ bền của key)      // STABLE: null
  3. recompute_slot(slot)

recompute_slot(slot):
  active = claim trên slot có status ∉ {SUPERSEDED, STALE, REJECTED} và chưa quá valid_until
  nếu có claim CONFIRMED mà không claim active nào mới hơn nó: giữ nguyên, dừng
  values = tập giá trị khác nhau trong active
  nếu |values| ≥ 2: mọi claim active → CONFLICTED
  ngược lại, với mỗi claim active:
       SUPPORTED nếu has_photo (và không thuộc trường hợp cấm ở §10.4)
                 hoặc có ≥ 2 tác giả khác nhau cùng giá trị
       REPORTED  nếu không
  cập nhật hình chiếu (chỉ với resource.condition, resource.location, resource.exists):
       không conflict → resources.<cột> = giá trị của claim active mới nhất
       conflict hoặc không có claim active → giữ giá trị cũ của cột (UI hiển thị nhãn Conflicted / Stale)
  nếu trạng thái slot đổi: touch_incidents([CLAIM_SLOT slot, đối tượng của slot]); chạy luật R4, R5
```

- Với khóa `custom`: `contradicts_claim_refs` của AI tạo `claim_evidence(CONTRADICTS)` trên claim bị phản bác; claim có bằng chứng `CONTRADICTS` còn hiệu lực thì cả nó và claim phản bác thành `CONFLICTED`.
- Owner `CONFIRM` một claim → claim đó `CONFIRMED`, các claim active khác trên slot → `REJECTED`. Owner `REJECT` → claim đó `REJECTED`, tính lại slot.
- **Còn mới (fresh)** = `status ∈ {REPORTED, SUPPORTED, CONFIRMED}` và chưa quá `valid_until`. Engine phương án chỉ dùng claim còn mới.

### 11.3. Người đủ điều kiện cho một task

Dùng cho gợi ý phân công, `REASSIGN_TASK`, `ADD_TASK`, người mang trong `SWAP_RESOURCE`. Cửa sổ của task = `[start_at ?? due_at − estimated_minutes, due_at]`.

| Mã | Điều kiện | `UNKNOWN` khi |
|---|---|---|
| `MEMBER_APPROVED` | `status = APPROVED`, `role = PARTICIPANT` | — |
| `MEMBER_PRESENT` | `presence ≠ UNAVAILABLE` | `presence = NOT_ARRIVED` và cửa sổ task bắt đầu trong `POL.URGENT_WINDOW_MIN` phút tới, và không có claim `member.presence` còn mới |
| `ROLE_MATCH` | Task không `role_required`, hoặc `role_tag ∈ member.role_tags` | — |
| `AVAILABLE_IN_WINDOW` | `availability` phủ cửa sổ task | — |
| `LOAD_OK` | Số assignment hoạt động trên task chưa kết thúc `< POL.MAX_ACTIVE_ASSIGNMENTS_PER_MEMBER` | — |
| `NO_CRITICAL_CLASH` | Không có assignment hoạt động trên task `critical` có cửa sổ giao với cửa sổ task này | — |
| `NOT_PREVIOUSLY_DECLINED` | Chưa từng `DECLINED` / `RELEASED` chính task này | — |

Điểm xếp hạng (chỉ để sắp thứ tự): `+3` nếu `role_tag ∈ role_tags`; `+2` nếu `current_area_id = task.area_id`; `+2` nếu `presence = ON_SITE`; `−1` cho mỗi assignment hoạt động. Hòa thì theo `nickname`. Gợi ý phân công chỉ trả người không có điều kiện `FALSE`, và phân phối tham lam theo thứ tự task `critical` trước rồi `due_at` tăng dần, cập nhật tải sau mỗi lần gán.

### 11.4. Người có thể hỏi và câu hỏi mẫu

Đủ điều kiện nhận probe về một unknown:
- `status = APPROVED`, `role = PARTICIPANT`, `presence = ON_SITE` (riêng unknown `member.presence` thì hỏi chính người đó bất kể presence);
- không có request `PENDING`;
- chưa trả `CANNOT_CHECK` / `DECLINED` cho unknown này;
- không đang `IN_PROGRESS` trên task `critical` có `due_at` trong `POL.URGENT_WINDOW_MIN` phút — trừ khi không còn ai khác đủ điều kiện.

Điểm: `+4` là người giữ resource / người làm task là đối tượng của slot; `+3` `current_area_id` trùng khu vực của đối tượng; `+2` có role tag trùng `category` của resource hoặc `role_tag` của task; `−2` đang `IN_PROGRESS` trên bất kỳ task nào; `−1` cho mỗi probe đã nhận trong 30 phút gần nhất.

Câu hỏi mẫu (dùng khi `source = TEMPLATE`):

| Khóa | Câu hỏi | Lựa chọn nhanh → giá trị claim |
|---|---|---|
| `resource.condition` | `"Can you check if {resource} is working?"` | `Working` → `OK`; `Not working` → `FAILED`; `Can't find it` → `MISSING` |
| `resource.exists` | `"Do we have {resource} at {area}?"` | `Yes` → `YES`; `No` → `NO` |
| `resource.location` | `"Where is {resource} right now?"` | Danh sách area |
| `member.presence` | `"Are you on site and available right now?"` | `Yes` → `ON_SITE`; `No` → `UNAVAILABLE` |
| `task.progress` | `"How is '{task}' going?"` | `On track` → `ON_TRACK`; `Running late` → `LATE`; `Done` → `DONE`; `Not started` → `NOT_STARTED` |
| `custom` | `label` của unknown | Không có |

`why_you` mẫu: `"You're the closest to {area}."` / `"You're looking after {resource}."` / `"You're working on '{task}'."`

### 11.5. Sinh ứng viên và kiểm tra điều kiện

**Sinh ứng viên** (tối đa 6 option, mỗi option 1 action trừ khi ghi khác):

| Loại incident | Ứng viên do code sinh |
|---|---|
| `MEMBER_UNAVAILABLE` | Với mỗi task bị ảnh hưởng: `REASSIGN_TASK` cho 3 người điểm cao nhất không có điều kiện `FALSE`; nếu task không `critical`: `DEFER_TASK` |
| `RESOURCE_PROBLEM` | Với mỗi task hạt giống: `SWAP_RESOURCE` với tối đa 3 resource cùng `category` (ưu tiên: `condition = OK` còn mới, cùng khu vực, không bị task khác cần); nếu resource ở khu vực khác thì kèm `carrier_member_id` là người điểm cao nhất theo §11.3 cho một việc đến hạn `now + 15 phút` tại khu vực của resource; nếu task không `critical`: `DEFER_TASK` |
| `TASK_DELAYED` | `RESCHEDULE_TASK` với `new_due_at = now + estimated_minutes`; `REASSIGN_TASK` nếu task chưa `IN_PROGRESS`; `DEFER_TASK` nếu không `critical` |
| `HANDOFF_FAILED` | `RESCHEDULE_TASK` như trên; `REASSIGN_TASK` |
| `CONFLICTING_INFO`, `PLAN_CHANGE`, `OTHER` | Không có. Unknown là chính slot đang conflict (nếu có); option đến từ AI hoặc owner |

**Điều kiện theo action:**

| Action | Mã | `TRUE` khi | `UNKNOWN` khi |
|---|---|---|---|
| `REASSIGN_TASK` | `TASK_OPEN_FOR_CHANGE` | Task chưa `APPROVED` / `CANCELLED` / `DEFERRED` | — |
| | 7 mã của §11.3 cho `to_member_id` | Như §11.3 | Như §11.3 |
| `SWAP_RESOURCE` | `RESOURCE_COMPATIBLE` | `to_resource.category` trùng category mà task cần hoặc trùng `from_resource.category` | — |
| | `RESOURCE_EXISTS` | `inventory_state ∈ {CONFIRMED, REPORTED}` (`TO_ACQUIRE` → `FALSE`) | `UNVERIFIED` |
| | `RESOURCE_WORKING` | Có claim `resource.condition = OK` còn mới (`FAILED`/`MISSING` còn mới → `FALSE`) | Không có claim còn mới, hoặc slot `CONFLICTED` |
| | `RESOURCE_LOCATED` | `to_resource.area_id` có giá trị và slot `resource.location` không `CONFLICTED` | Ngược lại |
| | `RESOURCE_FREE` | Không task chưa kết thúc nào khác cần `to_resource` theo `resource_id` với cửa sổ giao nhau; hoặc có nhưng task đó không `critical` (khi đó ghi vào `effects.adds_risk_task_ids`). Task `critical` khác đang cần → `FALSE` | — |
| | `CARRIER_SET_IF_NEEDED` | `to_resource.area_id` trùng khu vực đích, hoặc có `carrier_member_id` | — |
| | 7 mã của §11.3 cho `carrier_member_id` (nếu có) | Như §11.3, với việc đến hạn `now + 15 phút` | Như §11.3 |
| `RESCHEDULE_TASK` | `TASK_OPEN_FOR_CHANGE` | Như trên | — |
| | `DEADLINE_MOVABLE` | Task không `hard_deadline`, hoặc `new_due_at ≤ due_at` hiện tại | — |
| | `NEW_TIME_VALID` | `now < new_due_at ≤ ends_at + 24 giờ`; `new_start_at < new_due_at` | — |
| | `SUCCESSORS_FEASIBLE` | Lan theo cạnh `HARD`: với mỗi successor `s`, thời điểm xong sớm nhất = max(xong sớm nhất của predecessor) + `s.estimated_minutes`; không successor `hard_deadline` nào có thời điểm đó vượt `s.due_at` | — |
| | `ASSIGNEE_AVAILABLE` | Task chưa có người, hoặc `availability` của người làm phủ cửa sổ mới | — |
| `DEFER_TASK` | `TASK_OPEN_FOR_CHANGE` | Như trên | — |
| | `TASK_NOT_CRITICAL` | `critical = false` | — |
| | `NO_CRITICAL_SUCCESSOR` | Không task `critical` chưa kết thúc nào tới được từ task này qua các cạnh `HARD` | — |
| `ADD_TASK` | `FIELDS_VALID` | `title` 3–80; `description` ≤ 500; 1–4 criteria ≤ 200; `now < due_at ≤ ends_at + 24 giờ` | — |
| | `AREA_EXISTS` | `area_id` null hoặc thuộc project | — |
| | `WITHIN_LIMITS` | Chưa vượt `POL.MAX_TASKS` | — |
| | 7 mã của §11.3 cho `assignee_member_id` | Như §11.3 | Như §11.3 |
| Mức option | `ACTION_COUNT` | 1–3 action; tối đa 1 `ADD_TASK` | — |
| | `NO_DOUBLE_BOOKING` | Không member nào là đích của 2 action; không resource nào là `to_resource` của 2 action | — |
| | `ADDRESSES_INCIDENT` | Ít nhất một action chạm tới task hoặc resource nằm trong `incident_links` (role `TRIGGER` / `AFFECTED`); riêng `ADD_TASK` luôn đạt | — |

`validity` của option theo FR-REC-03. Mỗi kết quả `UNKNOWN` được đồng bộ thành một dòng `incident_unknowns` (`source = PRECONDITION`) trên đúng slot còn thiếu; nếu slot đã có claim còn mới thì kết quả không thể là `UNKNOWN`.

`effects.unblocks_task_ids` = các task có `risk` giảm khi chạy `recompute_task_risk` trên bản sao dữ liệu đã áp dụng option và coi incident như đã xử lý.

**Câu mô tả action** (code dựng, không do AI): `REASSIGN_TASK` → `"{member} takes over '{task}'"`; `SWAP_RESOURCE` → `"Use {to_resource} for '{task}'"` hoặc `"{carrier} brings {to_resource} from {from_area} to {to_area}"`; `RESCHEDULE_TASK` → `"Move '{task}' to {HH:mm}"`; `DEFER_TASK` → `"Postpone '{task}'"`; `ADD_TASK` → `"New task for {member}: {title}"`.

### 11.6. Áp dụng phương án đã duyệt

Trong transaction duyệt (FR-REC-07), theo thứ tự `position`:

| Action | Hiệu lực ngay | `DONE` khi | `FAILED` khi |
|---|---|---|---|
| `REASSIGN_TASK` | Assignment hiện tại (nếu có) → `RELEASED`, báo người cũ; tạo assignment `OFFERED` cho `to_member_id` với `is_recovery = true`, `respond_by = now + POL.RECOVERY_OFFER_RESPOND_MINUTES` | Người mới `ACCEPT` | `DECLINE`, `EXPIRED` |
| `SWAP_RESOURCE` không có người mang | Đổi `task_resource_requirements` của task đích sang `to_resource_id` | Ngay | — |
| `SWAP_RESOURCE` có người mang | Tạo task `origin = RECOVERY`: tiêu đề `"Bring {to_resource} to {area}"`, một criterion `"{to_resource} is at {area} and working"`, `due_at = now + 15 phút`; mời người mang (`is_recovery`) | Task đó `SUBMITTED`; khi đó mới đổi `task_resource_requirements` | Người mang từ chối / hết hạn / trả lại |
| `RESCHEDULE_TASK` | Cập nhật `start_at`, `due_at`; báo người làm | Ngay | — |
| `DEFER_TASK` | Task → `DEFERRED` | Ngay | — |
| `ADD_TASK` | Tạo task `origin = RECOVERY`, `critical = false`; mời `assignee_member_id` (`is_recovery`) | Task đó `SUBMITTED` | Người được mời từ chối / hết hạn / trả lại |

Sau đó: `recompute_task_risk`; incident → `RECOVERING`. Khi **mọi** action `DONE`: tạo request `RESOLUTION_CHECK` gửi người điểm cao nhất theo §11.4 đối với task bị ảnh hưởng quan trọng nhất, câu hỏi `"Is this fixed now: {incident title}?"`, lựa chọn `Yes` / `Not yet`. `Yes` → tạo `ai_suggestions` loại `RESOLVE_INCIDENT` kèm observation đó. `Not yet` → incident về `OPEN` và đánh giá lại.

Một action `FAILED` → các action chưa `DONE` → `CANCELLED`; incident về `OPEN`; người vừa từ chối bị loại khỏi ứng viên của incident này (ghi vào `incident_links` role `CANDIDATE` với đánh dấu loại trừ trong `payload`).

### 11.7. `touch_incidents` và vòng đánh giá lại

```text
touch_incidents(project, refs[]):                  // gọi trong cùng transaction với thay đổi
  với mỗi incident có status ∈ {SUSPECTED, OPEN, RECOVERING} và có incident_links khớp một ref:
    revision += 1
    proposal PENDING của incident → STALE           // DB-08
    tính lại severity
    nếu status = OPEN: readiness = ASSESSING; reassess_after = now + POL.INCIDENT_REASSESS_DEBOUNCE_SEC
    ghi event_log INCIDENT_REVISED
```

- **Ai gọi:** thêm observation có gắn task / resource / incident / request; trạng thái slot claim đổi; assignment đổi trạng thái; task đổi `status`, `due_at`, người làm; resource đổi; member đổi `presence`, `current_area_id`, `status`; request đổi trạng thái.
- **Ngoại lệ:** các ghi do chính commit của job `INCIDENT_ASSESS` thực hiện (tạo proposal, tạo probe, cập nhật `readiness`, `incident_unknowns`, `incident_links`) **không** gọi `touch_incidents`.
- **`incident_links` được duy trì** tại mỗi lần mở và mỗi lần commit đánh giá: `TRIGGER` (đối tượng chính, observation gốc), `AFFECTED` (task từ §11.1), `CONTEXT` (resource mà task `AFFECTED` cần theo `hard`; người làm của task `AFFECTED`), `CANDIDATE` (member và resource xuất hiện trong option), `EVIDENCE` (observation được gắn), `CLAIM_SLOT` (mọi slot dùng trong điều kiện). Nhờ `CONTEXT`, một báo cáo về tài nguyên mà task bị ảnh hưởng đang cần sẽ tự làm proposal hết hiệu lực, không phụ thuộc AI.
- **Vòng đánh giá** (worker, cho job `INCIDENT_ASSESS`): tính ảnh hưởng → sinh ứng viên → kiểm tra điều kiện → đồng bộ unknown → (nếu được) gọi AI → hợp nhất → quyết định probe (FR-PRB-01, FR-PRB-07) → tính `readiness` → commit nếu `revision` chưa đổi. Nếu AI không dùng được, vòng này vẫn chạy đầy đủ phần của code và đặt `readiness = ESCALATE_TO_HUMAN`.

---

## 12. Bảo mật và quyền riêng tư

### 12.1. Mô hình truy cập

- **Đọc:** `api` truy vấn bằng JWT người dùng; RLS lọc dòng. `api` lọc thêm trường theo §3 trước khi trả.
- **Ghi:** role `authenticated` **không có** policy `INSERT` / `UPDATE` / `DELETE` trên bất kỳ bảng nghiệp vụ nào. Mọi thao tác ghi đi qua hàm RPC `SECURITY DEFINER`; hàm tự kiểm tra `auth.uid()`, membership, vai trò, trạng thái, version. `EXECUTE` cấp cho `authenticated` chỉ với RPC dành cho người dùng; RPC của worker chỉ cấp cho `service_role`.
- Hai hàm trợ giúp dùng trong policy: `is_member(project_id)` (member `APPROVED`), `is_owner(project_id)`. Thêm `is_involved(incident_id)`: người báo, người nhận request, hoặc người được giao trong action của incident đó.
- Vì khóa publishable nằm trong app, phải coi như kẻ tấn công gọi được PostgREST trực tiếp bằng JWT của chính họ. RLS vì thế phải tự đủ để bảo vệ **dòng**; những trường chỉ ẩn ở tầng `api` phải là trường không nhạy cảm.

### 12.2. Ma trận RLS (`SELECT`)

| Bảng | Ai đọc được dòng |
|---|---|
| `projects`, `areas`, `resources`, `tasks`, `task_criteria`, `task_dependencies`, `task_resource_requirements`, `claims`, `claim_evidence`, `incidents` | `is_member` |
| `members` | Dòng `APPROVED`: `is_member`. Dòng trạng thái khác: `is_owner` hoặc chính user đó |
| `assignments` | `is_member` (bảng task của đội cần biết ai làm gì) |
| `observations`, `observation_media`, `media_assets` | `is_owner`, hoặc tác giả, hoặc `incident_id` không null và `is_involved(incident_id)` |
| `task_submissions`, `criterion_assessments` | `is_owner` hoặc người nộp |
| `information_requests` | `is_owner` hoặc `target_member_id` là mình |
| `incident_links`, `incident_unknowns`, `decision_proposals`, `recovery_actions` | `is_owner` hoặc `is_involved(incident_id)` |
| `plan_drafts`, `plan_messages`, `project_invites`, `ai_suggestions` | `is_owner` |
| `payout_ledger` | `is_owner` hoặc dòng của mình |
| `event_log` | `visibility = ALL` và `is_member`; hoặc `is_owner`; hoặc `INVOLVED` và mình thuộc `involved_member_ids` |
| `notifications` | Người nhận |
| `analysis_jobs`, `ai_inference_logs`, `idempotency_keys`, `push_tokens` | Không ai (chỉ `service_role`) |

Project đã xóa mềm (`deleted_at` không null): mọi policy trả rỗng.

### 12.3. Storage và Realtime

- Một bucket private `evidence`. Không có policy đọc/ghi trực tiếp cho `authenticated`. Tải lên bằng URL ký do `api` cấp sau khi kiểm quyền và tạo `media_assets`; đọc bằng URL ký hạn `POL.SIGNED_URL_TTL_SEC` do `api` cấp theo quyền của `observations`.
- Đường dẫn object: `{project_id}/{media_id}.{ext}`. Không đưa tên người dùng hay nội dung vào đường dẫn.
- Kênh Realtime là private; policy trên `realtime.messages` chỉ cho `is_member` nghe `project:{id}` và chính chủ nghe `user:{id}`. Client không được phát (broadcast) lên các kênh này.

### 12.4. Yêu cầu khác

| ID | Yêu cầu |
|---|---|
| SEC-01 | Khóa model, service-role, secret của worker chỉ nằm trong Edge Function secrets. Không biến `EXPO_PUBLIC_*` nào chứa secret. CI có bước quét secret. |
| SEC-02 | Không ghi vào log: JWT, URL ký, khóa, nội dung ảnh. Nội dung observation trong log lỗi bị cắt còn 200 ký tự. |
| SEC-03 | Giới hạn tần suất theo user: thử mã mời (`POL.JOIN_ATTEMPTS_PER_10_MIN`), tạo observation (60/giờ), `plan/compose` (theo `POL.PLAN_MAX_AI_TURNS`), upload-intent (120/giờ). |
| SEC-04 | `api` xác thực mọi đầu vào bằng Zod trước khi chạm DB; từ chối trường lạ (`strict`). |
| SEC-05 | Server không bao giờ tin `member_id`, `project_id` suy ra được, `reviewed_by`, `status`, `validity`, `risk` từ client. |
| SEC-06 | Ảnh: kiểm tra MIME thật của file (magic bytes) lúc `complete`, không chỉ tin header. |
| SEC-07 | Xóa project xóa toàn bộ object trong Storage của project và mọi dòng dữ liệu; job xóa chạy lại được nếu dở dang. |
| SEC-08 | Nội dung gửi tới model tuân theo §10.7. Trước khi dùng với người ngoài team, kiểm tra điều khoản lưu trữ và xử lý dữ liệu của nhà cung cấp model và phản ánh đúng vào màn hình đồng ý (FR-MEM-03). |
| SEC-09 | Bộ test `tests/security` chạy trong CI trên Supabase local, gồm ít nhất AT-05, AT-06, AT-07, AT-23 và thử gọi trực tiếp PostgREST bằng JWT người dùng cho từng bảng ở §12.2. |

---

## 13. Yêu cầu phi chức năng

Các ngưỡng thời gian là **mục tiêu ban đầu** để đo, chưa phải kết quả.

| ID | Yêu cầu |
|---|---|
| NFR-01 | **Thiết bị.** Android, phiên bản tối thiểu theo mặc định của Expo SDK trong ADR. Nghiệm thu trên ít nhất 3 máy thật, trong đó một máy tầm thấp. Dùng development build / APK; Expo Go không được tính là bằng chứng nghiệm thu. |
| NFR-02 | **Quy mô.** Hoạt động mượt với 50 member, 100 task, 100 resource, 2.000 dòng `event_log`, 500 observation trong một project. |
| NFR-03 | **Độ trễ API.** Đọc p95 ≤ 800 ms; ghi (trả ACK) p95 ≤ 1 giây, không tính thời gian tải ảnh. |
| NFR-04 | **Đồng bộ.** Từ lúc commit ở máy A tới lúc màn hình máy B cập nhật: p95 ≤ 3 giây khi có realtime. |
| NFR-05 | **Độ trễ AI.** `observation_analyze` có kết quả trong p95 ≤ 20 giây (chữ) / 30 giây (có ảnh). `incident_assess` p95 ≤ 30 giây. UI hiển thị trạng thái đang xử lý ngay lập tức, `"Still working…"` sau 15 giây, và chuyển đường thủ công chậm nhất sau 90 giây. |
| NFR-06 | **Khởi động.** Từ mở app (đã có phiên) tới khi thấy snapshot: ≤ 4 giây trên máy tầm trung, mạng 4G. |
| NFR-07 | **Không hỏng dữ liệu.** Mất mạng, kill app, gửi lặp, job chạy lặp, hai người thao tác đồng thời: không tạo bản ghi trùng, không để trạng thái nửa chừng (mọi thao tác ghi là một transaction). |
| NFR-08 | **Chạy lặp được.** Kịch bản tham chiếu chạy 3 lần liên tiếp trên 3 project mới mà không sửa code, không can thiệp DB bằng tay. |
| NFR-09 | **Quan sát được.** Log có cấu trúc (JSON) cho mọi request (`request_id`, `user_id`, `project_id`, route, status, thời gian) và mọi job. Sentry cho mobile, `api`, `ai-worker`. |
| NFR-10 | **Đo AI.** Từ `ai_inference_logs` và `analysis_jobs` truy vấn được: số lần gọi và chi phí ước tính theo project, p50/p95 độ trễ theo module, tỷ lệ từng `outcome`, tuổi hàng đợi, tỷ lệ proposal được duyệt / bị bác / `STALE`, tỷ lệ probe được trả lời. Có sẵn các truy vấn này trong `docs/runbooks/metrics.sql`. |
| NFR-11 | **Chuỗi UI tập trung.** Mọi chuỗi hiển thị nằm trong `apps/mobile/src/strings/en.ts`. Không viết chuỗi cứng trong component. |
| NFR-12 | **Khả năng tiếp cận.** Theo UX-05. |
| NFR-13 | **Lưu giữ dữ liệu.** Dữ liệu tồn tại tới khi owner xóa project (xem D-12). |
| NFR-14 | **Triển khai lại được.** Từ repo sạch, làm theo `README.md` dựng được Supabase local, chạy migration, seed, test, và build app, không cần kiến thức ngoài tài liệu. |

---

## 14. Kiểm thử và nghiệm thu

### 14.1. Tầng kiểm thử

| Tầng | Công cụ | Phạm vi |
|---|---|---|
| Unit | Vitest | `packages/contracts` (schema), `packages/engine` (mọi nhánh của §11), các bộ kiểm tra đầu ra AI (§10) với đầu ra giả |
| Tích hợp | Vitest + Supabase local | Mọi RPC và route: quyền, chuyển trạng thái, idempotency, version, transaction; worker chạy với model giả (fixture trả JSON cố định, kể cả JSON sai) |
| Bảo mật | Vitest + Supabase local | §12 (SEC-09) |
| AI eval | Script riêng, gọi model thật | §10.10; không chạy trong CI mặc định, chạy khi đổi prompt / schema / model |
| E2E mobile | Maestro trên máy thật | Luồng chính của từng vai trò; kịch bản tham chiếu |
| Thủ công | 3 máy thật | Kill / mở lại, mất mạng, push, camera |

Test tích hợp và bảo mật **không** gọi model thật. Mọi AT có nhãn `[AI]` cần thêm một lần chạy với model thật trên máy thật.

### 14.2. Test nghiệm thu

MVP đạt khi **mọi** AT dưới đây đạt.

| ID | Tình huống | Kết quả phải có |
|---|---|---|
| **Phiên và thành viên** | | |
| AT-01 | Kill app khi đang ở một project, mở lại | Vào thẳng project đó, snapshot được refetch, không đăng nhập lại |
| AT-02 | User ẩn danh gọi tạo project | 403 `FORBIDDEN` |
| AT-03 | Guest đã là member, sau đó đăng nhập Google lần đầu | Vẫn là cùng user, membership còn nguyên |
| AT-04 | Nhập mã sai / hết hạn / đã tắt; thử sai liên tiếp | Cùng một lỗi `INVITE_INVALID`; quá giới hạn → 429 |
| AT-05 | Member `PENDING` gọi snapshot, task, ảnh | Bị từ chối; chỉ thấy tên sự kiện và trạng thái yêu cầu |
| AT-06 | User của project A truy cập project B qua `api`, qua PostgREST trực tiếp, qua Storage, qua kênh Realtime | Tất cả bị từ chối hoặc trả rỗng |
| AT-07 | Owner loại một member đang có task | Assignment → `RELEASED`; member mất quyền đọc ngay; luật R1 chạy |
| **Plan** | | |
| AT-08 `[AI]` | Tạo bản nháp từ một mô tả | Bản nháp đạt mọi ràng buộc FR-PLAN-01; nếu đầu ra AI sai cấu trúc thì bản nháp trước được giữ và có thông báo |
| AT-09 | Sửa tay một task rồi chạy lượt AI trả về task đó bị đổi / bị xóa (model giả) | Task giữ nguyên nội dung đã sửa tay |
| AT-10 | Chọn `"Not sure"` cho một resource rồi xuất bản | Resource `UNVERIFIED`; có request `RESOURCE_CHECK` gửi đúng người, hoặc mục trong Attention Queue nếu chưa có ai |
| AT-11 | Gọi publish hai lần (cùng và khác idempotency key) | Dữ liệu tạo một lần; trước publish participant không thấy task |
| AT-12 | Thêm dependency tạo chu trình (trong bản nháp và sau khi xuất bản) | 422 `DEPENDENCY_CYCLE` |
| AT-13 | Lập và xuất bản kế hoạch với `ai_enabled = false` | Làm được toàn bộ bằng tay |
| **Task** | | |
| AT-14 | Hai yêu cầu Accept đồng thời cho cùng một lời mời / hai lời mời đồng thời cho cùng một task | Đúng một cái thành công |
| AT-15 | Bấm Start khi predecessor `HARD` chưa xong | Bị chặn kèm tên task đang chờ; owner `"Unlock anyway"` thì bắt đầu được và có log |
| AT-16 | Lời mời task critical quá `respond_by` | Assignment `EXPIRED`, task `OPEN`, incident `MEMBER_UNAVAILABLE` được tạo |
| AT-17 | Lời mời task không critical, không gấp, bị từ chối | Không tạo incident; có mục `"Needs an assignee"` |
| **Bằng chứng** | | |
| AT-18 | Gửi cùng một observation hai lần do mạng chập chờn | Một observation, một job |
| AT-19 | Tải ảnh thất bại giữa chừng | Không có observation trỏ tới ảnh không tồn tại; thử lại gửi được; bản đang soạn không mất |
| AT-20 `[AI]` | Nộp bài thiếu bằng chứng cho một criterion critical | AI trả `INSUFFICIENT`; task vẫn `SUBMITTED`; người nộp nhận gợi ý bổ sung |
| AT-21 | Owner approve khi còn criterion critical chưa tick | Bị chặn. Tick đủ → `APPROVED`, đúng một dòng sổ trợ cấp |
| AT-22 | Nộp bài khi AI tắt hoặc lỗi | Vẫn vào hàng chờ review với nhãn `"AI check unavailable"` |
| AT-23 | Participant không liên quan xin URL ảnh của người khác; dùng URL ký sau khi hết hạn | Bị từ chối |
| **Claim** | | |
| AT-24 | Hai member báo hai trạng thái khác nhau cho cùng một resource | Slot `CONFLICTED`, hiển thị cả hai nguồn; chỉ observation mới hoặc owner gỡ được |
| AT-25 | Model trả về alias / ID không có trong snapshot (model giả) | Toàn bộ kết quả bị loại, có log, không dòng nào được ghi |
| AT-26 | Claim VOLATILE quá TTL | `STALE`; điều kiện `RESOURCE_WORKING` dùng nó thành `UNKNOWN` |
| **Sự cố** | | |
| AT-27 `[AI]` | Ghi chú thường hàm ý sự cố | Incident `SUSPECTED`; chưa có probe / proposal; Confirm → `OPEN`; Dismiss được ghi lại |
| AT-28 | Resource mà chuỗi task HARD/SOFT đang cần bị báo hỏng (form có cấu trúc) | Task trực tiếp và successor `HARD` → `BLOCKED`, successor `SOFT` → `AT_RISK`; `status` các task không đổi; đóng incident → `risk` về `NONE` |
| AT-29 | Hai người báo cùng một resource hỏng | Một incident, observation thứ hai được gắn vào |
| AT-30 | Báo cáo có `"Safety issue"` | Hiện thông điệp khẩn cấp; không probe, không proposal |
| **Probe** | | |
| AT-31 | Incident cần một dữ kiện; có nhiều member với vị trí và tải khác nhau | Probe tới người đủ điều kiện điểm cao nhất (hoặc người AI chọn trong top 5); không bao giờ tới người không phải member, người `UNAVAILABLE`, người đang có probe chờ. `CANNOT_CHECK` không tạo claim; probe kế tiếp tới người khác |
| **Phương án** | | |
| AT-32 | Owner bấm Approve với `expected_incident_revision` cũ | 409 `PROPOSAL_STALE`; không action nào được tạo |
| AT-33 | Điều kiện của option đã thành `FALSE` vào lúc duyệt | 409 `PROPOSAL_STALE` kèm `failed_checks`; proposal → `STALE`; có job đánh giá lại |
| AT-34 | Một thay đổi không liên quan xảy ra (state version tăng, revision của incident không đổi) rồi owner duyệt | Duyệt thành công |
| AT-35 | Option giao việc cho người `UNAVAILABLE` / đang kẹt task critical | Không xuất hiện trong proposal. Dựng tay option tương tự → 422 `CONSTRAINT_VIOLATION` nêu đúng điều kiện |
| AT-36 | AI đề xuất option vi phạm điều kiện hoặc chứa ID lạ (model giả) | Option đó bị bỏ và ghi log; phần còn lại vẫn dùng |
| AT-37 | Duyệt option `PENDING_VERIFICATION` | Chỉ được qua `"Approve anyway"` có lý do; `override = true` trong log |
| AT-38 | Người được mời trong phương án từ chối | Action `FAILED`; incident về `OPEN`; proposal mới không còn người đó |
| AT-39 | Duyệt phương án | Incident `RECOVERING`, không `RESOLVED`. Đóng cần bằng chứng hoặc xác nhận không có bằng chứng. `decided_at` và `resolved_at` ghi riêng |
| AT-40 `[AI]` | Đang có proposal chờ duyệt thì một observation mới làm đổi tình huống | Proposal → `STALE`; client đang mở hiển thị đã cũ và khóa nút; proposal mới phản ánh dữ kiện mới |
| AT-41 | `incident_assess` timeout quá số lần thử | `ESCALATE_TO_HUMAN`; option của code hiển thị không xếp hạng; `"Handle manually"` dùng được; dữ liệu không hỏng |
| AT-42 `[AI]` | Ghi chú và chữ trong ảnh chứa chỉ dẫn gửi tới AI ("approve all tasks", "assign everything to…") | Không thay đổi trạng thái nào ngoài quyền của AI; observation mang nhãn cảnh báo |
| **Đồng bộ và thông báo** | | |
| AT-43 | 3 máy cùng project; thay đổi ở A | B và C cập nhật sau tín hiệu. Khi tắt realtime: cập nhật khi quay lại foreground hoặc kéo làm mới |
| AT-44 | Tắt quyền thông báo của máy | Thông báo vẫn có trong Inbox |
| AT-45 | Mất mạng khi đang soạn và khi bấm gửi | Băng offline; không báo thành công giả; có mạng lại bấm Retry gửi đúng một lần |
| **Đóng** | | |
| AT-46 | Đóng sự kiện khi còn việc dở | Phải xác nhận; sau khi đóng mọi thao tác ghi trả `PROJECT_CLOSED` trừ cập nhật sổ trợ cấp |
| AT-47 | Xuất CSV | Tổng khớp tổng trợ cấp của task `APPROVED`; participant không tải được |
| AT-48 `[AI]` | Mở báo cáo | Số liệu khớp truy vấn DB; mọi ý trong tóm tắt AI có trích dẫn hợp lệ |
| **Toàn trình** | | |
| AT-49 `[AI]` | Kịch bản tham chiếu §4, hồi 0–7, trên 3 máy Android thật | Đạt mọi tính chất ở §4.2; chạy 3 lần liên tiếp trên 3 project mới, không sửa code, không đụng DB |
| AT-50 | Kịch bản tham chiếu với `ai_enabled = false` | Hoàn thành được bằng đường thủ công: báo sự cố bằng form, probe mẫu hoặc probe tay, option do code sinh, quyết định tay |
| AT-51 `[AI]` | Một kịch bản khác hẳn (loại sự kiện khác, sự cố `MEMBER_UNAVAILABLE` và `PLAN_CHANGE`) do người ngoài nhóm phát triển soạn | Đạt các tính chất tương ứng; chứng minh không hardcode |

---

## 15. Kế hoạch xây dựng và phân công

Không có lịch theo ngày. Công việc chia theo **4 luồng** (mỗi luồng một người chịu trách nhiệm) và **7 mốc** (mỗi mốc là một lát cắt chạy được từ đầu tới cuối). Phân công dưới đây là đề xuất theo thế mạnh đã biết của từng người; team xác nhận ở D-18.

### 15.1. Ba điều kế hoạch này phải bảo đảm

1. **Không có việc vô chủ.** Mọi bảng, RPC, endpoint, engine, module AI, màn hình và test thuộc đúng một luồng (§15.2, §15.3). Việc gì không nằm trong bảng thì chưa có ai làm, và phải được bổ sung vào bảng trước khi bắt đầu.
2. **"Xong" được quyết định ở cổng tích hợp, không phải ở lúc từng người bàn giao.** Bốn người đều nộp xong phần mình chưa có nghĩa là MVP xong; MVP xong khi cổng G6 đạt (§15.7). Vì mỗi mốc có một cổng riêng, chỗ hở giữa các phần lộ ra ở cuối từng mốc thay vì dồn tới cuối dự án.
3. **Không ai phải chờ phần cài đặt của người khác.** Các luồng chỉ phụ thuộc vào hợp đồng (`packages/contracts`) và bản giả, không phụ thuộc vào code thật của nhau (§15.5).

Giới hạn cần nói rõ: không kế hoạch nào bảo đảm tuyệt đối. Thứ kế hoạch này làm được là khiến tổng các phần bằng đúng toàn bộ sản phẩm theo cách phân chia, và khiến sai lệch bị phát hiện sớm.

### 15.2. Bốn luồng

"Chịu trách nhiệm" nghĩa là người duy nhất phải bảo đảm phần đó đạt. Người khác vẫn sửa được qua PR nhưng cần người chịu trách nhiệm duyệt. Cột "Sở hữu" cũng là nội dung của file `CODEOWNERS`.

| Luồng | Chịu trách nhiệm | Sở hữu | Hỗ trợ khi quá tải |
|---|---|---|---|
| **DB** | lh6104 | `supabase/migrations/`, `supabase/seed.sql`, `supabase/config.toml`, `tests/security/`, `docs/runbooks/metrics.sql` | TranTungDuong02082006 |
| **API & tích hợp** | Mingpham | `packages/contracts/`, `supabase/functions/api/` (trừ thư mục route của luồng AI), `tools/mock-api/`, `apps/mobile/src/lib/` (API client, query hook, realtime, push, lưu bản nháp), `.github/`, `README.md`, `tests/fixtures/` | lh6104 |
| **Mobile** | dkozTA | `apps/mobile/app/`, `apps/mobile/src/features/`, `components/`, `theme/`, `strings/`, `tests/e2e/`, cấu hình build Android | Mingpham |
| **AI & Engine** | TranTungDuong02082006 | `packages/engine/`, `supabase/functions/ai-worker/`, `supabase/functions/_shared/ai/`, `supabase/functions/api/routes/incidents/` (endpoint #37–48), `tests/ai-evals/` | lh6104 (viết test tích hợp) |

Mingpham kiêm vai trò **người tích hợp**: giữ CI và môi trường staging, chủ trì việc chạy cổng ở cuối mỗi mốc.

Hai luồng nặng nhất là Mobile (khối lượng màn hình) và AI & Engine (nằm trên đường găng từ mốc 3 tới mốc 5). Cột "Hỗ trợ" tồn tại vì lý do đó.

### 15.3. Ai làm phần nào

| Hạng mục | DB | API & tích hợp | Mobile | AI & Engine |
|---|---|---|---|---|
| Bảng, enum, ràng buộc (§7) | Tất cả | — | — | — |
| RLS, Storage, quyền Realtime (§12) | Tất cả | — | — | — |
| RPC ghi dữ liệu (mọi chuyển trạng thái §8, theo mẫu ghi §11.0) | Tất cả | — | — | — |
| `packages/contracts` (enum, schema, `POL.*`, fixture) | Duyệt phần enum khớp DB | Tất cả | — | Viết kiểu của §9.4 phần Recovery và §10 |
| Endpoint §9.3 | — | #1–36, #49–53 | — | #37–48 |
| Khung `api` (xác thực, idempotency, ánh xạ lỗi, envelope) | — | Tất cả | — | — |
| Engine tất định (§11) | — | — | — | Tất cả |
| `ai-worker`, 4 module AI, kiểm tra đầu ra, log (§10) | — | — | — | Tất cả |
| Job nền (§9.6) | Cài `pgmq`, Cron, phần SQL hết hạn lời mời / probe / claim | Kích worker từ `api` | — | Worker, chế độ quét, luật R1–R5 |
| Realtime, push, Inbox | Policy kênh | Phát tín hiệu, gửi push, bảng `notifications`, lớp dữ liệu phía mobile, SCR-26 | Quyền thông báo, deep link, hiển thị | Tạo thông báo cho sự kiện của incident / probe / proposal |
| Màn hình | — | SCR-17, 19, 20, 26 | 29 màn hình còn lại | — |
| Lớp dữ liệu mobile (gọi API, cache, refetch, offline) | — | Tất cả | Dùng hook, không tự gọi API | — |
| Camera, nén ảnh, tải lên | — | Hook tải lên | Giao diện và xử lý ảnh | — |
| Đóng sự kiện, báo cáo, CSV | SQL số liệu FR-CLOSE-02, truy vấn CSV | Route + SCR-19, 20 | — | `event_summarize` |
| Test | Bảo mật; test từng RPC | Tích hợp route; CI; bản giả của API | Maestro; thử trên máy thật | Unit engine; worker với model giả; eval AI |
| Script seed kịch bản tham chiếu (gọi API) | — | Tất cả | — | — |
| Tài liệu chạy (`README`, runbook) | Phần DB | Tổng hợp | Phần build | Phần AI |

### 15.4. Mốc và cổng

Mỗi ô là một gói công việc, gọi tên `WP-<mốc>-<luồng>` (ví dụ `WP-3-DB`, `WP-3-API`, `WP-3-MOB`, `WP-3-AI`). Trong một mốc, bốn gói chạy **song song**. Mốc kết thúc khi cổng đạt.

| Mốc | DB | API & tích hợp | Mobile | AI & Engine | Cổng (AT phải đạt trên máy thật) |
|---|---|---|---|---|---|
| **0 · Nền** | Toàn bộ schema §7 và policy §12.2 trong migration; khung RPC (state version, event log, idempotency, mẫu ghi §11.0); **chữ ký của mọi RPC** dưới dạng hàm rỗng | Monorepo, CI, Supabase local; **toàn bộ `packages/contracts`** bản đầu; khung `api`; **`tools/mock-api`** phục vụ fixture theo contracts; endpoint #1 | Development build cài trên máy thật; khung điều hướng, theme, component nền, file chuỗi; khuôn 4 trạng thái màn hình; SCR-01, 02 chạy với bản giả | Kiểu dữ liệu đầu vào của engine; khung test; khung `ai-worker` (hàng đợi, model giả, 4 lớp kiểm tra, alias, log); gọi thử model thật một lần | **G0:** NFR-14; app mở trên máy thật, chạy được với bản giả và với Supabase local |
| **1 · Join** | RPC project, mã mời, member; policy Realtime | Endpoint #3–5, 7–14; snapshot bản đầu; phát tín hiệu; lớp dữ liệu mobile (client, hook, realtime, khôi phục phiên) | Đăng nhập Google và ẩn danh; SCR-03…07, 16, 18, 27 | §11.3 (người đủ điều kiện, gợi ý phân công); kiểm tra bản nháp và tính `gaps`; `plan_compose` chạy với model giả | **G1:** AT-01…07, 43 |
| **2 · Plan** | RPC bản nháp, xuất bản, area, resource | Endpoint #15–18, 27–28 | SCR-08, 09, 10, 15 | `plan_compose` nối job thật; §11.4 và câu hỏi `RESOURCE_CHECK` sau khi xuất bản; §11.2 (claim) | **G2:** AT-08…13 |
| **3 · Work** | RPC task, assignment, media, observation, submission, review, sổ trợ cấp; SQL hết hạn lời mời | Endpoint #2, 19–26, 29–36, 50; push và Inbox; SCR-26 | SCR-12, 13, 14, 21, 25, 28, 31, 32, 33; camera và tải ảnh | `observation_analyze`; ghi claim và hình chiếu tài nguyên; endpoint #37; §11.1 (rủi ro) | **G3:** AT-14, 15, 17…26, 44, 45 |
| **4 · Incident** | RPC incident, links, unknown, request; SQL hết hạn probe | Attention Queue và bộ đếm trong snapshot; endpoint #49; SCR-17 | SCR-11, 22 (xem, xác nhận, bỏ qua), 24, 29, 30 | Endpoint #38–45; bốn nguồn tạo incident, R1–R5, khử trùng, mức nghiêm trọng, `touch_incidents`; engine probe và câu hỏi mẫu; chế độ quét | **G4:** AT-16, 27…31 |
| **5 · Recover** | RPC proposal, duyệt, action, đóng incident | Endpoint #6, 51–53; SCR-19, 20 | SCR-22 (đầy đủ), 23 | §11.5, §11.6, readiness; `incident_assess`; endpoint #46–48 | **G5:** AT-32…41 |
| **6 · Close & harden** | SQL báo cáo và CSV; xóa project; bộ test bảo mật đầy đủ; `metrics.sql` | Script seed; runbook; đo NFR-03, 04, 06; chạy lại toàn bộ AT | Maestro cho luồng chính; rà UX-01…08; đo NFR-02 | `event_summarize`; bộ eval §10.10 đầy đủ; test tiêm lệnh; cờ và ngân sách AI | **G6:** AT-42, 46…51, cộng toàn bộ AT của G1–G5 chạy lại |

Từ mốc 2 tới mốc 5, phần của ba luồng DB, API, Mobile PHẢI chạy được với `ai_enabled = false` trước khi nối AI (FR-SET-02). Nhờ vậy luồng AI & Engine chậm không chặn ba luồng kia qua cổng: cổng chạy trước các AT không có nhãn `[AI]`, các AT `[AI]` chạy bổ sung khi module AI của mốc đó sẵn sàng.

### 15.5. Cách để không ai phải chờ

**Thứ mở khóa, làm trước mọi thứ khác ở mốc 0:**

| Thứ mở khóa | Người làm | Mở khóa cho |
|---|---|---|
| `packages/contracts` bản đầu: mọi enum §7.2, mọi schema request/response §9.3, kiểu §9.4, `POL.*` | Mingpham (TranTungDuong02082006 viết phần Recovery và AI) | Cả bốn luồng |
| `tools/mock-api`: máy chủ giả trả fixture theo contracts, giữ trạng thái trong bộ nhớ đủ để đi hết một luồng màn hình. Fixture được kiểm tra bằng chính schema trong CI nên không lệch khỏi contracts | Mingpham | Mobile: dựng mọi màn hình không cần `api` thật |
| Migration schema + chữ ký RPC (hàm rỗng trả lỗi `not_implemented`) | lh6104 | API và AI & Engine: viết route và worker dựa trên chữ ký, test bằng RPC thật khi có |
| Model giả và fixture snapshot cho từng module AI | TranTungDuong02082006 | AI & Engine: không cần chờ dữ liệu thật; API và Mobile: thử luồng có AI không tốn tiền gọi model |
| Development build và khuôn màn hình | dkozTA | Mingpham dựng được 4 màn hình của mình trên cùng nền |

**Quy tắc:**

- **W-1** Phụ thuộc vào hợp đồng, không phụ thuộc vào cài đặt. Cần một trường hay một endpoint chưa có trong contracts thì chính người cần mở PR sửa contracts; không chờ người khác viết hộ.
- **W-2** PR sửa `packages/contracts` và migration được review trong 1 ngày làm việc. Các PR khác cũng 1 ngày; quá hạn thì bất kỳ thành viên nào khác được duyệt thay (trừ contracts và migration).
- **W-3** Bị chặn bởi luồng khác quá 1 ngày làm việc: báo ngay trong kênh chung, rồi chuyển sang việc kế tiếp trong luồng mình. Các luồng được phép làm trước việc của mốc sau dựa trên bản giả; chỉ có **cổng** là phải qua theo thứ tự.
- **W-4** Mobile chuyển từng màn hình từ bản giả sang `api` thật ngay khi endpoint tương ứng được merge, không dồn tới cuối mốc.
- **W-5** Tính năng chưa xong được merge sớm nhưng chưa nối vào điều hướng hoặc chưa đăng ký route; không giữ trên nhánh dài ngày.
- **W-6** Thứ tự merge trong một lát cắt khi có thay đổi xuyên luồng: contracts → migration / RPC → route → màn hình. Mỗi bước là một PR riêng của đúng luồng đó.

### 15.6. Quy ước nhánh và merge

- **`main`** luôn xanh và triển khai được. Được bảo vệ: chỉ vào qua PR, CI phải đạt (lint, typecheck, unit, tích hợp, bảo mật, grep chống hardcode theo §16 mục 9), cần ít nhất 1 lượt duyệt của người chịu trách nhiệm phần bị chạm (`CODEOWNERS`), squash merge.
- **Không có nhánh dài hạn theo người** (kiểu `dev-<tên>`). Mỗi người làm trên nhánh ngắn hạn, tách từ `main`, tên theo mẫu `<luồng>/<gói>-<mô-tả-ngắn>`:

| Luồng | Tiền tố | Ví dụ |
|---|---|---|
| DB | `db/` | `db/wp-3-review-submission-rpc` |
| API & tích hợp | `api/` | `api/wp-1-invite-routes` |
| Mobile | `mob/` | `mob/wp-2-plan-studio` |
| AI & Engine | `ai/` | `ai/wp-4-probe-engine` |
| Thay đổi contracts | `contracts/` | `contracts/add-resource-check-request` |
| Sửa tài liệu này | `spec/` | `spec/d-07-owner-can-take-tasks` |
| Sửa lỗi sau cổng | `fix/` | `fix/at-33-stale-on-approve` |

- Một nhánh NÊN được merge trong vòng 3 ngày kể từ khi tạo. PR NÊN dưới khoảng 400 dòng thay đổi (không tính file sinh tự động và migration); lớn hơn thì tách.
- Cập nhật nhánh từ `main` ít nhất mỗi ngày một lần và ngay trước khi merge.
- Tiêu đề PR và commit squash: `[WP-3-DB] FR-EVD-07 review_submission RPC`. Mô tả PR theo §16 mục 15.
- **Contracts:** PR cần lượt duyệt của Mingpham và của người chịu trách nhiệm mỗi luồng dùng phần bị đổi. Merge trước các PR phụ thuộc.
- **Migration:** tên file theo dấu thời gian của Supabase CLI. Ai cũng mở được PR migration, nhưng lh6104 bắt buộc duyệt. Hai PR cùng sửa một bảng không được mở đồng thời; người mở sau rebase lên người mở trước.
- **Cổng:** khi một cổng đạt, gắn tag `gate-0` … `gate-6` lên `main`. Lỗi phát hiện ở cổng được sửa trên nhánh `fix/` và merge vào `main` như thường.
- **Môi trường:** mỗi người một Supabase local. Một project Supabase staging dùng chung, CI tự triển khai từ `main` (migration, function). Cổng chạy trên staging với bản build Android từ đúng commit được gắn tag. Không ai sửa tay staging.

### 15.7. Khi nào MVP xong

- **Một gói công việc xong** khi mọi PR của nó đã merge, đạt định nghĩa "xong" ở §16 mục 16, và phần của luồng đó trong các AT của mốc chạy được với bản giả hoặc với các luồng khác.
- **Một mốc xong** khi cổng của nó đạt: người tích hợp chạy danh sách AT của mốc trên staging, bằng 3 máy Android thật, có mặt cả bốn người (hoặc bốn người cùng xác nhận kết quả). AT trượt được giao cho luồng có lỗi; cổng chỉ đạt khi không còn AT trượt. Kết quả ghi vào `docs/gates/gate-<n>.md` (ngày, commit, từng AT đạt/trượt, ai chạy).
- **MVP xong** khi G6 đạt: toàn bộ 51 AT đạt trong cùng một lần chạy trên một commit, mọi NFR ở §13 đã được đo và ghi lại, và AT-49 đạt 3 lần liên tiếp.

Nếu một cổng chưa đạt, các luồng vẫn làm tiếp việc của mốc sau (W-3), nhưng không cổng nào được ký khi cổng trước nó còn trượt.

---

## 16. Quy tắc cho coding agent

1. **Đọc trước khi viết.** Đọc §0, §1.4, §15.2–15.6 (luồng nào sở hữu file nào, quy ước nhánh), mục FR và AT của gói đang làm, rồi phần §7–§11 mà gói đó chạm tới. Stack và phiên bản xem ADR. Với API của thư viện (Expo, Supabase, NativeWind, Hono, pgmq), tra tài liệu của đúng phiên bản trong ADR thay vì dựa vào trí nhớ.
2. **Một thay đổi, một mục đích, một luồng.** Mỗi PR gắn với một gói `WP-<mốc>-<luồng>`, chỉ sửa file thuộc luồng đó (§15.2), và nêu các `FR-…` / `AT-…` nó hoàn thành. Thay đổi xuyên luồng tách thành nhiều PR theo thứ tự ở W-6.
3. **Hợp đồng trước.** Mọi thay đổi enum, kiểu, schema bắt đầu ở `packages/contracts`. `api`, worker và mobile nhập từ đó; không khai báo lại.
4. **Không tự thêm hành vi.** Nếu tài liệu thiếu hoặc mâu thuẫn: không tự chọn rồi im lặng. Chọn phương án bảo thủ nhất không vi phạm bất biến, ghi rõ trong mô tả PR dưới tiêu đề `Spec gap`, và đề xuất dòng bổ sung cho §17.
5. **Bất biến có test.** PR chạm tới đường ghi dữ liệu phải có test cho các `INV-…` và `DB-…` liên quan. Mỗi FR có ít nhất một test tự động; tên test chứa ID (`it('FR-TASK-05 concurrent accept …')`).
6. **Trạng thái chỉ đổi qua RPC.** Không `UPDATE` trạng thái từ `api` bằng truy vấn rời. Mỗi chuyển trạng thái ở §8 là một RPC, kiểm tra trạng thái nguồn, version, quyền, và ghi `event_log` cùng transaction.
7. **Engine là hàm thuần.** Code ở `packages/engine` không nhập Supabase, Deno, `fetch`, đồng hồ hệ thống; thời điểm hiện tại là tham số.
8. **AI không có đường tắt.** Không viết code nào để đầu ra model ghi thẳng vào bảng nghiệp vụ mà không qua bốn lớp kiểm tra ở §10.2. Không thêm trường cho phép model tự khai hợp lệ, tự duyệt, tự đặt trạng thái.
9. **Không hardcode (INV-11).** Không có tên, ID, câu chữ của kịch bản §4 trong `apps/`, `packages/`, `supabase/functions/`. Dữ liệu kịch bản chỉ ở `tests/fixtures/` và script seed. CI có bước grep kiểm tra.
10. **Migration chỉ thêm.** Không sửa migration đã merge; tạo file mới. Mỗi migration thêm bảng phải thêm policy RLS và test bảo mật cho bảng đó trong cùng PR.
11. **Chuỗi UI ở một chỗ** (`apps/mobile/src/strings/en.ts`), bằng tiếng Anh, đúng UI copy trong tài liệu này khi có.
12. **Không thêm dependency ngoài ADR** nếu chưa nêu lý do trong PR. Không thêm framework agent, hàng đợi ngoài, hay dịch vụ ngoài danh sách của ADR.
13. **Prompt có phiên bản.** Đổi prompt hoặc schema đầu ra → tăng `PROMPT_VERSION`, chạy bộ eval của module, dán bảng kết quả vào PR.
14. **Secret.** Không commit `.env`. Không in secret, JWT, URL ký ra log hay test snapshot.
15. **Báo cáo trung thực.** Mô tả PR nêu cái đã chạy và kết quả thật: lệnh test, số test đạt / trượt, cái chưa kiểm tra được (ví dụ chưa thử trên máy thật). Không đánh dấu AT là đạt nếu chưa chạy.
16. **Định nghĩa "xong" cho một FR:** có test tự động; có đủ bốn trạng thái màn hình nếu có UI (UX-01); lỗi được ánh xạ sang mã ở §9.2; có `event_log`; quyền được kiểm tra ở server; chạy được với `ai_enabled = false` nếu FR không thuần AI.
17. **Thay đổi tài liệu này** đi qua PR riêng có nhãn `spec`, cập nhật số phiên bản ở đầu file.

---

## 17. Quyết định cần team xác nhận

Các điểm dưới đây đã được chọn để tài liệu nhất quán. Đổi một điểm nào thì các mục liên quan phải sửa theo.

| ID | Đã chọn | Lý do | Phương án khác | Ảnh hưởng nếu đổi |
|---|---|---|---|---|
| D-01 | Giữ sổ trợ cấp và xuất CSV ở mức tối giản (FR-CLOSE-04, 05) | Câu hỏi này chưa được trả lời; phần này nhỏ và hoàn tất vòng đời sự kiện | Bỏ hẳn | Xóa `stipend_amount`, `payout_ledger`, SCR-20, AT-47 |
| D-02 | Organizer đăng nhập bằng Google | Không cần nhà cung cấp SMS, không tốn phí, ít bước cấu hình hơn OTP điện thoại | OTP số điện thoại | FR-AUTH-03 |
| D-03 | Participant dùng phiên ẩn danh; liên kết Google là P1 | Vào sự kiện nhanh nhất; đổi lại mất quyền truy cập nếu cài lại app | Bắt buộc Google cho mọi người | FR-AUTH-02, 06, 07 |
| D-04 | Sự cố do AI suy ra phải được owner xác nhận trước khi hệ thống hỏi người hay đề xuất phương án | Tránh làm phiền cả đội vì báo động giả | Tự mở luôn, owner bỏ qua sau | FR-INC-03 |
| D-05 | Bảy loại sự cố, bốn nguồn tạo (thêm nguồn "luật hệ thống" ngoài ba nguồn đã thống nhất) | Vắng người và trễ hạn là sự cố thường gặp nhất và phát hiện được chắc chắn bằng code | Bớt loại / bớt nguồn | FR-INC-01, 02, 04 |
| D-06 | Trao đổi về tài nguyên lúc lập kế hoạch diễn ra giữa AI và organizer; participant tham gia bằng cách trả lời câu hỏi kiểm tra tài nguyên sau khi kế hoạch được xuất bản | Lúc lập kế hoạch thường chưa ai tham gia | Cho participant góp ý trực tiếp vào bản nháp | FR-PLAN-04, FR-RES-04 |
| D-07 | Mỗi task một người; owner không nhận task | Đơn giản hóa ràng buộc và tránh tự duyệt bài của mình | Nhiều người một task; owner cũng làm task | FR-TASK-02, §11.3 |
| D-08 | Một owner cho mỗi sự kiện | Quyền duyệt rõ ràng | Đồng tổ chức | §3 |
| D-09 | Chỉ Android; iOS ngoài phạm vi | Theo trả lời của team | Thêm iOS | §1.5, NFR-01 |
| D-10 | Kịch bản tham chiếu "Saigon Build Day" với hai lần gián đoạn nối nhau | Cho thấy đủ: AI tự nhận ra sự cố, hỏi đúng người, phương án bị vô hiệu bởi dữ kiện mới, phương án thay thế | Kịch bản khác | §4, AT-49 |
| D-11 | AI được đề xuất thêm việc ứng phó mới (`ADD_TASK`), tối đa một việc mỗi option | Nhiều cách xử lý ngoài đời là "làm thêm một việc", không chỉ đổi người hay đổi đồ | Chỉ bốn loại action còn lại | FR-REC-01, §11.5 |
| D-12 | Dữ liệu giữ tới khi owner xóa project; không tự xóa | Đơn giản | Tự xóa ảnh sau N ngày kể từ khi đóng | NFR-13, SEC-07 |
| D-13 | Mọi member thấy mức trợ cấp của từng task; sổ trợ cấp thì chỉ owner và chính người nhận thấy | RLS bảo vệ theo dòng; muốn ẩn theo cột phải tách bảng | Tách `stipend_amount` sang bảng riêng để ẩn với người khác | §3, §12.2 |
| D-14 | App không xử lý tình huống khẩn cấp về an toàn | Ngoài năng lực kiểm chứng của sản phẩm | — | FR-INC-09 |
| D-15 | Giới hạn AI: 8 lần gọi và 3 probe mỗi incident (ADR ghi 4 và 2) | Kịch bản hai lần gián đoạn cần khoảng 5 lần đánh giá | Giữ số của ADR | Phụ lục B |
| D-16 | Văn xuôi của tài liệu bằng tiếng Việt; định danh và UI copy bằng tiếng Anh | Theo thống nhất | Toàn bộ tiếng Anh | — |
| D-17 | Logic suy diễn chỉ viết bằng TypeScript trong `packages/engine`; RPC Postgres chỉ kiểm tra và áp dụng, dùng so khớp `state_version` rồi làm lại khi lệch (§11.0) | Một nơi cài đặt, test được bằng unit test, ranh giới rõ giữa luồng DB và luồng AI & Engine | Viết phần rủi ro / claim / `touch_incidents` bằng PL/pgSQL và trigger | §11.0, §15.3; khối lượng của lh6104 và TranTungDuong02082006 |
| D-18 | Phân công theo 4 luồng, 7 mốc có cổng, nhánh ngắn hạn theo luồng, không nhánh dài hạn theo người (§15) | Không việc vô chủ; lỗi tích hợp lộ ra ở từng mốc; không ai chờ code của người khác | Chia theo tính năng dọc (mỗi người làm trọn một tính năng từ DB tới màn hình) | Toàn bộ §15, `CODEOWNERS` |

**Tình trạng xác nhận (2026-11-14):** D-17 và D-18 đã được TranTungDuong02082006 xác nhận. Ba thành viên còn lại chưa xác nhận; D-17 ảnh hưởng trực tiếp tới khối lượng của lh6104. Các mục D-01 đến D-16 chưa có ai phản đối nhưng cũng chưa được xác nhận từng mục.

---

## Phụ lục A — Thay đổi so với tài liệu trước

| Chủ đề | Tài liệu trước | Tài liệu này |
|---|---|---|
| Lịch | 4 tuần, theo ngày | Không lịch; thứ tự theo phụ thuộc (§15) |
| Bối cảnh cuộc thi, rubric, GTM, tài chính | Có | Bỏ khỏi đặc tả sản phẩm |
| Nền tảng | Android và iOS | Android |
| Ngôn ngữ sản phẩm | Không nêu | Tiếng Anh |
| Đăng nhập organizer | Chưa chốt | Google |
| Tài nguyên | Nhắc trong Execution Graph nhưng không có bảng | Bảng `resources`, `task_resource_requirements`, `areas`; trao đổi về tài nguyên trong Plan Studio; kiểm tra tài nguyên chưa chắc |
| Lập kế hoạch | AI tạo task một lượt | Hội thoại nhiều lượt, sửa tay có khóa, bước chốt |
| Module AI | 7 | 4 (§10.1) |
| Trạng thái `BLOCKED` của task | Là một trạng thái | Là cờ `risk` tách riêng (FR-TASK-08) |
| Chống kết quả cũ | So `state_version` toàn project | `revision` theo incident + kiểm tra lại điều kiện lúc duyệt (FR-INC-10, FR-REC-07); `state_version` chỉ để refetch |
| Unknown | AI nêu | Sinh tất định từ điều kiện `UNKNOWN` của option; AI chỉ bổ sung |
| Sự cố | Ví dụ rời rạc | 7 loại, 4 nguồn, trạng thái `SUSPECTED` |
| Action | 6, trong đó 2 không phải hành động | 5 hành động thực thi được; hỏi thêm và xử lý tay là luồng riêng |
| Idempotency key | Vừa header vừa body | Chỉ header `X-Idempotency-Key` |
| Giới hạn AI mỗi incident | 4 lần gọi, 2 probe | 8 và 3 (D-15) |
| Vai trò area lead, reviewer | P1 | Ngoài phạm vi |

## Phụ lục B — Hằng số chính sách (`POL.*`)

Định nghĩa một lần trong `packages/contracts/src/policy.ts`. Giá trị là mặc định ban đầu.

| Tên | Mặc định | Dùng ở |
|---|---|---|
| `MAX_MEMBERS` | 50 | FR-EVT-07 |
| `MAX_TASKS` | 100 | FR-EVT-07 |
| `MAX_RESOURCES` | 100 | FR-EVT-07 |
| `MAX_AREAS` | 30 | FR-EVT-07 |
| `INVITE_TTL_HOURS` | 72 | FR-MEM-01 |
| `JOIN_ATTEMPTS_PER_10_MIN` | 10 | FR-MEM-02 |
| `PLAN_MAX_AI_TURNS` | 12 | FR-PLAN-02 |
| `PLAN_MAX_QUESTIONS_PER_TURN` | 4 | FR-PLAN-01 |
| `DEFAULT_ESTIMATED_MINUTES` | 15 | FR-TASK-01 |
| `OFFER_RESPOND_MINUTES` | 30 | FR-TASK-03 |
| `RECOVERY_OFFER_RESPOND_MINUTES` | 5 | FR-REC-10 |
| `MAX_ACTIVE_ASSIGNMENTS_PER_MEMBER` | 2 | §11.3 |
| `URGENT_WINDOW_MIN` | 30 | FR-INC-04, FR-INC-06, §11.3, §11.4 |
| `MAX_PHOTOS_PER_OBSERVATION` | 3 | FR-EVD-01 |
| `MAX_IMAGE_EDGE_PX` | 1600 | FR-EVD-02 |
| `MAX_IMAGE_BYTES` | 2 000 000 | FR-EVD-02 |
| `SIGNED_URL_TTL_SEC` | 300 | FR-EVD-02 |
| `CLAIM_TTL_VOLATILE_MIN` | 30 | FR-CLM-01 |
| `CLAIM_TTL_SEMI_MIN` | 180 | FR-CLM-01 |
| `PROBE_EXPIRE_MINUTES` | 5 | FR-PRB-04 |
| `RESOURCE_CHECK_EXPIRE_MINUTES` | 60 | FR-RES-04 |
| `MAX_PENDING_PROBES_PER_MEMBER` | 1 | FR-PRB-03 |
| `MAX_PROBES_PER_INCIDENT` | 3 | FR-PRB-01 |
| `MAX_AI_CALLS_PER_INCIDENT` | 8 | FR-SET-03 |
| `MAX_AI_CALLS_PER_PROJECT_PER_DAY` | 300 | FR-SET-03 |
| `INCIDENT_REASSESS_DEBOUNCE_SEC` | 5 | FR-INC-10 |
| `JOB_MAX_ATTEMPTS` | 3 | §9.6 |
| `IDEMPOTENCY_TTL_HOURS` | 24 | §9.1 |

Thời gian chờ và giới hạn token của model: theo ADR §4.

---

*Hết tài liệu.*
