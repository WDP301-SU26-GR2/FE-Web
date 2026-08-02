# FE Web Guide — Manga Creation Workflow System

> **Đối tượng đọc:** dev FE web (React/Next/Vue...). Mỗi role có 1 file riêng — chỉ đọc file role bạn đang code, cộng với file `01-conventions-and-auth.md` (đọc 1 lần, dùng chung mọi role).
> **Nguồn dữ liệu:** đọc trực tiếp từ `BE-dev/src/modules/*` (controller/schema/dto/errors/messages), `BE-dev/prisma/schema.prisma`, `BE-dev/test/flows/route-roles.ts` (mapping route↔role sinh tự động từ Reflect metadata runtime — nguồn sự thật duy nhất về quyền), và `Docs/Requiment-SRS/Requiment.md` (nghiệp vụ gốc, các Flow 1–13).
> ⚠️ **Bộ guide này THAY THẾ hoàn toàn** `FE-API-Guide-v3.md` và `FE-Mobile-RN-Guide.md` (bản cũ, dựng theo flow — do code/nghiệp vụ đã đổi nhiều đợt sau đó nên 2 file cũ có thể sai lệch; đừng dùng lại làm nguồn).
> **Cập nhật 2026-08-02:** runtime Swagger có **278 operations**; `route-roles.ts` regenerate từ Reflect metadata (`PUBLIC=23`, `AUTH=18`, `ROLES=237`). Role-specific (route có `@Roles` chứa role đó): SUPER_ADMIN 77 · MANGAKA 124 · ASSISTANT 18 · EDITOR 119 · BOARD_MEMBER 78.
>
> 🔴 **§87 (2026-08-01) — CONTRACT flow đổi sang 2-PHASE (BREAKING).** State machine mới: `DRAFT → BOARD_REVIEW → AWAITING_MANGAKA → FULLY_EXECUTED` (+ `ACTIVATION_PENDING` cho HĐ replacement, `REJECTED_BY_MANGAKA`). **Phase 1 nội bộ** (Editor ↔ Board): Editor `submit-review` → Board để `comments` tư vấn (không vote) → **1 Board `claim` làm đại diện** → đại diện `sign-representative` (OTP). **Phase 2** (Mangaka): chỉ `sign-mangaka` (accept, OTP) hoặc `reject` (+lý do → Editor `redraft` HĐ mới). **Đã XOÁ** 4 route cũ: `PATCH /contracts/:id/status`, `POST .../request-changes`, `.../board-approve`, `.../board-request-changes`. Thêm validate tiền (valuation>0, FULL_BUYOUT 100/0, REVENUE_SHARE ∈(0,100) tổng 100, contractEnd>start, trần ownership-aware). Chi tiết: `05-editor.md` §Contract · `06-board-member.md` §Contract · `03-mangaka.md` §Contract.
>
> 🆕 **W1 + W5 (2026-08-02) — ranking nội bộ + bảo mật metrics.** (1) **`GET /rankings/internal/aggregate`** MỚI (MANGAKA/EDITOR/BOARD/SUPER_ADMIN) — bản nội bộ của `/rankings/aggregate` public, gộp nhiều kỳ NHƯNG giữ `isAtRisk`/`riskLevel`/`isReliable`. (2) **`GET /survey-periods`** nay có filter `?magazine=&publicationType=&status=&limit=&offset=` + response ĐỔI SHAPE `{items,total,limit,offset}` (breaking) + mở thêm cho **MANGAKA**. (3) **`GET /metrics`** nay cần header `x-api-key` → thiếu/sai = 401. Tổng route **277 → 278**. Chi tiết: `03-mangaka.md` §6.3 · `06-board-member.md` §6.5 · `07-super-admin.md` §11/§14.
>
> 🔴 **§88 / Spec 29 (2026-08-02) — Messages tiếng Việt + `NotificationRes.title`.** Mọi text hiển thị (response/notification/email/validate) nay 100% tiếng Việt theo từ điển chuẩn (`AGENTS.md §7.1`); **mã lỗi `Error.*` KHÔNG đổi** → FE nhánh theo `code` không vỡ. `NotificationRes` thêm field **`title`** (suy từ `referenceType`, có ở cả notification cũ) — FE hiển thị `title` làm tiêu đề, `content` làm nội dung. Xem `01-conventions-and-auth.md` §Notification.
>
> 🆕 **Spec 27 (2026-07-29) — Flow 8 vá lỗ "ký mù + không lấy được id":** thêm **`GET /transfers/contracts/:id`** (Mangaka A/B · Editor phụ trách · Board trong roster · Super Admin) để **đọc điều khoản trước khi ký**, và thêm field **`transferContractId`** vào cả 3 route GET TransferRequest (`/mine`, `/pending-board`, `/:id`) để các bên **khám phá được id hợp đồng**. Trước đó `transferContractId` không lộ ra bất kỳ đường GET nào ⇒ chỉ Editor (người tạo) biết id, Mangaka/Board không có cách nào ký. Chi tiết: `03-mangaka.md` §5.6 · `05-editor.md` #33b/#34 · `06-board-member.md` §5.2.
>
> 🆕 **Spec 28 (2026-07-29) — Public author display name:** `GET /public/series` và `GET /public/series/:id` thêm `author: { displayName: string | null }` để Web có thể hiện bút danh Mangaka ở catalog/trang chi tiết. Đây là contract privacy tối thiểu: **không** trả id/email/tên pháp lý/số điện thoại/avatar và không fallback `displayName` sang `name`. `/vote/context` cùng toàn bộ màn vote/ranking vẫn **ẩn tác giả** để tránh thiên vị. Xem `02-guest-reader.md` §2.1–§2.2.
>
> 🔴 **Spec 28 consolidation (2026-08-01) — BREAKING:** proposal nhận/trả `storyboardPages[]` embedded và chỉ duyệt một lần; xoá 7 route `/series/:id/names/*`. Entity `Storyboard` chỉ thuộc chapter; 10 route chapter đổi sang `/chapters/:id/storyboards/:storyboardId/*`. `nameId/nameStatus/NameStatus/NameKind` đổi thành `storyboardId/storyboardStatus/StoryboardStatus` (không còn kind); notification `NAME_*` đổi `STORYBOARD_*`; AppConfig dùng `storyboardMaxReviewRounds`. Tổng route 279 → **273**.
>
> 🔴 **§84 (2026-07-29) — 3 thay đổi, 1 BREAKING. Route inventory KHÔNG đổi (vẫn 279), chỉ đổi quyền + hành vi:**
>
> | # | Thay đổi | Ảnh hưởng FE |
> |---|---|---|
> | 1 | **BREAKING — 4 route vận hành kỳ bình chọn → SUPER_ADMIN-only** (`POST /survey-periods`, `PATCH /survey-periods/:id/status`, `POST /survey-data/import`, `POST /survey-periods/:id/finalize`). Editor gọi → **403**. Lý do: `SurveyPeriod` là đơn vị theo **kỳ phát hành của cả tạp chí**, còn Editor/Tantou chỉ phụ trách vài series; `finalize` còn là xung đột lợi ích. Editor **giữ nguyên mọi quyền ĐỌC**. EDITOR: 123 → **119** route. | Gỡ màn vận hành kỳ khỏi Editor (`05-editor.md` Nhóm E) → chuyển sang Admin (`07-super-admin.md` §14) |
> | 2 | **`FORMAT_CHANGE` hết silent no-op** — thiếu `details.publicationType` nay bị chặn **422** ngay ở `POST /board/decisions` (trước: nhận 201 rồi series đứng yên, không ai biết). | `06-board-member.md` §1 — đọc `errors[].message`, không tự đoán |
> | 3 | **Chuỗi ký Transfer hết im lặng** — nay có notification ở cả 3 mốc (soạn xong → A+B; A ký → B; B ký → Board roster). | `03-mangaka.md` §5.6 · `06-board-member.md` §5.2 |

---

## Cách dùng bộ guide

1. Đọc `01-conventions-and-auth.md` **trước tiên** — response envelope, quy tắc lỗi, phân trang, upload file R2, enum dictionary đầy đủ (66 enum), FE env vars, và toàn bộ flow Auth/Tài khoản (đăng ký/đăng nhập/quên mật khẩu/đổi mật khẩu/hồ sơ `/me`) dùng chung mọi role.
2. Chọn file role bạn cần code (mỗi role 1 file, tự chứa toàn bộ flow + API + field/enum của role đó):

| File | Role | Phạm vi |
|---|---|---|
| [`02-guest-reader.md`](02-guest-reader.md) | Guest / Reader (không cần đăng nhập) | Catalog truyện, đọc chapter, bình chọn (OTP + reCAPTCHA), bảng xếp hạng công khai |
| [`03-mangaka.md`](03-mangaka.md) | MANGAKA | Toàn bộ vòng đời: tạo proposal (kèm `storyboardPages`) → Storyboard chapter → chapter/page/production stage → giao task/AI phân vùng → studio/trợ lý → hợp đồng (Phase 2 accept/reject) → deadline → transfer/reprint (phần Mangaka) → dashboard/ranking |
| [`04-assistant.md`](04-assistant.md) | ASSISTANT | Nhận lời mời cộng tác, nhận & xử lý task, hồ sơ/lịch rảnh, dashboard |
| [`05-editor.md`](05-editor.md) | EDITOR | Claim series, review proposal/Name/manuscript, đặt deadline, pitch Board, quản lý hợp đồng/reprint/transfer (phía NXB), Board session (phía tổ chức họp), publication version |
| [`06-board-member.md`](06-board-member.md) | BOARD_MEMBER | Vote quyết định (serialize/hủy/format change/reprint/transfer), duyệt hợp đồng & payment, phiên họp (WebSocket `/board`) |
| [`07-super-admin.md`](07-super-admin.md) | SUPER_ADMIN | Quản lý user (tạo Editor/Board, ban/restore), app-config, audit log, voting-config, board-config, thống kê hệ thống |

3. Mỗi route trong file role có: mô tả mục đích trong flow, bảng field request/response (bắt buộc? kiểu/enum? ghi chú), danh sách lỗi có thể gặp, và narrative happy-path + unhappy-path khi flow có nhiều bước/state machine.
4. Enum trong bảng field ghi dạng `enum X` → tra giá trị đầy đủ ở `01-conventions-and-auth.md` §7.

## Vai trò & phân quyền (tổng quan)

Hệ thống có 5 role đăng nhập (`RoleCode`: `MANGAKA`, `ASSISTANT`, `EDITOR`, `BOARD_MEMBER`, `SUPER_ADMIN`) + Guest (không cần tài khoản). Một API có thể phục vụ nhiều role cùng lúc (vd `GET /series/:id` cả Mangaka/Editor/Board/Admin đều gọi được nhưng thấy dữ liệu theo scope khác nhau) — mỗi file role mô tả API đó **theo góc nhìn hành động của role mình**, không lặp lại toàn văn ở mọi file.

## Không nằm trong scope FE Web

- Module `ai` (AI service Python riêng) — chỉ được **gọi qua** route `POST /pages/:id/segment` trong `03-mangaka.md`, không có API riêng cho FE cấu hình model.
- `GET /health/*` — hạ tầng/observability, không phải API nghiệp vụ FE.
- `GET /metrics` — Prometheus. 🆕 **W5 (2026-08-02): nay yêu cầu header `x-api-key`** (khớp `API_KEY` nội bộ); thiếu/sai key → **401** `Error.InvalidMetricsApiKey` (so sánh constant-time, không lộ key). Chỉ scraper hạ tầng gọi — FE không đụng.
