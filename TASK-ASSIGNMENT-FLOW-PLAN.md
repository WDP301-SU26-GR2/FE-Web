# Kế hoạch triển khai luồng giao task Mangaka → Assistant

> Tài liệu handoff dành cho AI agent triển khai frontend trong repo `mangaka-web`.
>
> Phiên bản: 1.0 — 2026-07-15  
> Phạm vi: Mangaka tạo/giao/quản lý task, Assistant nhận/start/submit, Mangaka review task.  
> Nguồn sự thật nghiệp vụ: [`FE-API-Guide-v3.md`](./FE-API-Guide-v3.md) §0, §1.3–1.5, §5, §6, §7, §14 và [`swagger.json`](./swagger.json).  
> Quy ước code bắt buộc: [`AGENTS.md`](./AGENTS.md) và [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 0. Mục tiêu và cách sử dụng tài liệu

AI agent nhận task này phải triển khai một luồng hoàn chỉnh, có thể sử dụng thật:

1. Mangaka chỉ giao task cho Assistant đang có `StudioAssignment` còn hiệu lực.
2. Mangaka chọn đúng page, có thể chọn region, loại công việc, deadline, priority và asset tham khảo.
3. Assistant xem task, bắt đầu, upload file kết quả lên R2 và submit.
4. Mangaka xem bản nộp, approve hoặc yêu cầu sửa.
5. Task chuyển trạng thái đúng state machine và phản ánh lại trên UI mà không cần reload toàn trang.
6. UI dùng được trên desktop/mobile, tiếng Việt/English, light/dark mode, keyboard và screen reader.

Tài liệu này là kế hoạch thực thi. Agent không được tự thêm field API, enum hay transition không tồn tại trong Swagger/guide.

### Definition of Done tổng

- Có hai điểm mở cùng một Task Composer:
  - từ Studio: đã biết Assistant, chọn series/chapter/page;
  - từ Publication Workbench: đã biết series/chapter/page, chọn Assistant.
- Có Mangaka task board và task detail/review.
- Có Assistant task list và task detail/start/upload/submit.
- Có deep-link `TASK_*` đến đúng task detail theo role.
- Không hiển thị raw ObjectId làm nội dung chính nếu có dữ liệu thân thiện hơn; khi API chỉ trả ID thì hiển thị short ID kèm label rõ ràng.
- Không hiển thị raw `Error.PascalCase`.
- Không hard-code màu Tailwind palette hoặc hex trong component.
- `npm run typecheck`, `npm run lint`, `npm run prettier`, `npm run build` đều pass.

---

## 1. Ràng buộc không được phá vỡ

### 1.1. Kiến trúc

- Mangaka task code thuộc `app/features/mangaka/assistants/` vì Swagger tag `task` map vào slice này.
- Assistant task code thuộc `app/features/assistant/tasks/`.
- `features/mangaka/*` không import `features/assistant/*` và ngược lại.
- Component dùng chung hai role chỉ được đưa vào `shared/` nếu thật sự generic.
- Route file phải mỏng, chỉ bind loader/action nếu có và render page-level component từ role barrel.
- Không sửa tay file trong `app/api/model/` hoặc `app/api/operations/`.
- Không tạo `tailwind.config.*`, không cài `react-router-dom`.

### 1.2. API calling trong trạng thái auth hiện tại

Repo hiện lưu access token trong `localStorage`; authenticated SSR loader không thể tự lấy token trên server. Đồng thời tài liệu nội bộ có hai chỉ dẫn khác nhau:

- `AGENTS.md` có chỗ yêu cầu route loader/action;
- `ARCHITECTURE.md` cho phép route loader/action **hoặc feature hook** client-side.

Với phạm vi này, agent phải:

- gọi Orval function trong co-located feature hooks;
- không gọi API trực tiếp trong JSX render hoặc event handler viết inline;
- không tự migrate auth sang cookie trong task này;
- giữ mọi mutation trong hook chuyên trách và refresh/cache update sau thành công.

Nếu repo đã được migrate sang cookie trước khi agent bắt đầu, agent có thể chuyển reads sang loader và mutations sang action/useFetcher, nhưng không trộn hai kiến trúc trong cùng một feature.

### 1.3. Response và error

- Luôn đọc payload từ `res.data`.
- Dùng `extractApiErrorMessage(err, fallback)` sau khi helper được đặt ở shared layer.
- Map error code sang i18n; không render trực tiếp `Error.AssistantNotHired`.
- `422` là validation error, `409` là state transition/business conflict, `403` là role/scope.

### 1.4. Theme và i18n

- Mọi màu đi qua token trong `app/styles/theme.css` và đăng ký tại `app/styles/app.css`.
- Thêm key đồng thời vào EN và VI.
- Namespace Mangaka là `mangaka`, namespace Assistant là `assistant`.
- Mọi datetime từ API là UTC; hiển thị theo locale của i18next, input local phải convert sang ISO UTC trước khi gửi.

---

## 2. Nghiệp vụ nguồn sự thật

### 2.1. Điều kiện để giao task

Task chỉ được tạo khi tất cả điều kiện sau đúng:

- caller là `MANGAKA` và sở hữu series/page;
- page tồn tại;
- chapter không ở trạng thái hold;
- Assistant có `StudioAssignment.status === 'ACTIVE'`;
- `StudioAssignment.activeNow === true`, tức thời điểm hiện tại nằm trong `[hireStart, hireEnd]`;
- `taskType` thuộc enum `Specialization`;
- mọi `assetIds` tồn tại;
- nếu chọn region, region thuộc đúng page.

Không dùng `status === ACTIVE` làm điều kiện duy nhất. Assignment có thể ACTIVE nhưng chưa tới `hireStart` hoặc đã qua `hireEnd`.

### 2.2. Enum liên quan

`Specialization`:

- `BACKGROUND`
- `SCREENTONE`
- `EFFECT_LINES`
- `INKING`
- `COLORING`
- `LETTERING`

`TaskStatus`:

- `ASSIGNED`
- `IN_PROGRESS`
- `SUBMITTED`
- `UNDER_REVIEW`
- `APPROVED`
- `REVISION_REQUESTED`
- `ON_HOLD`
- `CANCELLED`

`TaskVersionReviewStatus`:

- `PENDING`
- `APPROVED`
- `REVISION_REQUESTED`

`StudioAssignmentStatus`:

- `ACTIVE`
- `COMPLETED`
- `TERMINATED`

### 2.3. State machine và action owner

| Trạng thái hiện tại                                        | Actor     | Action UI         | API                                | Kết quả mong đợi             |
| ---------------------------------------------------------- | --------- | ----------------- | ---------------------------------- | ---------------------------- |
| `ASSIGNED`                                                 | Assistant | Bắt đầu           | `POST /tasks/:id/start`            | `IN_PROGRESS`                |
| `IN_PROGRESS`                                              | Assistant | Upload + nộp      | `POST /tasks/:id/submit`           | `SUBMITTED`, tạo version mới |
| `SUBMITTED`                                                | Mangaka   | Duyệt             | `POST /tasks/:id/approve`          | `APPROVED`                   |
| `SUBMITTED`                                                | Mangaka   | Yêu cầu sửa       | `POST /tasks/:id/request-revision` | `REVISION_REQUESTED`         |
| `REVISION_REQUESTED`                                       | Assistant | Bắt đầu sửa       | `POST /tasks/:id/start`            | `IN_PROGRESS`                |
| `IN_PROGRESS`, `ASSIGNED`, `REVISION_REQUESTED`, `ON_HOLD` | Mangaka   | Giao lại          | `POST /tasks/:id/reassign`         | `ASSIGNED` cho Assistant mới |
| Non-terminal                                               | Mangaka   | Hủy               | `POST /tasks/:id/cancel`           | `CANCELLED`                  |
| `APPROVED`, `CANCELLED`                                    | —         | Không có mutation | —                                  | terminal                     |

Không tự tạo transition `SUBMITTED → UNDER_REVIEW` ở client. `UNDER_REVIEW` là trạng thái backend có thể trả; UI chỉ hiển thị và khóa action nếu API không định nghĩa mutation tương ứng.

### 2.4. Cascade production

- Mọi task của page đã `SUBMITTED` → Page có thể chuyển `COMPOSITE_READY` theo cascade backend.
- Mọi task của page đã `APPROVED` → Page `COMPLETED`.
- Đủ điều kiện toàn chapter → Manuscript tiến trạng thái theo Flow 2.
- Sau approve/revision/cancel, phải refresh task và dữ liệu page/chapter liên quan để UI phản ánh cascade.

---

## 3. API matrix phải dùng

Chỉ import Orval-generated functions từ đúng tag folder.

### 3.1. Studio và dữ liệu chọn Assistant

| Nhu cầu                         | Endpoint                      | Ghi chú                                                               |
| ------------------------------- | ----------------------------- | --------------------------------------------------------------------- |
| Assignment của Mangaka          | `GET /studio-assignments`     | Dùng `activeNow=true` cho danh sách có thể nhận task                  |
| Assignment detail               | `GET /studio-assignments/:id` | Verify lại trước submit nếu dữ liệu đã cũ                             |
| Assistant directory/profile map | `GET /assistants`             | Dùng tên/avatar; không phụ thuộc vào pool để kiểm tra quyền giao task |
| Studio progress                 | `GET /studio/overview`        | Tab Tiến độ, không thay thế task list                                 |

### 3.2. Chọn context sản xuất

| Nhu cầu             | Endpoint                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| Series của Mangaka  | `GET /series`                                                          |
| Chapter theo series | `GET /chapters?seriesId=...`                                           |
| Pages của chapter   | `GET /chapters/:id/pages`                                              |
| Regions của page    | `GET /pages/:id/regions`                                               |
| Tạo/sửa/xóa region  | `POST /pages/:id/regions`, `PATCH /regions/:id`, `DELETE /regions/:id` |

AI segmentation là enhancement sau MVP:

- `POST /pages/:id/segment`
- poll `GET /ai-jobs/:id`
- `POST /ai-jobs/:id/apply`

AI lỗi/503 không được làm nghẽn giao task; luôn cho phép chọn whole-page hoặc region manual.

### 3.3. Task

`POST /tasks` body chính xác:

```ts
type CreateTaskInput = {
  pageId: string
  regionId?: string
  assistantId: string
  taskType: 'BACKGROUND' | 'SCREENTONE' | 'EFFECT_LINES' | 'INKING' | 'COLORING' | 'LETTERING'
  deadline?: string
  priority?: number
  assetIds?: string[]
}
```

Không gửi `undefined`, field lạ, assistant name, seriesId, chapterId hoặc instruction vì API hiện không nhận các field đó.

Các endpoint còn lại:

- `POST /tasks/batch`, tối đa 50, all-or-nothing;
- `GET /tasks` với filter `pageId`, `regionId`, `assistantId`, `status`, `limit`, `offset`;
- `GET /tasks/:id`;
- `PATCH /tasks/:id` chỉ sửa `assetIds`, `deadline`, `priority`;
- `POST /tasks/:id/start`;
- `POST /tasks/:id/submit` body `{ file: r2Key }`;
- `POST /tasks/:id/approve`;
- `POST /tasks/:id/request-revision` body `{ reviewerNote }`;
- `POST /tasks/:id/reassign` body `{ assistantId }`;
- `POST /tasks/:id/cancel` body `{ reason? }`.

### 3.4. Upload R2

Reference attachment:

1. `POST /uploads/sign` với file metadata + `assetType` phù hợp.
2. PUT bytes trực tiếp lên `uploadUrl` với `requiredHeaders`.
3. Dùng `assetId` trong `CreateTaskInput.assetIds`.

Assistant result:

1. Upload theo cùng presigned flow.
2. Dùng `key` trong `POST /tasks/:id/submit { file: key }`.

Không gửi bytes qua task API.

---

## 4. Giới hạn API hiện tại — agent phải biết trước

Task DTO hiện chỉ trả `pageId`, `regionId`, `assistantId`, task type/status/deadline/priority, `assetIds` và versions. Nó không trả:

- series title;
- chapter number/title;
- page number/originalFile;
- region coordinates/type;
- attachment key/name từ `assetIds`;
- instruction/description do Mangaka nhập.

Do đó agent **không được**:

- tự giả lập series/chapter/page context trong production;
- dùng `assetId` như R2 key;
- gọi sign-download bằng `assetId`;
- thêm `description` vào request;
- tạo N+1 traversal không được API/role cho phép chỉ để tìm page từ `pageId`.

Fallback bắt buộc khi chỉ có DTO hiện tại:

- hiển thị task type làm heading chính;
- hiển thị short task ID và short page ID dưới label rõ ràng;
- hiển thị số lượng reference assets, không render nút download nếu không có key;
- task được mở từ Publication Workbench có thể dùng context đang có tại màn đó, nhưng không persist context giả vào task.

Backend enhancement khuyến nghị, nhưng nằm ngoài core FE task:

- enrich Task DTO với series/chapter/page/region summaries;
- trả attachment metadata;
- thêm `instructions`;
- thêm filter task theo series/chapter;
- gắn `studioAssignmentId` hoặc enforce assignment theo series.

Nếu Swagger được cập nhật, agent phải chạy Orval rồi điều chỉnh plan theo generated types; không viết type tay thay cho Swagger.

---

## 5. Kiến trúc thông tin và route

### 5.1. Mangaka Studio

Giữ route:

```text
/dashboard/mangaka/studio
```

Trang gồm ba tab dùng query param để giữ state và deep-link:

```text
/dashboard/mangaka/studio?tab=team
/dashboard/mangaka/studio?tab=tasks
/dashboard/mangaka/studio?tab=progress
```

- `team`: StudioAssignment cards.
- `tasks`: Mangaka task board.
- `progress`: dữ liệu `GET /studio/overview`.

Thêm task detail:

```text
/dashboard/mangaka/studio/tasks/:taskId
```

### 5.2. Assistant

Giữ task list:

```text
/dashboard/assistant/tasks
```

Thêm task detail:

```text
/dashboard/assistant/tasks/:taskId
```

### 5.3. Publication Workbench

Giữ:

```text
/publish/:seriesId/:chapterId
```

Không tạo route riêng cho composer. Dùng dialog/drawer có props preset context.

### 5.4. Route registration

Thêm vào `app/routes.ts` đúng role layout:

```ts
route('studio/tasks/:taskId', 'routes/mangaka/task-detail.tsx')
route('tasks/:taskId', 'routes/assistant/task-detail.tsx')
```

Route modules chỉ import page-level component từ:

- `~/features/mangaka`
- `~/features/assistant`

---

## 6. UI/UX direction

### 6.1. Cảm giác thị giác

Thiết kế cần cho cảm giác một production studio chuyên nghiệp:

- layout thoáng, hierarchy rõ;
- card nền `bg-card`, border `border-border`, shadow nhẹ;
- primary CTA nổi bật nhưng mỗi vùng chỉ có tối đa một CTA chính;
- status dùng badge nhỏ, không dùng cả card làm màu trạng thái;
- artwork/page preview được ưu tiên không gian hơn metadata;
- ID kỹ thuật đặt ở secondary text, copy được nhưng không chiếm heading;
- chuyển động chỉ dùng cho loading/progress/dialog, tôn trọng `prefers-reduced-motion`;
- light/dark dùng cùng semantic token, không viết palette riêng trong component.

Không dùng gradient palette tùy ý, glassmorphism dày, neon, hoặc quá nhiều badge màu.

### 6.2. Responsive

- Desktop ≥ 1024px: composer là dialog tối đa khoảng `max-w-5xl`, hai cột ở bước context.
- Tablet: một cột, sticky action footer.
- Mobile: composer full-screen sheet, header/action footer sticky, tap target tối thiểu 44px.
- Task board desktop có list/table hybrid; mobile chuyển thành stacked cards, không ép horizontal scroll cho nội dung chính.

### 6.3. Studio page wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Studio                                  [Mở danh bạ trợ lý]        │
│ Quản lý đội ngũ, công việc và tiến độ sản xuất                     │
├────────────────────────────────────────────────────────────────────┤
│ [Đội ngũ 4] [Công việc 18] [Tiến độ]                               │
├────────────────────────────────────────────────────────────────────┤
│  ACTIVE NOW 3   CHỜ REVIEW 4   SẮP TRỄ 2   HOÀN THÀNH TUẦN NÀY 8 │
├────────────────────────────────────────────────────────────────────┤
│ Filter/search                                                     │
│ ┌ Assistant card ────────────┐ ┌ Assistant card ────────────────┐ │
│ │ Avatar  Tên       Active   │ │ Avatar  Tên        Starts soon │ │
│ │ [Background] [Inking]      │ │ [Lettering]                    │ │
│ │ Series / hire window       │ │ Series / hire window           │ │
│ │              [Giao task]   │ │      Giao task bị khóa         │ │
│ └────────────────────────────┘ └─────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### 6.4. Task Composer wireframe

```text
┌──────────────────────────────────────────────────────────────────┐
│ Giao task cho Nguyễn An                                  [Đóng] │
│ 1 Ngữ cảnh ───── 2 Công việc ───── 3 Xác nhận                    │
├──────────────────────────────────────────────────────────────────┤
│ Bên trái / phía trên                  Bên phải / phía dưới        │
│ [Series ▼] [Chapter ▼]                Page preview                │
│ [Page grid: 01 02 03 ...]             Region overlays             │
│ [Cả trang] hoặc [Region #...]         Selected context summary    │
├──────────────────────────────────────────────────────────────────┤
│                                      [Quay lại] [Tiếp tục]        │
└──────────────────────────────────────────────────────────────────┘
```

Task Composer có ba bước, nhưng giữ toàn bộ state khi quay lại.

### 6.5. Bước 1 — Ngữ cảnh

Nếu mở từ Studio:

1. Assistant đã preset từ assignment card.
2. Nếu assignment có `seriesId`, preset series; không tự lock nếu backend chưa xác nhận đây là hard scope, nhưng hiển thị “Series từ lời mời”.
3. Chọn chapter.
4. Chọn page bằng thumbnail grid.
5. Chọn whole-page hoặc một existing region.

Nếu mở từ Workbench:

1. Series/chapter/page preset và readonly.
2. Chọn Assistant từ assignment `activeNow=true`.
3. Chỉ enable task type thuộc `assignedTaskTypes` của assignment được chọn.

Page card cần hiển thị:

- thumbnail bằng `SignedImage`;
- `Trang {{n}}`;
- page status;
- task count nếu đã fetch `GET /tasks?pageId=...`;
- selected ring dùng `ring-ring`, không hard-code màu.

Region picker:

- preview original page;
- overlay box theo coordinates;
- click box hoặc chọn trong danh sách song song;
- selected region có label `RegionType`;
- luôn có option “Cả trang” (`regionId` omitted);
- nếu page chưa có original file, không cho region visual, nhưng vẫn có thể whole-page nếu backend chấp nhận page đó.

### 6.6. Bước 2 — Công việc

Fields:

1. `taskType`: segmented cards/chips, bắt buộc.
2. `deadline`: `datetime-local`, optional.
3. `priority`: numeric input hoặc compact stepper; helper text “Số nhỏ hơn = ưu tiên cao hơn”. Không tự đặt nhãn Cao/Vừa/Thấp nếu product chưa định nghĩa mapping.
4. Reference attachments: optional multi-file uploader.

Không hiển thị ô “Mô tả công việc” vì API không nhận field này. Có thể hiển thị non-editable notice nhỏ: “API hiện xác định công việc qua loại task, page/region và tài liệu tham khảo.”

Attachment uploader:

- accept PNG/JPEG/WEBP/PDF;
- max 15MB/file;
- show file name, size, type, progress, retry/remove;
- gọi sign/upload ngay khi file được thêm hoặc ở lúc submit, nhưng chỉ append `assetId` sau PUT thành công;
- nếu một file fail, không submit task cho tới khi user remove hoặc retry;
- không expose upload URL/key.

### 6.7. Bước 3 — Xác nhận

Summary card:

- Assistant avatar/name;
- series/chapter/page context nếu composer đang có;
- whole-page hoặc region;
- task type;
- deadline ở local time;
- priority;
- attachment count/file names từ local composer state.

CTA:

- secondary: Quay lại;
- primary: Giao task;
- khi submit: disable toàn form, spinner + “Đang giao task…”;
- không đóng dialog khi API fail;
- thành công: toast, đóng dialog, clear draft, refresh task/assignment/page context.

### 6.8. Mangaka task board

Desktop dùng list/table hybrid thay vì Kanban mặc định, vì backend phân trang và chỉ filter một status:

```text
┌ Task type / Page ──┬ Assistant ┬ Deadline ┬ Status ┬ Actions ┐
│ Background         │ Nguyễn An │ 18 Jul   │ Review │ Xem     │
│ Page #a1b2c3d4     │           │          │        │         │
└────────────────────┴───────────┴──────────┴────────┴─────────┘
```

Top filters:

- search client-side trên dữ liệu hiện có: short IDs/assistant display name;
- status server-side;
- assistantId server-side;
- pagination;
- quick filter “Cần review” phải chạy hai query tuần tự hoặc UI riêng cho `SUBMITTED` và `UNDER_REVIEW`; không gửi array status nếu Swagger không hỗ trợ.

Task detail Mangaka:

- header task type + status badge;
- metadata deadline/priority/page/region/assistant;
- reference asset count;
- version timeline mới nhất trước;
- preview version file qua signed URL;
- action footer đúng state.

Review UI:

- `SUBMITTED`: primary “Duyệt”, secondary destructive-outline “Yêu cầu sửa”;
- revision dialog bắt buộc reviewer note 1–1000;
- approve cần confirmation ngắn vì có cascade Page/Manuscript;
- reassign chỉ hiển thị ở status API cho phép;
- cancel cần optional reason, confirmation rõ tác động và không hiện ở terminal task.

### 6.9. Assistant task list và detail

List ưu tiên theo:

1. overdue/near deadline;
2. priority số nhỏ;
3. createdAt mới hơn.

Không đổi server order nếu backend đã cung cấp business order mà guide chưa nêu; sorting client chỉ áp trên page hiện tại và cần ghi chú.

Task card:

- heading: translated task type;
- status badge;
- deadline relative + absolute tooltip;
- priority;
- version count;
- Page short ID;
- action duy nhất theo status: Start hoặc mở detail.

Assistant detail:

- `ASSIGNED`: CTA “Bắt đầu task”.
- `IN_PROGRESS`: result uploader + “Nộp kết quả”.
- `REVISION_REQUESTED`: hiển thị reviewer note gần nhất và CTA “Bắt đầu sửa”.
- `SUBMITTED`/`UNDER_REVIEW`: read-only “Đang chờ Mangaka review”.
- `APPROVED`: success summary.
- `ON_HOLD`: explanation từ statusReason, không có submit.
- `CANCELLED`: reason, read-only.

Result uploader phải thay hoàn toàn text input raw key hiện tại:

- file picker/drag-drop;
- preview image hoặc PDF metadata;
- upload R2;
- submit `key` nhận từ sign response;
- không gọi submit nếu upload chưa hoàn tất;
- nếu submit fail sau upload thành công, giữ `key` trong component state để retry mà không upload lại trong cùng session.

### 6.10. Batch assignment

Chỉ làm sau single-task flow pass acceptance criteria.

UX:

- multi-select tối đa 50 page/region items;
- common Assistant/task type/deadline/priority/attachments ở MVP batch;
- confirmation hiển thị tổng số task;
- dùng `POST /tasks/batch` một lần;
- API all-or-nothing: nếu fail, không đánh dấu item nào thành công;
- error chỉ ra toàn batch fail; nếu backend trả field path, focus item tương ứng.

---

## 7. Component/file plan

### 7.1. Shared foundation

```text
app/shared/ui/
├── status-badge.tsx             # generic tone, không biết TaskStatus
├── file-dropzone.tsx            # generic File[], validation UI
└── progress-bar.tsx             # nếu chưa có

app/shared/lib/api/
└── extract-api-error.ts         # chuyển từ features/auth để shared không import feature

app/shared/lib/upload/
├── upload-to-r2.ts              # giữ API cũ nếu call sites đang dùng
└── upload-asset-to-r2.ts        # trả { assetId, key }
```

`StatusBadge` nhận semantic tone như `neutral | info | warning | success | destructive`; status-to-tone mapping vẫn nằm trong từng role feature.

### 7.2. Mangaka assistants slice

```text
app/features/mangaka/assistants/
├── components/
│   ├── assign-task-dialog.tsx
│   ├── task-composer-stepper.tsx
│   ├── task-context-picker.tsx
│   ├── page-picker.tsx
│   ├── region-picker.tsx
│   ├── assistant-assignment-picker.tsx
│   ├── task-fields.tsx
│   ├── task-attachment-uploader.tsx
│   ├── task-confirmation.tsx
│   ├── mangaka-task-card.tsx
│   ├── task-version-timeline.tsx
│   ├── request-task-revision-dialog.tsx
│   ├── reassign-task-dialog.tsx
│   └── cancel-task-dialog.tsx
├── lib/
│   ├── task-status-meta.ts
│   ├── task-form-validation.ts
│   └── task-error-key.ts
├── use-task-composer-data.ts
├── use-assign-task.ts
├── use-mangaka-tasks.ts
├── use-mangaka-task-detail.ts
├── use-review-task.ts
├── mangaka-task-board.tsx
└── mangaka-task-detail-page.tsx
```

Không đặt API operation trong leaf presentation components.

### 7.3. Mangaka studio/publication integration

```text
app/features/mangaka/studio/
├── my-studio-page.tsx            # tabs + compose sections
├── studio-summary-cards.tsx
├── studio-team-tab.tsx
├── studio-tasks-tab.tsx
└── studio-progress-tab.tsx

app/features/mangaka/publication/components/
├── pages-section.tsx             # compose page cards
└── page-production-card.tsx      # preview + Giao việc CTA
```

`publication` được phép import `AssignTaskDialog` từ cùng role slice:

```ts
import { AssignTaskDialog } from '~/features/mangaka/assistants/components/assign-task-dialog'
```

### 7.4. Assistant tasks slice

```text
app/features/assistant/tasks/
├── components/
│   ├── task-card.tsx
│   ├── task-status-badge.tsx
│   ├── task-result-uploader.tsx
│   └── task-version-history.tsx
├── lib/
│   ├── task-status-meta.ts
│   └── task-error-key.ts
├── use-assistant-tasks.ts
├── use-assistant-task-detail.ts
├── use-start-task.ts
├── use-submit-task.ts
├── assistant-tasks-page.tsx
└── assistant-task-detail-page.tsx
```

### 7.5. Routes/barrels

```text
app/routes/mangaka/task-detail.tsx
app/routes/assistant/task-detail.tsx
app/features/mangaka/index.ts
app/features/assistant/index.ts
app/routes.ts
```

Mỗi role barrel chỉ export page-level components ra ngoài role.

---

## 8. Hook contracts đề xuất

### 8.1. `useTaskComposerData`

```ts
type TaskComposerPreset = {
  assignmentId?: string
  assistantId?: string
  seriesId?: string
  chapterId?: string
  pageId?: string
  regionId?: string
}

type UseTaskComposerDataResult = {
  assignments: ActiveAssignmentOption[]
  series: SeriesOption[]
  chapters: ChapterOption[]
  pages: PageOption[]
  regions: RegionOption[]
  loading: {
    assignments: boolean
    series: boolean
    chapters: boolean
    pages: boolean
    regions: boolean
  }
  errors: Partial<Record<'assignments' | 'series' | 'chapters' | 'pages' | 'regions', string>>
  reload: (scope: string) => void
}
```

Behavior:

- fetch phụ thuộc theo cascade;
- đổi series reset chapter/page/region;
- đổi chapter reset page/region;
- đổi page reset region;
- abort request cũ khi selection đổi;
- cache options theo ID trong lifetime dialog để back/next không refetch không cần thiết.

### 8.2. `useAssignTask`

```ts
type UseAssignTaskResult = {
  assignTask: (input: CreateTaskBodyDto) => Promise<TaskResDtoOutput | null>
  assignBatch: (input: BatchCreateTaskBodyDto) => Promise<TaskListResDtoOutput | null>
  isSubmitting: boolean
}
```

- validate client trước call;
- map error code;
- chỉ toast success ở hook hoặc caller, không cả hai;
- prevent double submit;
- return payload để caller update local list hoặc refresh.

### 8.3. Task detail hooks

- Fetch `GET /tasks/:id` có AbortController.
- 404 render not-found riêng.
- 403 render forbidden/generic safe state, không coi là empty.
- Mutation thành công dùng response `res.data` cập nhật detail ngay, sau đó background refresh list/context.
- Giữ `mutatingAction` theo action name thay vì một boolean chung để chỉ disable đúng control.

---

## 9. Validation chi tiết

### 9.1. Create task

| Field         | Client validation                                                                      |
| ------------- | -------------------------------------------------------------------------------------- |
| Assignment    | bắt buộc, `activeNow=true` tại thời điểm mở/submit                                     |
| `pageId`      | bắt buộc, non-empty                                                                    |
| `regionId`    | optional; nếu có phải nằm trong regions của selected page                              |
| `assistantId` | bắt buộc, lấy từ assignment đã chọn                                                    |
| `taskType`    | bắt buộc, thuộc enum và thuộc `assignedTaskTypes` của assignment                       |
| `deadline`    | optional; parse hợp lệ, ở tương lai; cảnh báo nếu vượt `hireEnd` hoặc chapter deadline |
| `priority`    | optional integer ≥ 0                                                                   |
| `assetIds`    | chỉ chứa asset upload thành công; không gửi key thay assetId                           |

Guide không nói backend bắt buộc deadline ≤ hireEnd/chapter deadline. Vì vậy FE nên:

- block deadline quá khứ;
- hiển thị warning/confirmation nếu vượt hireEnd/chapter deadline;
- không tự thêm hard rule không có trong spec, trừ khi product owner xác nhận.

### 9.2. Revision

- `reviewerNote`: trim, bắt buộc, 1–1000 ký tự.
- Hiển thị counter.
- Disable submit nếu invalid.

### 9.3. Cancel/terminate/reassign

- Cancel reason optional theo task API; trim trước gửi, omit nếu rỗng.
- Reassign Assistant mới phải khác Assistant hiện tại và có active assignment.
- Không đưa current Assistant vào selectable results.
- Không cho reassign `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `CANCELLED`.

### 9.4. Upload

- MIME allowlist: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`.
- Max 15MB/file.
- Reject file rỗng.
- Dùng `requiredHeaders` chính xác từ sign response.
- Hủy UI request không đồng nghĩa xóa Asset đã sign; không invent delete endpoint.

---

## 10. Error mapping bắt buộc

Thêm keys vào đúng namespace, ví dụ:

### Mangaka

| Backend code                  | VI message gợi ý                                               |
| ----------------------------- | -------------------------------------------------------------- |
| `Error.AssistantNotHired`     | Trợ lý này không còn quan hệ cộng tác đang hiệu lực.           |
| `Error.ChapterOnHold`         | Chương đang tạm dừng. Hãy tiếp tục chương trước khi giao việc. |
| `Error.NotSeriesOwner`        | Bạn không có quyền giao việc trên trang này.                   |
| `Error.PageNotFound`          | Không tìm thấy trang hoặc trang đã bị xoá.                     |
| `Error.AssetNotFound`         | Một tài liệu tham khảo không còn tồn tại. Hãy tải lại file.    |
| `Error.InvalidTaskTransition` | Task đã đổi trạng thái. Hãy tải lại trước khi thao tác.        |
| `Error.TaskNotReassignable`   | Task ở trạng thái hiện tại không thể giao lại.                 |
| `Error.TaskNotCancellable`    | Task đã hoàn tất hoặc đã huỷ nên không thể huỷ lại.            |
| `Error.TaskNotFound`          | Không tìm thấy task.                                           |

### Assistant

| Backend code                  | VI message gợi ý                                 |
| ----------------------------- | ------------------------------------------------ |
| `Error.NotTaskAssignee`       | Task này không được giao cho bạn.                |
| `Error.InvalidTaskTransition` | Task đã đổi trạng thái. Hãy tải lại trang.       |
| `Error.ChapterOnHold`         | Chương đang tạm dừng nên chưa thể tiếp tục task. |
| `Error.TaskNotFound`          | Không tìm thấy task.                             |

Fallback phải tự nhiên theo action, ví dụ “Không thể giao task. Vui lòng thử lại.”, không dùng “Unknown error”.

---

## 11. i18n key plan

Không copy nguyên text Việt/Anh vào component. Cấu trúc gợi ý:

### `mangaka.json`

```jsonc
{
  "studio": {
    "tabs": { "team": "", "tasks": "", "progress": "" },
    "summary": { "activeAssistants": "", "needsReview": "", "dueSoon": "", "completed": "" }
  },
  "tasks": {
    "title": "",
    "composer": {
      "title": "",
      "steps": { "context": "", "work": "", "confirm": "" },
      "wholePage": "",
      "selectAssistant": "",
      "selectSeries": "",
      "selectChapter": "",
      "selectPage": "",
      "selectRegion": "",
      "taskType": "",
      "deadline": "",
      "priority": "",
      "priorityHint": "",
      "attachments": "",
      "submit": "",
      "submitting": ""
    },
    "status": {},
    "taskType": {},
    "board": {},
    "detail": {},
    "actions": {},
    "revision": {},
    "reassign": {},
    "cancel": {},
    "errors": {},
    "success": {}
  }
}
```

### `assistant.json`

```jsonc
{
  "tasks": {
    "status": {},
    "taskType": {},
    "detail": {},
    "resultUpload": {},
    "versionHistory": {},
    "actions": {},
    "errors": {},
    "success": {}
  }
}
```

Không phá key hiện có; migrate dần hoặc reuse khi semantic trùng.

---

## 12. Theme token plan

Hiện các task/assignment components có hard-coded palette như `sky`, `amber`, `emerald`, `rose`. Trong các file chạm tới, thay bằng semantic tokens.

Mở rộng `theme.css` với các cặp token nếu chưa có:

```css
--color-info;
--color-info-foreground;
--color-success;
--color-success-foreground;
--color-warning;
--color-warning-foreground;
```

Đăng ký trong `@theme inline`, sau đó dùng:

- `bg-info/10 text-info border-info/20`
- `bg-success/10 text-success border-success/20`
- `bg-warning/10 text-warning border-warning/20`
- `bg-destructive/10 text-destructive border-destructive/20`

Status tone gợi ý:

| Status                      | Tone         |
| --------------------------- | ------------ |
| `ASSIGNED`                  | primary      |
| `IN_PROGRESS`               | info         |
| `SUBMITTED`, `UNDER_REVIEW` | warning/info |
| `APPROVED`                  | success      |
| `REVISION_REQUESTED`        | warning      |
| `ON_HOLD`                   | muted        |
| `CANCELLED`                 | destructive  |

Kiểm tra contrast WCAG AA ở cả light và dark.

---

## 13. Loading, empty và stale-state UX

### Loading

- Skeleton giữ đúng kích thước card để tránh layout shift.
- Cascading selects chỉ skeleton/spinner phần đang tải, không khóa toàn dialog.
- Mutation button spinner nhưng giữ label có nghĩa.

### Empty

- Không có active Assistant: giải thích prerequisite + CTA mở danh bạ.
- Không có series/chapter/page: chỉ dẫn bước nghiệp vụ tiếp theo.
- Page không có region: cho whole-page + CTA tạo region manual.
- Task board empty theo filter: CTA clear filter, không CTA tạo task mơ hồ.
- Assistant không có task: giải thích task sẽ xuất hiện sau khi Mangaka giao.

### Stale state

Các lỗi `409` thường nghĩa dữ liệu UI đã cũ:

1. giữ dialog/detail mở;
2. hiển thị message thân thiện;
3. refetch assignment/task/chapter;
4. cập nhật action availability;
5. không tự retry mutation có side effect.

---

## 14. Accessibility checklist

- Dialog có `role="dialog"`, `aria-modal`, label/description.
- Trap focus, Escape đóng khi không upload/submit, restore focus về CTA mở dialog.
- Khi đang upload/submit, hỏi xác nhận trước khi đóng nếu có thể mất progress.
- Stepper có current step cho screen reader.
- Region overlays là button/focusable; có danh sách text tương đương.
- Icon-only button có `aria-label`.
- Error field gắn `aria-describedby`; error summary dùng `role="alert"`.
- Status không truyền đạt chỉ bằng màu; luôn có text/icon.
- File dropzone dùng được bằng keyboard và có `<input type="file">` thật.
- Tap target tối thiểu 44×44px ở mobile.
- Focus ring dùng `ring-ring`, không remove outline mà không thay thế.
- Relative deadline luôn có absolute datetime hoặc tooltip/text hỗ trợ.

---

## 15. Notification deep-link

Theo prefix rule trong guide:

- nếu `referenceType.startsWith('TASK_')` và current role là Assistant:
  - `/dashboard/assistant/tasks/${referenceId}`;
- nếu current role là Mangaka:
  - `/dashboard/mangaka/studio/tasks/${referenceId}`.

Click notification:

1. mark read nếu chưa đọc;
2. navigate;
3. nếu mark-read fail vẫn cho navigate, toast nhẹ;
4. không hiển thị raw reference type/id làm CTA chính.

Nếu role khác nhận `TASK_*`, fallback tới notification page hoặc role-safe destination; không đoán route.

---

## 16. MSW và test scenarios

Generated MSW faker không đủ kiểm thử state machine. Nếu cần mock ổn định, tạo manual handlers trong `app/mocks/handlers/` và state factory trong `app/mocks/factories/`; không sửa generated `.msw.ts`.

Scenarios tối thiểu:

1. Assignment ACTIVE + activeNow true → create task thành công.
2. ACTIVE nhưng activeNow false → CTA disabled.
3. Assignment hết hạn giữa lúc mở và submit → API 409, refetch và khóa CTA.
4. Chapter hold → 409 và chỉ dẫn resume.
5. Upload reference thành công → request gửi assetId, không gửi key.
6. Upload reference fail → task chưa được tạo.
7. Assistant start ASSIGNED → IN_PROGRESS.
8. Assistant submit file → SUBMITTED + version 1.
9. Mangaka request revision → reviewer note hiển thị phía Assistant.
10. Assistant resubmit → version tăng.
11. Mangaka approve → APPROVED và page refresh.
12. Reassign từ ON_HOLD thành công.
13. Reassign SUBMITTED bị khóa UI/409 nếu stale.
14. Cancel non-terminal thành công; cancel APPROVED bị khóa.
15. Notification `TASK_*` deep-link đúng role.
16. 404 task detail.
17. 403 task khác scope.
18. VI/EN, light/dark, mobile dialog.

Repo chưa có test script chuyên dụng. Không tự cài test framework nếu user chưa yêu cầu. Verification bắt buộc:

```bash
npm run typecheck
npm run lint
npm run prettier
npm run build
```

Sau đó manual smoke test với MSW hoặc API thật.

---

## 17. Phases thực thi cho AI agent

### Phase 0 — Baseline và cleanup kiến trúc

- [ ] Đọc lại `AGENTS.md`, `ARCHITECTURE.md`, guide §0/§1/§5/§6/§7/§14.
- [ ] Chạy `git status --short`; không ghi đè thay đổi user.
- [ ] Chạy baseline `npm run typecheck` và ghi nhận lỗi có sẵn.
- [ ] Move/copy có kiểm soát `extractApiErrorMessage` sang shared API lib, update imports; không để shared import feature.
- [ ] Thêm semantic status tokens.
- [ ] Thêm generic `StatusBadge` và `FileDropzone` nếu cần.
- [ ] Mở rộng upload helper trả cả `assetId` và `key` mà không phá call sites cũ.

Exit criteria:

- dependency đúng chiều;
- upload helper phân biệt reference `assetId` và result `key`;
- typecheck pass.

### Phase 1 — Single Task Composer

- [ ] Tạo hooks/data cascade.
- [ ] Tạo three-step dialog.
- [ ] Implement active assignment guard.
- [ ] Implement series/chapter/page/region selection.
- [ ] Implement exact CreateTask body.
- [ ] Implement reference upload.
- [ ] Map error/i18n.
- [ ] Success refresh.

Exit criteria:

- tạo được một whole-page task và một region task;
- request không có field thừa;
- stale assignment/chapter errors xử lý đúng.

### Phase 2 — Hai entry points

- [ ] Studio assignment card CTA với disabled reason.
- [ ] Publication page card CTA với preset context.
- [ ] Empty state dẫn tới Assistant Directory.
- [ ] Cả hai dùng cùng composer, không duplicate form/business logic.

Exit criteria:

- mở từ hai nơi cho payload giống nhau;
- back/close không để stale preset sang lần mở kế tiếp.

### Phase 3 — Mangaka task management

- [ ] Studio tabs.
- [ ] Task board list/filter/pagination.
- [ ] Task detail route/page.
- [ ] Version preview.
- [ ] Approve/revision.
- [ ] Patch metadata.
- [ ] Reassign/cancel.
- [ ] Refresh page/chapter after cascade mutation.

Exit criteria:

- mọi action hiển thị đúng status matrix;
- stale status không gây optimistic state sai.

### Phase 4 — Assistant execution

- [ ] Refactor task list visual hierarchy.
- [ ] Thêm detail route/page.
- [ ] Start action.
- [ ] Result upload R2.
- [ ] Submit key.
- [ ] Revision note/version history.
- [ ] Locked/read-only states.

Exit criteria:

- không còn raw file-key input;
- retry submit không bắt user chọn/upload lại trong cùng session;
- state refresh đúng.

### Phase 5 — Notification và polish

- [ ] TASK deep-links.
- [ ] Accessibility audit.
- [ ] Responsive audit.
- [ ] Light/dark contrast.
- [ ] EN/VI key parity.
- [ ] Empty/loading/error/stale states.
- [ ] Remove hard-coded palette trong toàn bộ file đã chạm.

### Phase 6 — Batch assignment

- [ ] Chỉ bắt đầu khi phases 1–5 ổn định.
- [ ] Multi-select ≤ 50.
- [ ] All-or-nothing UX.
- [ ] Batch-specific errors và confirmation.

---

## 18. Acceptance criteria chi tiết

### Mangaka create

- [ ] Không thể giao task cho assignment `activeNow=false`.
- [ ] Không thể submit khi thiếu page/assistant/taskType.
- [ ] Task type selector chỉ cho assigned task types.
- [ ] Whole-page request omit `regionId`.
- [ ] Region request gửi đúng region thuộc page.
- [ ] Reference files gửi `assetIds`.
- [ ] Deadline convert đúng ISO UTC.
- [ ] API success đọc `res.data`.

### Assistant execute

- [ ] Chỉ assignee mới thấy/trigger action.
- [ ] `ASSIGNED` chỉ Start.
- [ ] `IN_PROGRESS` mới Submit.
- [ ] Result upload dùng R2 key.
- [ ] `REVISION_REQUESTED` hiển thị reviewer note.
- [ ] Terminal states read-only.

### Mangaka review

- [ ] Approve/revision chỉ hiện khi hợp lệ.
- [ ] Revision note 1–1000.
- [ ] Reassign chỉ cho bốn status hợp lệ.
- [ ] Cancel không hiện với APPROVED/CANCELLED.
- [ ] Version timeline giữ đầy đủ lịch sử.
- [ ] Page/chapter progress được refresh sau cascade.

### UX quality

- [ ] Không có raw `Error.*`.
- [ ] Không có hard-coded palette/hex trong component.
- [ ] Không có raw R2 key input.
- [ ] IDs chỉ là secondary metadata.
- [ ] Mobile không overflow ngang.
- [ ] Dialog keyboard hoàn chỉnh.
- [ ] VI/EN và light/dark hoạt động.

---

## 19. Những việc không làm trong scope này

- Không thay đổi backend/state machine nếu Swagger chưa đổi.
- Không tạo salary/payment flow cho Assistant; deal nằm ngoài hệ thống.
- Không tự thêm chat/comment field.
- Không tự public R2 URL hoặc cache signed URL lâu dài.
- Không làm Board WebSocket; task/notification dùng polling/refetch.
- Không migrate auth localStorage → cookie.
- Không cài form/query/test libraries mới nếu chưa được user yêu cầu.
- Không commit.

---

## 20. Quy tắc handoff và báo cáo của AI agent

Trong quá trình code, agent phải báo tiến độ theo phase, không báo “done” khi mới dựng UI tĩnh.

Khi hoàn tất, final response phải gồm:

1. Luồng nào đã chạy end-to-end.
2. File chính đã sửa/tạo.
3. API nào đã tích hợp.
4. Giới hạn do DTO/backend hiện tại.
5. Kết quả `typecheck`, `lint`, `prettier`, `build`.
6. Manual scenarios đã test.

Nếu phát hiện Swagger khác guide:

1. dừng phần bị ảnh hưởng;
2. lấy `swagger.json`/generated type làm nguồn type thực tế;
3. báo rõ mismatch;
4. không dùng `any` hoặc handwritten field để lách type;
5. tiếp tục các phần độc lập còn an toàn.

---

## 21. Thứ tự file nên mở khi bắt đầu code

1. `AGENTS.md`
2. `ARCHITECTURE.md`
3. `FE-API-Guide-v3.md` §0, §1.3–1.5, §5, §6, §7, §14
4. `swagger.json` schemas của Task/Studio/Upload
5. `app/api/operations/task/task.ts`
6. `app/api/operations/studio/studio.ts`
7. `app/api/operations/chapters/chapters.ts`
8. `app/api/operations/uploads/uploads.ts`
9. `app/features/mangaka/studio/my-studio-page.tsx`
10. `app/features/mangaka/assistants/components/assignment-card.tsx`
11. `app/features/mangaka/publication/components/pages-section.tsx`
12. `app/features/assistant/tasks/*`
13. `app/locales/{vi,en}/mangaka.json`
14. `app/locales/{vi,en}/assistant.json`
15. `app/styles/theme.css` và `app/styles/app.css`

Agent triển khai theo phases, giữ mỗi phase type-safe và runnable; không tạo toàn bộ file rỗng trước rồi mới nối API sau.
