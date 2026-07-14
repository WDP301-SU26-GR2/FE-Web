# FE ↔ Backend API Guide (v2) — Mangaka Creation Workflow

> **Mục đích:** Hướng dẫn Frontend nối API BE-A theo từng **flow nghiệp vụ**. Mô tả từng endpoint dùng để làm gì,
> **toàn bộ field** (kiểu, bắt buộc?, free-text hay enum), và **từ điển enum** (mọi giá trị + ý nghĩa).
> **Phạm vi:** chỉ các API **BE-A đã code & verify** (Creation & Production). Phần thương mại/quản trị (Contract,
> Voting, Board, Reprint, Transfer = BE-B) và các phần chưa làm → xem §15.
> **Nguồn sự thật:** Zod schema + controller thực tế trong repo (đã đối chiếu 2026-06-30). Swagger sống tại `/api`.
> **File này là bản v2 viết mới** — file `FE-API-Guide.md` cũ giữ nguyên để tham chiếu.
>
> ⚠️ **CẬP NHẬT 2026-07-01:** v2 chưa bổ sung các epic mới nhất. Các phần sau **ĐÃ CÓ** và được mô tả đầy đủ ở **`FE-API-Guide.md` (v1)** — tra ở đó + Swagger `/api`:
> - **Notifications read (A-NOT-02):** `GET /notifications` (+`unreadCount`), `PATCH /:id/read`, `PATCH /read-all` — v1 §6c.
> - **A5 Deadline Negotiation:** `/deadline-requests/*` (propose/counter/agree/reject/withdraw/finalize) — v1 §6d.
> - **A4-b Task production:** `/tasks/*`, `/pages/:id/regions`, `/regions/:id` — v1 §9.
> - **A-NOT-03 — `referenceType` đổi thành mã action** (`<ENTITY>_<ACTION>`, vd `TASK_APPROVED`, `DEADLINE_PROPOSED`); `referenceId` vẫn là id entity để deep-link — v1 §0 "Notifications referenceType".
>
> → Các ghi chú "chưa code" cho notifications/A5/A4-b bên dưới (§12/§15) đã **lỗi thời**.

---

## 1. Quy ước chung (ĐỌC TRƯỚC KHI NỐI)

### 1.1. Base URL & Auth
- Base URL: do FE config (dev mặc định `http://localhost:4000`).
- **Auth header:** `Authorization: Bearer <accessToken>` cho mọi route **trừ** nhóm `auth/*` (public).
- Token lấy từ `POST /auth/login` hoặc `/auth/google` → `accessToken` (sống ngắn) + `refreshToken` (sống dài, lưu DB).
- Access token chứa `roleName` (vai trò) → BE tự enforce RBAC. FE chỉ cần gắn token.
- **`mustChangePassword: true`** (Editor/Board do Admin tạo, đăng nhập lần đầu): FE **bắt buộc** điều hướng sang đổi mật khẩu (`POST /auth/change-password`) trước; mọi route nghiệp vụ khác sẽ bị chặn cho tới khi đổi.

### 1.2. Response envelope (TẤT CẢ response đều bọc)
**Thành công:**
```jsonc
{ "success": true, "message": "Success", "data": { /* payload thật — FE đọc Ở ĐÂY */ } }
```
→ **FE luôn đọc `res.data`.** (Các "shape" mô tả ở dưới là nội dung bên trong `data`, CHƯA bọc.)

**Lỗi:**
```jsonc
// lỗi field-level (validation / domain có path)
{ "success": false, "statusCode": 422, "message": "Invalid email address",
  "errors": [ { "message": "Invalid email address", "path": "email" } ] }

// lỗi đơn (không field)
{ "success": false, "statusCode": 403, "message": "Error.NotSeriesOwner" }

// rate-limit OTP (kèm cooldown)
{ "success": false, "statusCode": 429, "message": "Error.OtpRateLimited", "code": "AUTH_OTP_RATE_LIMITED", "retryAfter": 60 }
```
- `message` **luôn là string**. Mã dạng `Error.Xxx` là **code** → FE map sang text hiển thị (đa ngôn ngữ tùy FE).
- Nhiều lỗi field → `message: "Validation failed"` + danh sách trong `errors[]`.

### 1.3. HTTP status quy ước
| Code | Ý nghĩa |
|------|---------|
| 200 | GET/PUT/PATCH/DELETE thành công |
| 201 | POST thành công |
| 401 | Thiếu/không hợp lệ token (chưa đăng nhập) |
| 403 | Sai vai trò **hoặc** không phải chủ sở hữu/được phân công (RBAC + scoping) |
| 404 | Không tồn tại / ngoài phạm vi xem (ẩn để không lộ tồn tại) |
| 409 | Xung đột trạng thái (transition sai, trùng, đã xử lý) |
| 410 | Hết hạn (OTP) |
| 422 | **Validation fail** (sai kiểu/enum/thiếu field) — KHÔNG phải 400 |
| 429 | Rate-limit (OTP) |

### 1.4. Phân trang
List có phân trang trả: `{ items: [...], total, limit, offset }`. Query: `limit` (mặc định 20, tối đa 100), `offset` (mặc định 0). (Một số list nhỏ chỉ trả `{ items: [...] }` — ghi rõ ở từng route.)

### 1.5. Partial-update (PATCH/PUT sửa từng phần)
Với route "sửa" (proposal update, task update, region update): **gửi field nào sửa field đó**. Bỏ field (omit) hoặc gửi `null` = **giữ nguyên**. Gửi mảng rỗng `[]` = **xóa sạch** mảng đó. → FE chỉ cần gửi field người dùng đổi.

### 1.6. File / ảnh — KHÔNG upload qua BE (dùng Object Storage / signed URL)
File nặng (ảnh trang, character design, asset...) **KHÔNG đi qua Backend**. Quy trình (xem §5):
1. FE xin BE 1 **presigned PUT URL** (`POST /uploads/sign`).
2. FE `PUT` file **thẳng lên R2** bằng URL đó (đúng `Content-Type` đã ký).
3. BE trả về **object key** (chuỗi). DB **chỉ lưu key**, KHÔNG lưu URL/bytes.
4. Khi hiển thị: FE xin **presigned GET** (`POST /uploads/sign-download` với `key`) → URL tạm để `<img src>`.
- **Mọi field kiểu "object key"** (vd `coverImage`, `characterDesigns[]`, `Page.originalFile`, `Task` asset, `Name page fileUrl`, `TaskVersion.file`) → là **key chuỗi**, KHÔNG phải URL hiển thị trực tiếp.

---

## 2. TỪ ĐIỂN ENUM (FE phải gửi đúng giá trị — phân biệt free-text vs enum)

> Field **enum** = chỉ nhận đúng các giá trị dưới đây (sai → 422). Field **free-text** = người dùng tự gõ.
> Dưới đây là toàn bộ enum FE cần khi nối API BE-A.

### 2.1. Identity & Access
**RoleCode** (vai trò tài khoản):
| Value | Ý nghĩa |
|-------|---------|
| `MANGAKA` | Tác giả — tạo series/chapter, giao task, review trợ lý |
| `ASSISTANT` | Trợ lý — nhận & nộp task |
| `EDITOR` | Biên tập viên phụ trách — review proposal/manuscript, pitch, gia hạn deadline |
| `BOARD_MEMBER` | Hội đồng biên tập (chủ yếu BE-B) |
| `SUPER_ADMIN` | Quản trị — tạo Editor/Board, quản lý user |

> FE khi **đăng ký** chỉ được gửi `MANGAKA` hoặc `ASSISTANT` (field `type`). Editor/Board do Super Admin tạo.

**UserStatus:** `INACTIVE` (vừa đăng ký, chưa verify email) · `ACTIVE` (dùng đầy đủ) · `BANNED` (cấm vĩnh viễn) · `BLOCKED` (khóa tạm do vi phạm).
**RegistrationType:** `SELF_REGISTERED` (Mangaka/Assistant tự đăng ký) · `ADMIN_CREATED` (Editor/Board do Admin tạo).
**OtpPurpose:** `REGISTER` (xác thực email khi đăng ký) · `FORGOT_PASSWORD` (đặt lại mật khẩu) · `SIGNING_CONTRACT` (ký hợp đồng — BE-B).

### 2.2. Series & nội dung
**Genre** (thể loại — gửi **mảng**, 1 series nhiều thể loại): `ACTION`, `ADVENTURE`, `COMEDY`, `DRAMA`, `FANTASY`, `HORROR`, `MYSTERY`, `ROMANCE`, `SCI_FI`, `SLICE_OF_LIFE`, `SPORTS`, `SUPERNATURAL`, `THRILLER`, `HISTORICAL`, `ISEKAI`, `MECHA`, `PSYCHOLOGICAL`. (FE nên render dropdown/multi-select cố định — KHÔNG cho gõ tay.)

**Demographic** (nhóm độc giả mục tiêu): `SHONEN` (nam thiếu niên) · `SEINEN` (nam trưởng thành) · `SHOJO` (nữ thiếu niên) · `JOSEI` (nữ trưởng thành) · `KODOMO` (trẻ em).

**PublicationType** (tần suất phát hành): `WEEKLY` · `MONTHLY` · `IRREGULAR`.

**RelationshipType** (quan hệ với series gốc, khi tạo sequel/spinoff): `SEQUEL` (phần tiếp) · `SPINOFF` (ngoại truyện) · `SIDE_STORY` (truyện bên lề) · `REBOOT` (làm lại).

**SeriesStatus** (vòng đời series):
| Value | Ý nghĩa |
|-------|---------|
| `DRAFT` | Mới tạo proposal, chưa submit |
| `IN_REVIEW` | Đã submit, đang trong hàng đợi/được Editor review |
| `READY_TO_PITCH` | Proposal + Name đều đã APPROVED, sẵn sàng pitch |
| `PITCHED` | Đã pitch lên Board (BE-A dừng ở đây) |
| `SERIALIZED` | Board duyệt → đang serial hóa (BE-B/B5) |
| `HIATUS`, `COMPLETING`, `CANCELLING`, `COMPLETED`, `CANCELLED` | Vòng đời sau serialize (BE-B/Flow 5) |
| `REJECTED` | Board từ chối |
| `ABANDONED` | Editor từ chối hẳn concept (trước pitch) |
| `WITHDRAWN` | Mangaka tự rút |

**ProposalStatus** (trạng thái hồ sơ proposal — nằm trong `series.proposal.status`): `DRAFT` · `PROPOSAL_REVIEW` (Editor đang xem) · `PROPOSAL_REVISION` (Editor yêu cầu sửa) · `PROPOSAL_APPROVED` (Editor duyệt concept) · `PITCHED` · `APPROVED` · `REJECTED` · `WITHDRAWN`.

**NameStatus** (vòng đời storyboard Name): `DRAFT` · `SUBMITTED` · `IN_REVIEW` · `REVISION` · `APPROVED`.

### 2.3. Chapter production
**ChapterStatus** (vĩ mô, **dẫn xuất** từ Manuscript — read-only): `DRAFT` · `IN_PRODUCTION` · `COMPLETED` · `PUBLISHED`.

**ManuscriptStatus** (vòng đời sản xuất chi tiết của 1 chương):
| Value | Ý nghĩa |
|-------|---------|
| `DRAFT` | Vừa tạo chapter, chưa có trang |
| `IN_PRODUCTION` | Đang vẽ/giao task (có trang đầu) |
| `COMPOSITE_REVIEW` | Mọi task đã nộp → Mangaka review bản tổng hợp |
| `EDITOR_REVIEW` | Mangaka nộp Editor kiểm tra |
| `EDITOR_REVISION` | Editor yêu cầu sửa |
| `READY_FOR_PRINT` | Editor duyệt, sẵn sàng xuất bản |
| `AWAITING_CO_OWNER_APPROVAL` | Chờ đồng sở hữu duyệt (PARTIAL_TRANSFER — BE-B) |
| `PUBLISHED` | Đã xuất bản |

**PageStatus** (vòng đời 1 trang): `NOT_STARTED` · `IN_PROGRESS` (có task đang làm) · `COMPOSITE_READY` (mọi task của trang đã nộp, chờ Mangaka review) · `COMPLETED` (mọi task approved + Mangaka chốt).

### 2.4. Task & Studio
**Specialization** (loại công việc trợ lý — dùng cho `taskType` của Task **và** `specializations`/`taskTypes`): `BACKGROUND` (vẽ nền) · `SCREENTONE` (dán tone bóng) · `EFFECT_LINES` (đường hiệu ứng/tốc độ) · `INKING` (tô mực) · `COLORING` (tô màu) · `LETTERING` (chèn thoại/chữ).

**TaskStatus** (vòng đời task):
| Value | Ý nghĩa | Ai/thao tác |
|-------|---------|-------------|
| `ASSIGNED` | Vừa giao, trợ lý chưa bắt đầu | sau `POST /tasks` |
| `IN_PROGRESS` | Trợ lý đang làm | sau `POST /tasks/:id/start` |
| `SUBMITTED` | Trợ lý đã nộp 1 bản | sau `POST /tasks/:id/submit` |
| `UNDER_REVIEW` | Mangaka đang duyệt (bước nội bộ thoáng qua) | trong approve/request-revision |
| `APPROVED` | Mangaka duyệt xong (terminal) | sau `POST /tasks/:id/approve` |
| `REVISION_REQUESTED` | Mangaka yêu cầu sửa | sau `POST /tasks/:id/request-revision` |
| `ON_HOLD` | Tạm dừng do trợ lý nghỉ (ON_LEAVE/UNAVAILABLE) | tự động |

**TaskVersionReviewStatus** (trạng thái review của 1 bản nộp trong `versions[]`): `PENDING` (chưa duyệt) · `APPROVED` · `REVISION_REQUESTED`.

**RegionType** (loại vùng khoanh trên trang): `PANEL` (khung tranh) · `BACKGROUND` (vùng nền) · `SPEECH_BUBBLE` (bong bóng thoại) · `SFX` (hiệu ứng âm thanh) · `CHARACTER` (nhân vật).

**AvailabilityStatus** (lịch rảnh trợ lý): `AVAILABLE` · `BUSY` · `ON_LEAVE` (nghỉ phép) · `UNAVAILABLE` (không nhận việc). → set `ON_LEAVE`/`UNAVAILABLE` sẽ tự đẩy task đang chờ của trợ lý sang `ON_HOLD`.

**CollaborationInviteStatus** (lời mời cộng tác): `PENDING` · `ACCEPTED` · `DECLINED` · `EXPIRED` · `CANCELLED`.
**StudioAssignmentStatus** (quan hệ thuê): `ACTIVE` · `COMPLETED` (kết thúc/hết hạn) · `TERMINATED` (chấm dứt sớm). *(KHÔNG có `EXPIRED` — hết hạn tính lazy: `ACTIVE` + `hireEnd < now` được coi là đã kết thúc.)*

### 2.5. Annotation / Markup
**AnnotationType:** `TEXT` (ghi chú chữ) · `HIGHLIGHT` (tô vùng) · `DRAWING` (vẽ tay).
**AnnotationTargetType** (đính markup lên cái gì): `PAGE` · `REGION` · `TASK` · `MANUSCRIPT`.
**ReviewStage** (giai đoạn review, tùy chọn): `ASSISTANT` (Mangaka↔Assistant) · `MANGAKA` (review của Mangaka) · `EDITOR` (Editor↔Mangaka).

### 2.6. Storage & Notification
**AssetType** (loại tài nguyên đính kèm): `REFERENCE` · `BACKGROUND` · `SCREENTONE` · `BRUSH` · `OTHER`.
**Content-Type cho upload (allowlist):** `image/png` · `image/jpeg` · `image/webp` · `application/pdf` (≤ 15MB).
**NotificationType** (loại thông báo — hiện chỉ sinh ở server, chưa có API đọc): `SYSTEM` · `CONTRACT` · `TASK` · `DEADLINE` · `SURVEY` · `BOARD` · `REVIEW`.

> **Enum của BE-B** (ContractStatus, PaymentType, SurveyStatus, DecisionType, TransferType, ...) — KHÔNG thuộc guide này (xem §15).

---

## 3. FLOW 11 — Auth, Identity & Registration (module `auth`, public)

> Tất cả route `auth/*` là **public** (không cần token). Mô hình: Mangaka/Assistant tự đăng ký → verify email → ACTIVE ngay (không cần Admin duyệt).

### 3.1. `POST /auth/register` — Đăng ký Mangaka/Assistant
Tạo user `INACTIVE` + gửi OTP qua email. **Body:**
| Field | Kiểu | Bắt buộc | Loại | Mô tả |
|-------|------|----------|------|-------|
| `email` | string (email) | ✅ | free-text | Email đăng nhập (unique) |
| `name` | string | ✅ | free-text | Tên thật |
| `displayName` | string (2–100) | ✅ | free-text | Tên hiển thị |
| `phoneNumber` | string | ✅ | free-text | Số điện thoại |
| `password` | string | ✅ | free-text | ≥8 ký tự, có hoa + thường + số |
| `confirm_password` | string | ✅ | free-text | Phải khớp `password` |
| `type` | string | ✅ | **enum RoleCode** | Chỉ `MANGAKA` hoặc `ASSISTANT` |
Lỗi: 422 (password yếu / không khớp / sai field), 409 (email đã tồn tại ACTIVE), 429 (rate-limit OTP).
→ Sau đó gọi verify-email.

### 3.2. `POST /auth/verify-email` — Kích hoạt tài khoản
**Body:** `email` (free-text), `code` (string 6 ký tự — OTP). → user `ACTIVE` + `emailVerified=true`. Lỗi: 422 (OTP sai/quá số lần), 410 (OTP hết hạn).

### 3.3. `POST /auth/send-otp-email` — Gửi lại OTP
**Body:** `email` (free-text), `purpose` (**enum OtpPurpose** — FE dùng `REGISTER` hoặc `FORGOT_PASSWORD`). Lỗi: 429 (rate-limit: 3/email/24h, 10/IP/24h, cooldown 60s) kèm `retryAfter`.

### 3.4. `POST /auth/login` — Đăng nhập
**Body:** `email`, `password` (free-text). **Trả (`data`):**
```jsonc
{ "user": { "id","email","name","displayName","phoneNumber","role": "MANGAKA" },
  "mustChangePassword": false, "accessToken": "...", "refreshToken": "..." }
```
Lỗi: 422 (email không tồn tại / sai mật khẩu / OTP khóa), 403 (BANNED/BLOCKED hoặc chưa verify email).

### 3.5. `POST /auth/refresh-token` — Làm mới token
**Body:** `refreshToken` (free-text). Trả shape giống login (access mới + refresh mới — rotate). Lỗi: 401 (hết hạn/đã revoke).

### 3.6. `POST /auth/logout`
**Body:** `refreshToken`. Revoke refresh hiện tại.

### 3.7. `POST /auth/forgot-password` — Đặt lại mật khẩu (kèm OTP)
**Body:** `email`, `code` (OTP 6 ký tự — xin trước qua send-otp-email `purpose=FORGOT_PASSWORD`), `newPassword` (≥8 hoa/thường/số), `confirmNewPassword`. → đổi mật khẩu + revoke toàn bộ refresh token.

### 3.8. `POST /auth/google` — Đăng nhập Google
**Body:** `idToken` (string — Google ID token từ GIS). Trả shape giống login. Lỗi: 401 (token rác), 403 (`Error.GoogleAccountNotRegistered` — email chưa đăng ký).

### 3.9. `POST /auth/change-password` — Đổi mật khẩu (đã đăng nhập — route này cần token)
**Body:** `currentPassword`, `newPassword`, `confirmNewPassword`. Dùng cho luồng `mustChangePassword` (Editor/Board lần đầu) hoặc đổi tự nguyện.

---

## 4. Identity profiles & directory (module `users`)

### 4.1. Hồ sơ của tôi (A-AUTH-09)
- `PUT /me/mangaka-profile` — **role MANGAKA.** Upsert (lazy tạo nếu chưa có). **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `penName` | string (1–100) | ✅ | free-text | Bút danh |
  | `genres` | array | ✅ (default `[]`) | **enum Genre[]** | Thể loại sở trường |
  | `experienceLevel` | string | optional | free-text | VD "5 năm" |
  | `bio` | string | optional | free-text | Giới thiệu |
  | `portfolioFiles` | string[] | optional (default `[]`) | object key[] | Ảnh portfolio (key R2) |
- `GET /me/mangaka-profile` — role MANGAKA. Trả hồ sơ mình.
- `PUT /me/assistant-profile` — **role ASSISTANT.** **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `specializations` | array | default `[]` | **enum Specialization[]** | Chuyên môn |
  | `experienceLevel` | string | optional | free-text | |
  | `portfolioFiles` | string[] | optional | object key[] | |
  | `availabilityStatus` | string | optional | **enum AvailabilityStatus** | set `ON_LEAVE`/`UNAVAILABLE` → task đang chờ của mình → `ON_HOLD` |
  | `availabilityFrom` / `availabilityTo` | string (ISO datetime) | optional | free-text (datetime) | Khoảng rảnh |
- `GET /me/assistant-profile` — role ASSISTANT.

**MangakaProfileRes (trong `data`):** `userId`, `penName` (null khi chưa có hồ sơ), `genres` (Genre[]), `experienceLevel` (null), `bio` (null), `portfolioFiles` (string[] key), `reputationScore` (number), `ratingAvg` (number), `ratingCount` (number), `isRecommended` (boolean), `displayName` (null), `avatar` (null), **`hasProfile`** (boolean — `false` = user chưa build hồ sơ → các field profile là default rỗng/null).

**AssistantProfileRes (trong `data`):** `userId`, `specializations` (Specialization[]), `experienceLevel` (null), `portfolioFiles` (string[] key), `availabilityStatus` (AvailabilityStatus | null), `availabilityFrom` (ISO | null), `availabilityTo` (ISO | null), `reputationScore`, `ratingAvg`, `ratingCount`, `isRecommended`, `displayName` (null), `avatar` (null), **`hasProfile`** (boolean).

### 4.2. Xem hồ sơ công khai (bất kỳ user đã đăng nhập)
- `GET /mangakas/:userId` — xem hồ sơ Mangaka (vd Editor xem tác giả của series). **Ẩn email/phone.** Trả `MangakaProfileRes` (có `hasProfile`).
- `GET /assistants/:userId` — xem hồ sơ Assistant công khai. **Ẩn email/phone.**

### 4.3. Danh bạ trợ lý (A-TSK-06) — `GET /assistants`
**Role:** MANGAKA / EDITOR / BOARD_MEMBER / SUPER_ADMIN. **Query (tất cả optional):**
| Param | Loại | Mô tả |
|-------|------|-------|
| `specialization` | **enum Specialization** | Lọc theo chuyên môn |
| `level` | free-text | Lọc theo experienceLevel |
| `availableFrom` / `availableTo` | ISO datetime | Lọc theo lịch rảnh |
| `limit` / `offset` | number | Phân trang |
Trả `{ items, total, limit, offset }`, mỗi item gồm `userId, displayName, avatar, specializations[], experienceLevel, portfolioFiles[], availabilityStatus, availabilityFrom/To, reputationScore, ratingAvg, ratingCount, isRecommended`. Ưu tiên `isRecommended` + reputation cao. **Ẩn email/phone.**

### 4.4. Admin quản lý user (A-AUTH-08) — role SUPER_ADMIN
- `POST /admin/users` — tạo Editor/Board. **Body:** `email`, `name`, `phoneNumber` (free-text), `roleCode` (**enum RoleCode** — chỉ `EDITOR`/`BOARD_MEMBER`). Trả `{ id, email, roleCode, temporaryPassword }` (mật khẩu tạm — hiện 1 lần).
- `GET /admin/users` — list. **Query:** `roleCode` (enum RoleCode), `status` (enum UserStatus), `search` (free-text), `limit`, `offset`, `includeDeleted` (`'true'`/`'false'`). Trả phân trang, mỗi user KHÔNG có password.
- `GET /admin/users/:id` — chi tiết 1 user.

---

## 5. EPIC A7 — Upload/Download file (signed URL, module `uploads`)

> Dùng chung cho A2 (proposal/Name), A3 (Page), A4 (Task asset). BE không ôm bytes.

### 5.1. `POST /uploads/sign` — Xin URL upload (presigned PUT)
**Body:**
| Field | Kiểu | Bắt buộc | Loại | Mô tả |
|-------|------|----------|------|-------|
| `fileName` | string (1–255) | ✅ | free-text | Tên file gốc |
| `contentType` | string | ✅ | **enum** allowlist | `image/png`/`image/jpeg`/`image/webp`/`application/pdf` |
| `contentLength` | number (>0, ≤15MB) | ✅ | number | Kích thước byte |
| `assetType` | string | optional | **enum AssetType** | Phân loại tài nguyên |
**Trả:** `{ assetId, key, uploadUrl, requiredHeaders, expiresAt }`.
→ FE `PUT` file lên `uploadUrl` với header `Content-Type` đúng như đã gửi (`requiredHeaders`). Sai type/size → R2 từ chối 403. URL hết hạn ~10 phút.
→ **Lưu `key`** để gửi vào các field "object key" (coverImage, characterDesigns, originalFile, ...).

### 5.2. `POST /uploads/sign-download` — Xin URL xem/tải (presigned GET)
**Body:** `key` (string — object key đã lưu). **Trả:** `{ downloadUrl, expiresAt }`. RBAC: chủ sở hữu `uploadedBy` hoặc EDITOR/BOARD/SUPER_ADMIN. Bucket private → ảnh chỉ xem qua URL tạm này. Lỗi: 404 (key không tồn tại), 403 (không có quyền).

---

## 6. FLOW 1 — Series Proposal, Name & Pitch (module `series`)

> Luồng: Mangaka tạo proposal + Name mẫu → submit → vào hàng đợi review → **Editor nhận (claim)** → Editor review loop → duyệt cả proposal + Name → pitch lên Board. **BE-A dừng ở `PITCHED`** (serial hóa = BE-B/B5).
> **Roles đọc (GET):** MANGAKA / EDITOR / BOARD_MEMBER / SUPER_ADMIN (KHÔNG Assistant). **Scope:** Mangaka thấy series của mình; Editor thấy series mình phụ trách **+ hàng đợi review** (`editorId` trống & `status=IN_REVIEW`); Board/Admin thấy tất cả.

### 6.1. Tạo & sửa proposal
- `POST /series/proposals` — **role MANGAKA.** Tạo Series(`DRAFT`) + Proposal + Name mẫu. **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `title` | string (1–200) | ✅ | free-text | Tên series |
  | `coverImage` | string | optional | object key | Ảnh bìa (key R2) |
  | `genres` | array | default `[]` | **enum Genre[]** | Thể loại |
  | `demographic` | string | optional | **enum Demographic** | Nhóm độc giả |
  | `publicationType` | string | optional | **enum PublicationType** | Tần suất |
  | `synopsis` | string (≤5000) | optional | free-text | Tóm tắt cốt truyện |
  | `characterDesigns` | string[] | default `[]` | object key[] | Ảnh thiết kế nhân vật |
  | `estimatedLength` | number (≥1) | optional | number | Số chương ước tính |
  | `namePages` | array | default `[]` | object | Trang Name mẫu: `{ pageNumber: number≥1, fileUrl: object key }` |
  | `parentSeriesId` | string | optional | id | Series gốc (nếu sequel/spinoff) |
  | `relationshipType` | string | optional | **enum RelationshipType** | Quan hệ với series gốc |
  Trả `{ series, name }`.
- `PUT /series/proposals/:id` — **role MANGAKA (chủ sở hữu).** Sửa khi Series `DRAFT` **hoặc** proposal `PROPOSAL_REVISION`. Partial-update. **Body** (đều nullish): `title`, `coverImage`, `genres`, `demographic`, `publicationType`, `synopsis`, `characterDesigns`, `estimatedLength`. **KHÔNG nhận `namePages`** (sửa trang Name qua API Name §6.4). Trạng thái khác → 409 `Error.ProposalNotEditable`.
- `DELETE /series/proposals/:id` — **role MANGAKA (chủ sở hữu).** Chỉ khi `DRAFT`. Xóa cascade Series+Name. Non-DRAFT → 409 `Error.ProposalNotDeletable`.

### 6.2. Submit + vòng review proposal
- `POST /series/:id/submit` — **role MANGAKA.** Đưa proposal + Name vào review → Series `IN_REVIEW`, proposal `PROPOSAL_REVIEW`, Name `SUBMITTED`. (Cửa **duy nhất** đưa vào review.)
- `POST /series/:id/proposal/request-revision` — **role EDITOR (đã claim).** **Body:** `reason` (free-text, 1–1000). → proposal `PROPOSAL_REVISION`.
- `POST /series/:id/proposal/resubmit` — **role MANGAKA.** Nộp lại sau khi sửa → `PROPOSAL_REVIEW`.
- `POST /series/:id/proposal/approve` — **role EDITOR.** → proposal `PROPOSAL_APPROVED`.
- `POST /series/:id/reject` — **role EDITOR.** **Body:** `reason`. → Series `ABANDONED`.
- `POST /series/:id/withdraw` — **role MANGAKA.** **Body:** `reason`. → Series `WITHDRAWN`.

### 6.3. Editor nhận/nhả series + pitch (A-SER-08)
- `POST /series/:id/claim` — **role EDITOR.** Nhận series từ hàng đợi (`IN_REVIEW` + chưa có editor) → gán mình. Race → đúng 1 người thắng; thua → 409 `Error.SeriesAlreadyClaimed`. Không ở hàng đợi → 404.
- `POST /series/:id/release` — **role EDITOR.** Nhả series về hàng đợi, **chỉ khi chưa bắt đầu review** (`reviewStartedAt` trống). Đã review → 409 `Error.ReviewAlreadyStarted`; không phải editor phụ trách → 403 `Error.NotAssignedEditor`.
- `POST /series/:id/pitch` — **role EDITOR (phụ trách).** Yêu cầu cả proposal `PROPOSAL_APPROVED` + Name `APPROVED` → Series `PITCHED` (gọi Board engine B5). *(Phần Board duyệt → SERIALIZED = BE-B.)*

> ⚠️ **Mọi action review/pitch yêu cầu Editor ĐÃ claim** (`editorId = mình`). Gọi khi chưa claim → 403 `Error.NotAssignedEditor`. FE: hiện nút "Nhận" cho series ở hàng đợi, sau khi nhận mới mở các nút review.

### 6.4. Vòng đời Name (module `name`, prefix `series/:id/names/:nameId`)
- `POST /series/:id/names/:nameId/request-revision` — **role EDITOR.** **Body:** `reason` (optional). → Name `REVISION`.
- `POST /series/:id/names/:nameId/resubmit` — **role MANGAKA.** → Name `SUBMITTED`/`IN_REVIEW` (version++).
- `POST /series/:id/names/:nameId/approve` — **role EDITOR.** → Name `APPROVED`.
- `PUT /series/:id/names/:nameId/pages` — **role MANGAKA.** Thay TOÀN BỘ trang Name. **Body:** `pages: [{ pageNumber, fileUrl }]`. Chỉ khi Name `DRAFT`/`REVISION`.
- `POST /series/:id/names/:nameId/pages` — **role MANGAKA.** Thêm 1 trang. **Body:** `{ pageNumber, fileUrl }`.

### 6.5. Đọc series/Name (A-SER-07)
- `GET /series?status=&limit=&offset=` — list theo scope role. `status` = **enum SeriesStatus** (optional).
- `GET /series/:id` — chi tiết (xem **SeriesRes** bên dưới). Ngoài scope → 403; không tồn tại → 404.
- `GET /series/:id/names` — danh sách Name của series (`{ items }`).
- `GET /series/:id/names/:nameId` — chi tiết 1 Name.

**SeriesRes (trong `data`):** `id, mangakaId, editorId (null=hàng đợi), coOwnerId, parentSeriesId, title, coverImage (object key), genres[], demographic, publicationType, status, statusReason, relationshipType, createdAt, reviewStartedAt, proposal { nameId, synopsis, characterDesigns[], estimatedLength, status, createdAt } | null`.
**NameRes:** `id, seriesId, chapterNumber (null cho Name proposal), status, version, submittedAt, pages: [{ pageNumber, fileUrl }]`.

---

## 7. FLOW 2 — Chapter Production (module `chapter`)

> Sau khi series serialized (BE-B), Mangaka sản xuất từng chapter. Pipeline: tạo chapter (từ Name APPROVED) → upload trang → review manuscript → publish. **Roles GET chapters:** bất kỳ user đã đăng nhập (service tự scope).

### 7.1. Tạo chapter & lịch
- `POST /chapters` — **role MANGAKA.** **Body:** `seriesId` (id), `nameId` (id — Name đã APPROVED), `chapterNumber` (number≥1), `title` (free-text, optional). → tạo Chapter(`DRAFT`) + Manuscript(`DRAFT`) + Schedule. Trùng số chương → 409.
- `GET /chapters?seriesId=` — list chapter của series (`{ items }`).
- `GET /chapters/:id` — chi tiết (xem **ChapterRes**).
- `PUT /chapters/:id/schedule` — **role EDITOR.** **Body:** `originalDeadline`, `currentDeadline` (ISO datetime, optional). Đặt deadline.
- `PATCH /chapters/:id/schedule/extend` — **role EDITOR.** **Body:** `newDeadline` (ISO datetime, ✅), `reason` (free-text, optional). Gia hạn (ghi lịch sử).

### 7.2. Trang (Page)
- `POST /chapters/:id/pages` — **role MANGAKA.** **Body:** `pageNumber` (number≥1), `originalFile` (object key — file pencil/ink). Trang đầu → Manuscript `DRAFT→IN_PRODUCTION`.
- `GET /chapters/:id/pages` — list trang (`{ items }`).
- `PATCH /pages/:pageId` — **role MANGAKA.** **Body:** `compositeFile` (object key, optional), `status` (**enum PageStatus**, optional — chuyển trạng thái trang thủ công, vd `COMPOSITE_READY→COMPLETED`).

### 7.3. Review & xuất bản manuscript
- `POST /chapters/:id/manuscript/mark-composite-ready` — **role MANGAKA.** `IN_PRODUCTION→COMPOSITE_REVIEW`. *(A4 cũng tự động bước này khi mọi task SUBMITTED — đây là fallback thủ công.)*
- `POST /chapters/:id/manuscript/submit` — **role MANGAKA.** Nộp Editor (`COMPOSITE_REVIEW→EDITOR_REVIEW`), guard mọi Page `COMPLETED`.
- `POST /chapters/:id/manuscript/request-revision` — **role EDITOR.** **Body:** `reason` (optional). → `EDITOR_REVISION`. (Markup chi tiết tạo qua `/annotations` §9.)
- `POST /chapters/:id/manuscript/resubmit` — **role MANGAKA.** → `EDITOR_REVIEW`.
- `POST /chapters/:id/manuscript/approve` — **role EDITOR.** → `READY_FOR_PRINT`.
- `POST /chapters/:id/publish` — **role EDITOR.** Chỉ khi `READY_FOR_PRINT` → `PUBLISHED`. *(Gate hợp đồng FULLY_EXECUTED = đợi BE-B/B1; co-owner approve = BE-B/B3.)*

**ChapterRes:** `id, seriesId, nameId, chapterNumber, title, totalPages, status (ChapterStatus), publishedAt, manuscriptStatus (ManuscriptStatus|null), schedule { id, chapterId, originalDeadline, currentDeadline, extended, extensions[] } | null`.
**PageRes:** `id, chapterId, pageNumber, originalFile (key), compositeFile (key), status (PageStatus), createdAt`.

---

## 8. FLOW 3 — Task Production (module `task`)

> Mangaka khoanh vùng trang → giao task cho trợ lý → trợ lý bắt đầu/nộp → Mangaka duyệt. **Tự động cascade** sang A3 khi mọi task của trang/chapter đã nộp (xem 8.5).

### 8.1. Region (A-TSK-01/02) — role MANGAKA (chủ series)
- `POST /pages/:id/regions` — khoanh vùng manual. **Body:** `coordinates` (✅ object `{ x, y, width, height }` — number), `regionType` (**enum RegionType**, optional). → tạo Region (`createdBy=MANUAL`, `confirmedByMangaka=true`).
- `GET /pages/:id/regions` — **role MANGAKA / EDITOR.** List vùng (`{ items }`).
- `PATCH /regions/:id` — sửa (partial): `coordinates`, `regionType`, `confirmedByMangaka` (nullish).
- `DELETE /regions/:id` — xóa; **chặn 409 `Error.RegionHasTasks`** nếu vùng đã có task.

### 8.2. Giao task (A-TSK-03) — role MANGAKA
- `POST /tasks` — **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `pageId` | string | ✅ | id | Trang chứa task |
  | `regionId` | string | optional | id | Vùng cụ thể |
  | `assistantId` | string | ✅ | id | Trợ lý nhận (phải có StudioAssignment ACTIVE) |
  | `taskType` | string | ✅ | **enum Specialization** | Loại việc |
  | `deadline` | string (ISO datetime) | optional | free-text (datetime) | Hạn |
  | `priority` | number (≥0) | optional (default 0) | number | Ưu tiên |
  | `assetIds` | string[] | optional (default `[]`) | id[] | Asset đính kèm (phải tồn tại) |
  Lỗi: 403 `NotSeriesOwner`, 409 `AssistantNotHired` (trợ lý chưa có hire ACTIVE trong hạn — BR-ASSIST-01), 422 `AssetNotFound`.
- `POST /tasks/batch` — giao nhiều task 1 lần (all-or-nothing). **Body:** `{ items: [CreateTaskBody, ...] }` (1–50).
- `PATCH /tasks/:id` — sửa task (partial): `assetIds` (`[]`=clear), `deadline`, `priority` (nullish).

### 8.3. Vòng đời task của trợ lý (A-TSK-04) — role ASSISTANT (người được giao)
- `POST /tasks/:id/start` — bắt đầu làm (`ASSIGNED→IN_PROGRESS`). **Bắt buộc gọi trước submit.**
- `POST /tasks/:id/submit` — nộp kết quả. **Body:** `file` (object key kết quả). → `SUBMITTED` + tạo 1 TaskVersion. Có thể nộp lại sau revision (tạo version mới).

### 8.4. Mangaka review task (A-TSK-04) — role MANGAKA
- `POST /tasks/:id/approve` — duyệt → `APPROVED` (version mới nhất `APPROVED`).
- `POST /tasks/:id/request-revision` — **Body:** `reviewerNote` (free-text 1–1000). → `REVISION_REQUESTED` (version `REVISION_REQUESTED`). Markup chi tiết tạo riêng qua `/annotations` (§9, targetType=`TASK`).
- `POST /tasks/:id/reassign` — **Body:** `assistantId` (trợ lý mới có hire ACTIVE). Chỉ khi task `ON_HOLD` → `ASSIGNED` (giữ lịch sử version). Khác → 409 `Error.TaskNotReassignable`.

### 8.5. Đọc task + cơ chế cascade (FE cần hiểu để hiển thị đúng)
- `GET /tasks/:id` — chi tiết. **Role:** MANGAKA (chủ series) / ASSISTANT (người được giao); ngoài phạm vi → 404.
- `GET /tasks?pageId=&assistantId=&status=&limit=&offset=` — list. **ASSISTANT** → chỉ task của mình (lọc thêm `pageId`/`status`). **MANGAKA** → **bắt buộc** `pageId` thuộc series mình (thiếu/không sở hữu → list rỗng).
- **Cascade tự động (đọc-hiểu cho UI):** khi mọi task của 1 **trang** đạt SUBMITTED → trang tự `→COMPOSITE_READY`; khi mọi task của cả **chapter** đạt SUBMITTED → manuscript tự `IN_PRODUCTION→COMPOSITE_REVIEW`. **Page→COMPLETED và nộp-Editor vẫn do Mangaka bấm tay** (qua API §7). → FE: sau khi trợ lý nộp đủ, trang/manuscript đổi trạng thái mà không cần FE gọi thêm.

**TaskRes:** `id, pageId, regionId, assistantId, taskType (Specialization), status (TaskStatus), priority, deadline, assetIds[], versions: [{ submittedBy, versionNumber, file (key), reviewStatus (TaskVersionReviewStatus), reviewerNote, submittedAt }], createdAt`.
**RegionRes:** `id, pageId, coordinates {x,y,width,height}, regionType (RegionType|null), createdBy, confirmedByMangaka, confidenceScore (null khi manual)`.

---

## 9. Annotation / Markup (module `annotations`, dùng chung)

> Đánh dấu trực quan lên trang/vùng/task/manuscript. Dùng chung cho Mangaka↔Assistant (review task) và Editor↔Mangaka (review manuscript). **Mọi user đã đăng nhập** (service kiểm tác giả ở resolve/delete).

- `POST /annotations` — tạo markup. **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `targetType` | string | ✅ | **enum AnnotationTargetType** | Đính lên gì (`PAGE`/`REGION`/`TASK`/`MANUSCRIPT`) |
  | `targetId` | string | ✅ | id | Id của target |
  | `annotationType` | string | ✅ | **enum AnnotationType** | `TEXT`/`HIGHLIGHT`/`DRAWING` |
  | `coordinates` | object | optional | free-form JSON | Toạ độ markup |
  | `content` | string (≤5000) | optional | free-text | Nội dung ghi chú |
  | `reviewStage` | string | optional | **enum ReviewStage** | Giai đoạn review |
  | `taskId` | string | optional | id | Liên kết task (nếu có) |
- `GET /annotations?targetType=&targetId=` — **bắt buộc cả 2** (enum + id). Trả `{ items }`. Thiếu/sai → 422.
- `PATCH /annotations/:id/resolve` — đánh dấu đã xử lý (`isResolved=true`).
- `DELETE /annotations/:id` — xóa (chỉ tác giả).

**AnnotationRes:** `id, taskId, authorId, authorRole, targetType, targetId, annotationType, reviewStage, coordinates, content, isResolved, resolvedAt, createdAt`.

---

## 10. FLOW 9 — Studio: Mời cộng tác & danh bạ (module `studio`)

> Hệ thống chỉ là **danh bạ + ghi nhận quan hệ thuê** (lương deal ngoài). Mangaka mời → Assistant chấp nhận → StudioAssignment ACTIVE → mở khóa giao task (BR-ASSIST-01).

### 10.1. Lời mời (CollaborationInvite)
- `POST /collaboration-invites` — **role MANGAKA.** **Body:**
  | Field | Kiểu | Bắt buộc | Loại | Mô tả |
  |-------|------|----------|------|-------|
  | `assistantId` | string | ✅ | id | Trợ lý được mời |
  | `seriesId` | string | optional | id | Metadata (không validate sở hữu) |
  | `hireStart` / `hireEnd` | string (ISO datetime) | ✅ | free-text (datetime) | Khoảng thuê (`start < end`, tương lai) |
  | `taskTypes` | array (≥1) | ✅ | **enum Specialization[]** | Loại việc dự kiến |
  Lỗi: 422 (hire period sai / target không phải Assistant), 409 (đã có collaboration ACTIVE với cặp này).
- `GET /collaboration-invites?status=&limit=&offset=` — **role MANGAKA/ASSISTANT.** Scope: Mangaka=gửi, Assistant=nhận. `status` = enum CollaborationInviteStatus.
- `GET /collaboration-invites/:id` — chi tiết (owner/invitee).
- `POST /collaboration-invites/:id/accept` — **role ASSISTANT (invitee).** → tạo StudioAssignment `ACTIVE`. Lỗi 403 (không phải invitee), 409 (không PENDING / đã có active).
- `POST /collaboration-invites/:id/decline` — **role ASSISTANT.** → `DECLINED`.
- `POST /collaboration-invites/:id/cancel` — **role MANGAKA (owner).** → `CANCELLED`.

### 10.2. StudioAssignment
- `GET /studio-assignments?status=&activeNow=true|false&limit=&offset=` — **role MANGAKA/ASSISTANT** (scope theo role). `activeNow=true` → chỉ assignment đang trong hạn.
- `GET /studio-assignments/:id` — chi tiết.
- `POST /studio-assignments/:id/terminate` — **role MANGAKA (owner).** **Body:** `reason` (free-text 1–500). → `TERMINATED`. Lỗi 409 (không ACTIVE).

**InviteRes:** `id, mangakaId, assistantId, seriesId, hireStart, hireEnd, taskTypes (Specialization[]), status (CollaborationInviteStatus), createdAt`.
**AssignmentRes:** `id, mangakaId, assistantId, seriesId, hireStart, hireEnd, assignedTaskTypes[], status (StudioAssignmentStatus), terminatedReason, activeNow (bool), createdAt`.

---

## 11. Reviews & Reputation (A-AUTH-07, module `reviews`)

> Đánh giá sau hợp tác → cập nhật reputation hiển thị trên hồ sơ/danh bạ.

- `POST /assistant-reviews` — **role MANGAKA.** Đánh giá trợ lý. **Body:** `assistantId` (id), `rating` (number 1–5), `comment` (free-text ≤1000, optional), `studioAssignmentId` (✅ — assignment **đã kết thúc** giữa đúng cặp), `seriesId` (optional). Lỗi: 422 `ReviewRequiresEndedAssignment` (chưa có assignment kết thúc), 422 `CannotReviewSelf`.
- `GET /assistant-reviews?assistantId=&limit=&offset=` — list review của 1 trợ lý.
- `POST /mangaka-reviews` — **role EDITOR.** Đánh giá Mangaka. **Body:** `mangakaId` (id), `rating` (1–5), `comment` (optional), `seriesId` (optional).
- `GET /mangaka-reviews?mangakaId=&limit=&offset=` — list review của 1 Mangaka.

**ReviewRes:** `id, rating, comment, createdAt, reviewer { id, displayName, avatar }?`.

---

## 12. Notifications — ⚠️ CHƯA có API đọc
Server **đã sinh** notification (task assigned, review requested, deadline warning, chapter published...) nhưng **chưa có endpoint `GET /notifications` / mark-read** (A-NOT-02 chưa làm). FE tạm thời **chưa nối** phần thông báo in-app. Loại thông báo: enum **NotificationType** (§2.6). Realtime: hệ thống KHÔNG có WebSocket — khi có API sẽ là **polling** (10–30s).

---

## 13. Bản đồ nhanh: nghiệp vụ → thứ tự gọi API

| Nghiệp vụ | Thứ tự gọi |
|-----------|-----------|
| **Đăng ký + dùng** | `register` → `verify-email` → `login` → (gắn Bearer) → `PUT /me/*-profile` |
| **Editor/Board lần đầu** | `login` (`mustChangePassword=true`) → `change-password` → dùng tiếp |
| **Upload ảnh** | `POST /uploads/sign` → `PUT` thẳng R2 → lưu `key` → gửi key vào field tương ứng → hiển thị: `POST /uploads/sign-download` |
| **Tạo series** (Mangaka) | upload bìa/char/Name pages (sign) → `POST /series/proposals` → `POST /series/:id/submit` |
| **Editor xử series** | `GET /series` (hàng đợi) → `POST /series/:id/claim` → review: `proposal/request-revision`↔`resubmit` + Name `request-revision`↔`resubmit` → `proposal/approve` + Name `approve` → `POST /series/:id/pitch` |
| **Sản xuất chapter** | `POST /chapters` → `PUT schedule` (Editor) → `POST /chapters/:id/pages` (mỗi trang) → khoanh vùng + giao task (Flow 3) → `manuscript/submit` → Editor `approve` → `publish` |
| **Giao & làm task** | Mangaka: `POST /pages/:id/regions` → `POST /tasks` ; Assistant: `start` → `submit` ; Mangaka: `approve`/`request-revision` |
| **Thuê trợ lý** | `GET /assistants` (tìm) → `POST /collaboration-invites` → Assistant `accept` → (assignment ACTIVE) → giao task được |
| **Đánh giá** | sau khi assignment kết thúc: Mangaka `POST /assistant-reviews` ; Editor `POST /mangaka-reviews` |

---

## 14. Checklist tích hợp cho FE
- [ ] Luôn đọc `res.data` (envelope). Lỗi đọc `res.message` (+`errors[]` nếu field-level).
- [ ] Gắn `Authorization: Bearer <accessToken>` mọi route trừ `auth/*`.
- [ ] Xử lý `mustChangePassword` → ép đổi mật khẩu trước.
- [ ] Refresh token khi access hết hạn (`POST /auth/refresh-token`).
- [ ] Field enum → render select cố định (giá trị §2), KHÔNG cho gõ tay. Field "object key" → đi qua signed URL (§5).
- [ ] Phân trang: gửi `limit`/`offset`, đọc `total`.
- [ ] Editor phải `claim` series trước khi review (xử lý 403/409).
- [ ] Task: Assistant phải `start` trước `submit`.

---

## 15. CHƯA CÓ (đừng gọi — sẽ bổ sung / thuộc BE-B)
- **A5 — Deadline Negotiation (Flow 10):** thương lượng deadline (counter/agree/escalate) — chưa code (mới có set/extend schedule ở §7).
- **A6 / A-NOT-02 — Notifications API:** `GET /notifications` + mark-read — chưa code (§12).
- **AI segmentation (A-TSK-01 AC1):** tự động detect vùng — defer (hiện chỉ khoanh vùng manual).
- **Sau `PITCHED` của series:** serialize→SERIALIZED, vòng đời (HIATUS/COMPLETE/CANCEL) = **BE-B (B5/Flow 5)**.
- **BE-B (toàn bộ):** Contract/Payment (ký hợp đồng, OTP `SIGNING_CONTRACT`), Reprint, Transfer, Survey/Guest Voting/Ranking, Board Decision, PublicationVersion. → A3 publish hiện chưa gate Contract; co-owner approve chưa có.

> Mọi enum/field chi tiết hơn: tra **Swagger `/api`** (đã có mô tả enum + lỗi cho từng route).
