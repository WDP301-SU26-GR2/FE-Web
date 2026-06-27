## **FE ↔ BE API Guide (BE-A đã hoàn thành)** 

Hướng dẫn FE gọi API theo **từng chức năng / flow nghiệp vụ** : gọi API nào, theo thứ tự nào, role nào. **Chỉ liệt kê API BE-A đã code + chạy thật.** Phần BE-B (contract, vote, board…) và A4/A5/notification chưa có → xem §9. Nguồn sự thật chi tiết (mọi field) = **Swagger UI tại** **`http://<host>:<port>/api`** . File này là bản đồ flow. 

## **0. Quy ước chung (đọc trước)** 

## **Base URL & CORS** 

Base URL = `http://<host>:<port>` (KHÔNG có prefix `/api` cho API; `/api` chỉ là Swagger UI). Dev port mặc định `4000` . CORS đang mở ( `enableCors()` ), FE gọi trực tiếp được. 

## **Response envelope (MỌI response đều bọc)** 

## **Thành công:** 

```
{ "success": true, "message": "Success", "data": { /* payload thật */ } }
```

→ FE luôn đọc dữ liệu ở **`res.data`** (không phải `res` trực tiếp). Nếu service trả message riêng thì `message` nằm top-level, `data` có thể `null` . 

## **Lỗi (** ⚠ **ĐÃ ĐỔI SHAPE — 2026-06-26):** 

```
// lỗi field-level (validation / có path): message LUÔN là string + errors[]
{
  "success": false,
  "statusCode": 422,
  "message": "Invalid email address",
  "errors": [ { "message": "Invalid email address", "path": "email" } ]
}
```

```
// nhiều field sai cùng lúc → message = "Validation failed"
{ "success": false, "statusCode": 422, "message": "Validation failed",
  "errors": [ { "message": "Invalid email address", "path": "email" },
              { "message": "Password too short", "path": "password" } ] }
```

```
// lỗi đơn / hệ thống (403, 409, 500…) → chỉ message string, KHÔNG có errors
```

```
{ "success": false, "statusCode": 403, "message": "Error.EmailNotVerified" }
```

**`message` LUÔN là string** (để hiển thị) — KHÔNG còn là mảng như bản cũ. 

- Khi có lỗi field-level, danh sách chi tiết nằm ở **`errors[]`** (mỗi item `{message, path}` ); FE map vào từng field theo `path` . Lỗi không có field thì **không** có `errors` . 

⚠ **Breaking change cho FE:** trước đây FE đọc `res.message` như mảng `{message,path}` . Giờ **field-level errors chuyển sang** **`res.errors`** ; `res.message` luôn là string. FE cần: hiển thị `res.message` ; nếu `res.errors` tồn tại thì map theo `path` . 

## **Status codes** 

|**Code**|**Ý nghĩa**|**FE xử lý**|
|---|---|---|
|200/201|OK (POST trả**201**là bình thường)|đọc<br>`data`|
|401|Chưa đăng nhập / token sai/hết hạn / refresh hết hạn|→ refresh token hoặc đẩy ra login|
|403|Sai role / chưa verify email / account banned / chưa đổi mật khẩu lần đầu|chặn UI theo<br>`message`|
|409|Trùng (email, chapterNumber…) / sai bước state machine|báo lỗi nghiệp vụ|



|**Code**|**Ý nghĩa**|**FE xử lý**|
|---|---|---|
|410|OTP hết hạn|cho xin OTP lại|
|422|Validation fail (Zod)|hiển thị lỗi theo<br>`path`|



## **Auth header** 

Endpoint **public** (đăng ký/login…) → không cần token. 

Còn lại → header `Authorization: Bearer <accessToken>` . 

Token: `accessToken` (ngắn hạn) + `refreshToken` (dài hạn, lưu DB). Access hết hạn → gọi `POST /auth/refresh-token` (xoay token). 

## **Roles** 

`MANGAKA · ASSISTANT · EDITOR · BOARD_MEMBER · SUPER_ADMIN` . Endpoint gắn `@Roles(...)` → sai role trả **403** . Endpoint không gắn role nhưng cần token → role nào cũng gọi được (miễn đăng nhập). 

## ⚠ **mustChangePassword (tài khoản Editor/Board do Admin tạo)** 

Login trả `data.mustChangePassword` . Nếu `true` → user **bị chặn mọi route nghiệp vụ (403)** cho tới khi đổi mật khẩu. 

- FE: thấy `mustChangePassword=true` → ép màn **đổi mật khẩu** → gọi `POST /auth/change-password` → xong mới cho dùng app. 

## **1. Epic A1 — Auth, Identity & Registration (Flow 11)** 

## **1.1. Đăng ký Mangaka/Assistant → kích hoạt (flow chính)** 

Thứ tự gọi: 

- `① POST /auth/register        → tạo user INACTIVE + gửi OTP qua email` 

- `② (user nhập OTP nhận trong email)` 

- `③ POST /auth/verify-email    → ACTIVE, dùng được hệ thống` 

- `④ POST /auth/login           → lấy accessToken + refreshToken` 

|**#**|**Method · Path**|**Public**|**Body**||
|---|---|---|---|---|
|①|`POST /auth/register`|✅|`{ email, name, phoneNumber, password, displayName, confirm_password, type }`<br>·<br>`type` ∈<br>`MANGAKA|ASSISTANT`· password ≥8, có hoa/thường/số|message ở**top-level**,<br>`d`|
|②|—||OTP gửi tới email (Resend)||
|③|`POST /auth/verify-email`|✅|`{ email, code }`(code = 6 số)|message ở**top-level**,<br>`d`|
|④|`POST /auth/login`|✅|`{ email, password }`|`data = { user{id,email`|



⚠ Các route trả "message-only" (register, verify-email, send-otp, logout, forgot-password, change-password) → envelope nâng `message` lên **toplevel** và **`data=null`** . FE đọc `res.message` (KHÔNG phải `res.data.message` ). Chỉ login/google/refresh/profile… mới có `data` thật. Xin lại OTP (hết hạn/chưa nhận): `POST /auth/send-otp-email { email, purpose }` · `purpose` ∈ `REGISTER\|FORGOT_PASSWORD` . _(Schema còn nhận_ _`SIGNING_CONTRACT` nhưng đó là của BE-B — chưa dùng.)_ 

Lỗi hay gặp: email đã tồn tại → 409; password yếu → 422; OTP sai → 422; OTP hết hạn → 410; login khi chưa verify → 403 `Error.EmailNotVerified` . 

## **1.2. Đăng nhập bằng Google (sau khi đã verify)** 

```
FE chạy Google Sign-In (GIS) → lấy Google ID token (JWT)
```

```
→ POST /auth/google { idToken } → nhận token y như login thường
```

`POST /auth/google` (public) body `{ idToken }` → `data` giống `/auth/login` . 

Điều kiện: tài khoản phải **đã tồn tại + đã verify (ACTIVE)** với email = email Google. Chưa đăng ký → 403 `Error.GoogleAccountNotRegistered` ; chưa verify → 403 `Error.EmailNotVerified` ; token sai → 401 `Error.InvalidGoogleToken` . 

Lần đầu Google login sẽ tự liên kết (lưu googleId). Không tạo tài khoản mới qua Google. 

## **1.3. Refresh & Logout** 

|**Method · Path**|**Public**|**Body**|**Ghi chú**|
|---|---|---|---|
|`POST /auth/refresh-token`|✅|`{ refreshToken }`|Cấp access mới +**xoay**refresh (revoke cũ). Hết hạn/đã dùng → 401|
|`POST /auth/logout`|✅|`{ refreshToken }`|Revoke refresh hiện tại|



## **1.4. Quên / Đổi mật khẩu** 

```
Quên MK:  ① POST /auth/send-otp-email { email, purpose:'FORGOT_PASSWORD' }
```

```
          ② POST /auth/forgot-password { email, code, newPassword, confirmNewPassword }  → revoke toàn bộ refresh
Đổi MK:   POST /auth/change-password { currentPassword, newPassword, confirmNewPassword }  (cần Bearer token)
```

`change-password` là route **cần đăng nhập** (Bearer). Dùng cho cả ép-đổi-lần-đầu (mustChangePassword). 

## **1.5. Super Admin — quản lý user (tạo / danh sách / chi tiết)** 

Tất cả route dưới đây **chỉ SUPER_ADMIN** (sai role → 403, chưa đăng nhập → 401). 

## **a) Tạo Editor/Board** 

|**Method · Path**|**Body**|**Trả về (**<br>**`data`)**|
|---|---|---|
|`POST /admin/users`|`{ email, name, phoneNumber, roleCode }`·<br>`roleCode` ∈<br>`EDITOR|BOARD_MEMBER`|`{ id, email, roleCode, temporaryPassword }`|



`temporaryPassword` trả **1 lần** → đưa cho user; user login lần đầu sẽ `mustChangePassword=true` . 

## **b) Danh sách user** 

|**Method · Path**|**Query (tất cả optional)**|**Trả về (**<br>**`data`)**|
|---|---|---|
|`GET /admin/users`|`roleCode`,<br>`status`,<br>`search`,<br>`limit`,<br>`offset`,<br>`includeDeleted`|`{ items: AdminUser[], total, limit, offset }`|



`roleCode` ∈ `SUPER_ADMIN\|MANGAKA\|ASSISTANT\|EDITOR\|BOARD_MEMBER` ; `status` ∈ `INACTIVE\|ACTIVE\|BANNED\|BLOCKED` (sai giá trị → 422). `search` = tìm **không phân biệt hoa thường** trên `email` / `name` / `displayName` . 

`limit` mặc định **20** , tối đa **100** ; `offset` mặc định **0** . Sắp xếp **mới nhất trước** ( `createdAt desc` ). `total` = tổng số bản ghi khớp filter (để FE tính số trang) — KHÔNG bị giới hạn bởi limit/offset. **Luôn loại chính admin đang gọi** khỏi danh sách (không trả về bản thân). 

Mặc định **ẩn user đã xoá mềm** ; muốn xem cả user đã xoá → `includeDeleted=true` . 

## **c) Chi tiết 1 user** 

|**Method · Path**|**Trả về (**<br>**`data`)**|
|---|---|
|`GET /admin/users/:id`|`AdminUser`|



Không tìm thấy (id sai / không tồn tại) → **404** `Error.UserNotFound` . (Chi tiết theo id KHÔNG loại self, KHÔNG ẩn user đã xoá — admin soi được hết.) 

**`AdminUser` shape** (cả list & detail; KHÔNG bao giờ có `password` ): 

```
{
```

```
  "id": "...", "email": "...", "name": "...", "displayName": "string|null",
```

```
  "phoneNumber": "...", "avatar": "string|null", "role": "MANGAKA",  // role code
```

- `"status": "ACTIVE", "emailVerified": true, "registrationType": "SELF_REGISTERED|ADMIN_CREATED",` 

- `"mustChangePassword": false, "createdAt": "ISO string"` 

```
}
```

## **1.6. Hồ sơ theo vai trò (profile) + xem danh bạ** 

**Quan trọng — luồng profile (đọc kỹ):** Mỗi MANGAKA/ASSISTANT có **1 profile (1:1)** , nhưng profile **KHÔNG được tạo tự động** lúc đăng ký. Nó chỉ ra đời khi user **PUT lần đầu** (upsert: chưa có → tạo, đã có → cập nhật). 

⇒ Ngay sau khi đăng ký/verify, user **chưa có profile** → `GET /me/...-profile` trả **404** `Error.ProfileNotFound` . Đây là trạng thái bình thường, KHÔNG phải lỗi hệ thống. 

## **Luồng FE nên làm (cho màn "Hồ sơ của tôi"):** 

- `① GET /me/mangaka-profile (hoặc assistant)` 

- `├─ 200 → đổ data vào form (đã có profile) → user sửa → PUT để lưu` 

- `└─ 404 Error.ProfileNotFound → hiện form TRỐNG (chưa tạo) → user nhập → PUT để TẠO` 

- `② PUT /me/mangaka-profile { ... }  → tạo (lần đầu) hoặc cập nhật → trả profile mới` 

- `③ Các lần sau: GET luôn 200.` 

**==> picture [555 x 188] intentionally omitted <==**

**----- Start of picture text -----**<br>
Method · Path Role Body / Ghi chú<br> { penName, genres[], experienceLevel?, bio?, portfolioFiles[] }   —  upsert  (tạo nếu chưa có, cập nhật<br> PUT /me/mangaka-profile  MANGAKA<br> penName  bắt buộc  (≥1 ký tự)<br> GET /me/mangaka-profile  MANGAKA chưa tạo →  404  Error.ProfileNotFound  ; đã có → 200<br> { specializations[], experienceLevel?, portfolioFiles[], availabilityStatus?, availabilityFrom?, ava<br> PUT /me/assistant-profile  ASSISTANT<br>(date = ISO string) —  upsert<br> GET /me/assistant-profile  ASSISTANT chưa tạo →  404  Error.ProfileNotFound  ; đã có → 200<br>(cần token,<br> GET /mangakas/:userId  role nào hồ sơ công khai theo userId (KHÔNG lộ email/phone) + reputation; user đó chưa có profile →  404<br>cũng được)<br> GET /assistants/:userId  (cần token) tương tự<br>**----- End of picture text -----**<br>


- **Upsert = ghi đè theo body:** PUT thay toàn bộ các field gửi lên. Field optional không gửi → set null/giữ default. Gửi `genres` / `portfolioFiles` = mảng đầy đủ (không phải patch từng phần). 

- `portfolioFiles` lưu **object key** (xem §2 upload), KHÔNG phải URL. Hiển thị: đổi key → signed GET (§2). 

- `specializations` ∈ `BACKGROUND/SCREENTONE/EFFECT_LINES/INKING/COLORING/LETTERING` ; `availabilityStatus` ∈ `AVAILABLE/BUSY/ON_LEAVE/UNAVAILABLE` (tra Swagger để chắc). 

- Profile trả thêm `reputationScore, ratingAvg, ratingCount, isRecommended` — **read-only** , hệ thống tự tính từ review (§6), FE không gửi lên. 

- ⚠ **Avatar:** response profile có field `avatar` (object key) nhưng **chưa có API cập nhật avatar** (body profile không nhận `avatar` , không có route đổi avatar) → hiện coi như read-only. 

## **2. Epic A7 — Upload/Download file (signed URL) — DÙNG CHUNG cho A2/A3** 

BE **không nhận bytes file** . FE xin URL có hạn rồi **PUT/GET thẳng lên Cloudflare R2** . DB chỉ lưu **object key** (chuỗi). 

## **Upload (3 bước)** 

```
① POST /uploads/sign { fileName, contentType, contentLength, assetType? }
```

- `→ { assetId, key, uploadUrl, requiredHeaders, expiresAt }` 

```
② PUT <uploadUrl>  (gửi file binary + đúng requiredHeaders, đặc biệt Content-Type)  → R2 trả 200
```

```
③ Lưu `key` để nhét vào API nghiệp vụ (characterDesigns[], namePages[].fileUrl, Page.originalFile, ...)
```

`contentType` ∈ `image/png · image/jpeg · image/webp · application/pdf` ; `contentLength` ≤ **15MB** . Sai → 422. 

- ⚠ Bước ② **bắt buộc gửi đúng** **`Content-Type`** đã ký (lấy trong `requiredHeaders` ), sai → R2 trả **403** (chữ ký lệch). KHÔNG tự set `Content-Length` (browser tự set). 

`assetType` (optional) ∈ `REFERENCE/BACKGROUND/SCREENTONE/BRUSH/OTHER` . 

**Download (ảnh private)** 

```
POST /uploads/sign-download { key } → { downloadUrl, expiresAt } → GET thẳng R2
```

- Quyền: chủ sở hữu file, hoặc EDITOR/BOARD_MEMBER/SUPER_ADMIN. Không có quyền → 403; key không tồn tại → 404. URL hết hạn ~10 phút → cần thì xin lại. 

## **3. Epic A2 — Series Proposal, Name & Pitch (Flow 1)** 

Luồng: Mangaka tạo proposal + Name mẫu → Editor review **proposal + Name** (loop) → duyệt cả 2 → Editor pitch lên Board. **Scope hiện dừng ở** **`PITCHED` .** Bước serial hóa (Board duyệt → SERIALIZED) thuộc BE-B (chưa có). 

## **Thứ tự gọi** 

```
(Mangaka)  ① upload file (§2) → có key
```

- `② POST /series/proposals { ..., characterDesigns:[key], namePages:[{pageNumber,fileUrl:key}] }` 

- `→ { series(DRAFT), name }` 

- `③ (sửa khi còn DRAFT) PUT /series/proposals/:id` 

- `④ POST /series/:id/submit            → proposal=PROPOSAL_REVIEW + name=SUBMITTED` 

```
(Editor)   ⑤ POST /series/:id/proposal/request-revision { reason }   (loop)
(Mangaka)  ⑥ POST /series/:id/proposal/resubmit                       (loop)
(Editor)   ⑦ POST /series/:id/proposal/approve
```

- `⑧ (Name) duyệt qua các route /series/:id/names/:nameId/* (xem dưới)` 

```
(Editor)   ⑨ POST /series/:id/pitch            → series=PITCHED  (chờ BE-B serialize)
```

## **Series endpoints** 

|**Series endpoints**||||
|---|---|---|---|
|**Method · Path**|**Role**|**Body**|**Ghi chú**|
|`POST /series/proposals`|MANGAKA|(xem §3 thứ tự<br>②)|tạo Series(DRAFT)+Proposal+Name; trả<br>`{series, name}`|
|`PUT /series/proposals/:id`|MANGAKA<br>(owner)|các field optional|chỉ sửa khi**DRAFT**|
|`POST /series/:id/submit`|MANGAKA|—|combined submit proposal+name|
|`POST /series/:id/proposal/request-revision`|EDITOR|`{ reason }`|→ PROPOSAL_REVISION|
|`POST /series/:id/proposal/resubmit`|MANGAKA|—|loop|
|`POST /series/:id/proposal/approve`|EDITOR|—|→ PROPOSAL_APPROVED|
|`POST /series/:id/reject`|EDITOR|`{ reason }`|Series → ABANDONED|
|`POST /series/:id/withdraw`|MANGAKA|`{ reason }`|Series → WITHDRAWN|
|`POST /series/:id/pitch`|EDITOR|—|Series → PITCHED|



## **Body tạo proposal:** 

```
 { title, genre?, demographic?, publicationType?(WEEKLY/MONTHLY/IRREGULAR), synopsis?, characterDesigns[](keys), targetDemographic?, estimatedLength
```

. 

## **Name lifecycle (nested) —** **`/series/:id/names/:nameId/...`** 

|**Method · Path**|**Role**|**Body**|
|---|---|---|
|`PUT  …/pages`|MANGAKA|`{ pages:[{pageNumber, fileUrl(key)}] }`|
|`POST …/submit`|MANGAKA|—|



|**Method · Path**|**Role**|**Body**|
|---|---|---|
|`POST …/request-revision`|EDITOR|`{ reason }`|
|`POST …/resubmit`|MANGAKA|—|
|`POST …/approve`|EDITOR|—|



Name status: `SUBMITTED → IN_REVIEW → REVISION → APPROVED` (mỗi resubmit `version++` ). 

_(Đa số dùng combined_ _`/series/:id/submit` ; các route name dùng khi cần thao tác riêng từng Name.)_ 

## **4. Epic A3 — Chapter Production (Flow 2)** 

Chỉ tạo Chapter từ **Name đã APPROVED** . Luồng: tạo chapter → upload page → mark composite → submit → Editor review → publish. **Defer (chưa chặn):** gate Contract khi publish (BE-B), co-owner approve (BE-B), tự động hóa transition theo Task (A4). 

## **Thứ tự gọi** 

```
(Mangaka) ① POST /chapters { seriesId, nameId, chapterNumber, title? }   (Name phải APPROVED)
(Editor)  ② PUT  /chapters/:id/schedule { originalDeadline?, currentDeadline? }   (đặt deadline)
(Mangaka) ③ upload page file (§2) → key
```

- `④ POST /chapters/:id/pages { pageNumber, originalFile:key }    (page đầu → Manuscript IN_PRODUCTION)` 

- `⑤ PATCH /pages/:pageId { compositeFile?:key, status? }          (đẩy page tới COMPLETED)` 

- `⑥ POST /chapters/:id/manuscript/mark-composite-ready` 

- `⑦ POST /chapters/:id/manuscript/submit                          (guard: MỌI page COMPLETED)` 

```
(Editor)  ⑧ POST /chapters/:id/manuscript/request-revision { reason? }    (loop, kèm annotation §5)
(Mangaka) ⑨ POST /chapters/:id/manuscript/resubmit                        (loop)
```

```
(Editor)  ⑩ POST /chapters/:id/manuscript/approve     → READY_FOR_PRINT
          ⑪ POST /chapters/:id/publish                → PUBLISHED
```

**==> picture [553 x 291] intentionally omitted <==**

**----- Start of picture text -----**<br>
Method · Path Role Body / Query<br> POST /chapters  MANGAKA  { seriesId, nameId, chapterNumber, title? }<br> GET /chapters?seriesId=  (token) list theo series<br> GET /chapters/:id  (token) chi tiết (kèm   manuscriptStatus  ,   schedule  )<br> PUT /chapters/:id/schedule  EDITOR  { originalDeadline?, currentDeadline? }   (ISO datetime)<br> PATCH /chapters/:id/schedule/extend  EDITOR  { newDeadline, reason? }   (ISO)<br> POST /chapters/:id/pages  MANGAKA  { pageNumber, originalFile(key) }<br> GET /chapters/:id/pages  (token) list page<br> PATCH /pages/:pageId  MANGAKA  { compositeFile?(key), status?(NOT_STARTED/IN_PROGRESS/COMPOSITE_READY/COMPL<br> POST /chapters/:id/manuscript/mark-composite-ready  MANGAKA —<br> POST /chapters/:id/manuscript/submit  MANGAKA — (cần mọi page COMPLETED)<br> POST /chapters/:id/manuscript/request-revision  EDITOR  { reason? }<br> POST /chapters/:id/manuscript/resubmit  MANGAKA —<br> POST /chapters/:id/manuscript/approve  EDITOR —<br> POST /chapters/:id/publish  EDITOR — (chỉ khi READY_FOR_PRINT)<br>**----- End of picture text -----**<br>


`Chapter.status` (DRAFT/IN_PRODUCTION/PUBLISHED) là **dẫn xuất** từ Manuscript; xem `manuscriptStatus` để biết bước chi tiết. Sai bước → 409; trùng chapterNumber → 409; Name chưa approved → 422. 

## **5. Annotation / Markup (A-CHP-07, dùng chung)** 

Markup feedback trên trang (Editor↔Mangaka khi review manuscript; sau này Mangaka↔Assistant). Tách riêng khỏi luồng request-revision (revision chỉ đổi trạng thái; markup tạo qua đây). 

|**Method · Path**|**Role**|**Body / Query**|
|---|---|---|
|`POST /annotations`|_(token,_<br>_mọi_<br>_role)_|`{ targetType, targetId, annotationType, coordinates?, content?, reviewStage?, taskId? }`|
|`GET /annotations?targetType=&targetId=`|_(token)_|**bắt buộc cả 2 param**(thiếu → 422)|
|`PATCH /annotations/:id/resolve`|_(token)_|toggle<br>`isResolved`|
|`DELETE /annotations/:id`|_(token,_<br>_author-_<br>_only)_|chỉ người tạo xóa được|



`annotationType` ∈ `TEXT · HIGHLIGHT · DRAWING` . `targetType` / `reviewStage` là enum → xem Swagger để lấy giá trị chính xác. `coordinates` là object tự do (toạ độ vùng). 

## **6. Reviews & Reputation (A-AUTH-07)** 

Sau khi hợp tác, đánh giá 1–5 sao → cập nhật `ratingAvg/reputationScore` trên profile; đạt ngưỡng → `isRecommended=true` (ưu tiên trong tìm kiếm/gợi ý). Reputation hiển thị ở `GET /mangakas|assistants/:userId` (§1.6). 

|**Method · Path**|**Role**|**Body / Query**|
|---|---|---|
|`POST /assistant-reviews`|MANGAKA|`{ assistantId, rating(1-5), comment?, studioAssignmentId?, seriesId? }`|
|`GET /assistant-reviews?assistantId=&limit=&offset=`|_(token)_|list review của 1 assistant|
|`POST /mangaka-reviews`|EDITOR|`{ mangakaId, rating(1-5), comment?, seriesId? }`|
|`GET /mangaka-reviews?mangakaId=&limit=&offset=`|_(token)_|list review của 1 mangaka|



Re-review cùng cặp (reviewer→target) = **update** (không tạo trùng). 

## **7. Bản đồ nhanh: chức năng → endpoint chính** 

|**7. Bản đồ nhanh:**|**chức năng → endpoint chính**||
|---|---|---|
|**Chức năng**|**Endpoint khởi đầu**|**Role**|
|Đăng ký → kích hoạt|`register → verify-email → login`|Guest|
|Login Google|`POST /auth/google`|Guest (account đã verify)|
|Tạo Editor/Board|`POST /admin/users`|SUPER_ADMIN|
|Danh sách / chi tiết user|`GET /admin/users`,<br>`GET /admin/users/:id`|SUPER_ADMIN|
|Hồ sơ + danh bạ|`GET→404 thì PUT`<br>`/me/*-profile`,<br>`/mangakas/:id`&<br>`/assistants/:id`|theo role|
|Upload ảnh/file|`POST /uploads/sign`→ PUT R2|mọi user|
|Nộp series mới|`POST /series/proposals`→<br>`…/submit`→<br>`…/pitch`|MANGAKA→EDITOR|
|Sản xuất chapter|`POST /chapters`→ … →<br>`…/publish`|MANGAKA→EDITOR|
|Markup review|`POST /annotations`|mọi user|
|Đánh giá uy tín|`POST /assistant-reviews`/<br>`/mangaka-reviews`|MANGAKA / EDITOR|



## **8. Checklist tích hợp cho FE** 

Luôn đọc `res.data` ; hiển thị lỗi qua `res.message` (LUÔN string); nếu có `res.errors[]` ( `{message,path}` ) thì map vào từng field theo `path` . Gắn `Authorization: Bearer <accessToken>` cho mọi route không-public. 

401 → thử `refresh-token` 1 lần; vẫn 401 → về login. 

Sau login, nếu `mustChangePassword=true` → ép đổi mật khẩu trước. 

Upload: PUT đúng `Content-Type` trong `requiredHeaders` ; lưu `key` (không lưu signed URL). Date gửi lên dạng **ISO string** ( `2026-06-25T10:00:00Z` ). 

## **9. CHƯA CÓ (đừng gọi — sẽ bổ sung)** 

- **Notifications API** (A-NOT-02/03): `GET /notifications` , mark-read — **chưa có** (mới có service nội bộ). 

- **A4 Task & Assistant Directory** (Flow 3/9): phân vùng Region, giao Task, danh bạ trợ lý tìm kiếm, StudioAssignment, mời cộng tác — **chưa code** . **A5 Deadline Negotiation** (Flow 10): thương lượng deadline (counter/agree/escalate) — **chưa code** (mới có set/extend schedule ở §4). 

- **BE-B (toàn bộ)** : Contract/Payment, Reprint, Transfer, Survey/Voting/Ranking, Board Decision, PublicationVersion — **module khác phụ trách** , chưa có. Vì vậy A2 dừng ở `PITCHED` , A3 publish chưa gate Contract. 

- **Series/Name read API (A2) — CHƯA CÓ:** không có `GET /series` , `GET /series/:id` , cũng không có GET độc lập cho Name. FE hiện chỉ lấy được series/name từ **response của** **`POST /series/proposals`** (trả `{series, name}` ) hoặc gián tiếp qua các route chapter ( `GET /chapters?seriesId=` , `GET /chapters/:id` có `seriesId/nameId` ). Nếu FE cần màn **danh sách series / chi tiết series / danh sách proposal của tôi** thì cần BE-A bổ sung read API (sẽ thêm sau). 

Khi các phần trên xong sẽ cập nhật file này. Mọi enum/field chi tiết: tra **Swagger** **`/api`** . 

