# AGENTS.md — mangaka-web

> Hợp đồng giữa codebase và mọi AI agent (Cursor, Codex, Cline, Claude Code, ...) khi sinh code, refactor hay review. **Đọc file này trước khi chạm vào code.** Tài liệu đi kèm: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (giải thích cho dev mới), `FE-API-Guide-v3.md` (luồng nghiệp vụ + chi tiết endpoint), `swagger.json` (OpenAPI 3.0 — nguồn sự thật về types).

---

## 0. Quick rules — nếu chỉ nhớ được 5 dòng

1. **Mọi màu → token** trong `app/styles/theme.css`. KHÔNG hard-code `bg-orange-500` / hex.
2. **`shared/` không bao giờ import `features/`**. Feature cross-nhau → kéo lên `shared/`.
3. **API call từ `~/api/operations/<tag>/<tag>`** (do Orval sinh từ swagger). Route loader/action gọi, **không gọi trong component render**.
4. **Response luôn đọc `res.data`** (envelope `{success, message, data}`). Error message có dạng `Error.PascalCase` — KHÔNG hiển thị raw code cho user.
5. **i18n namespace = 1 feature = 1 file JSON** ở `app/locales/{en,vi}/<namespace>.json`. Thêm key → thêm CẢ EN và VI.

---

## 1. Bối cảnh dự án (Project Context)

- **Tên:** Mangaka — nền tảng đăng & xuất bản truyện tranh (manga creator/publisher platform).
- **Repo:** Frontend web (`mangaka-web`), FPT University — WDP semester 8.
- **Người dùng cuối:** Mangaka (tác giả), Assistant (trợ lý vẽ), Editor, Board Member, Super Admin. UI cần **đa ngôn ngữ** (mặc định **tiếng Việt**, hỗ trợ EN) và **dark/light mode**.
- **Nguyên tắc cốt lõi:** _dễ bảo trì, dễ mở rộng, đa ngôn ngữ, đa theme._
- **Backend Swagger:** xem `swagger.json` (24 tags — `auth`, `series`, `chapters`, `task`, `studio`, `notifications`, `uploads`, ...).
- **Business flows:** xem `FE-API-Guide-v3.md` (§0–§10). **Enum từ điển** ở §1 — nguồn sự thật duy nhất cho state machine.

---

## 2. Stack & phiên bản

| Lớp | Công nghệ | Phiên bản |
| --- | --- | --- |
| Framework | React Router 7 (SSR mặc định) | `7.14.0` |
| UI Runtime | React + React DOM | `^19.2.4` |
| Ngôn ngữ | TypeScript (strict + `verbatimModuleSyntax`) | `^5.9.3` |
| Build / Dev | Vite | `^8.0.3` |
| CSS | Tailwind CSS v4 (CSS-first, KHÔNG có `tailwind.config.js`) | `^4.2.2` |
| i18n | i18next + react-i18next | mới nhất |
| Class merge | clsx + tailwind-merge (`cn()`) | mới nhất |
| Mock API | MSW + @faker-js/faker | mới nhất |
| API codegen | Orval từ `swagger.json` → `app/api/{model,operations}` | mới nhất |

**Lưu ý:**
- Tailwind v4 dùng `@theme inline` đăng ký token từ CSS variables (`app/styles/theme.css`). **Không tạo `tailwind.config.{js,ts}`**.
- Dùng `react-router` v7. **Không** cài `react-router-dom` (cũ).
- Path alias `~/*` → `./app/*`. Ưu tiên `~/...` hơn relative.

---

## 3. Kiến trúc thư mục

Lấy cảm hứng Feature-Sliced Design (tinh giản): phân lớp `routes` / `features` / `shared` / `providers` / `styles` / `locales`.

```
mangaka-web/
├── app/
│   ├── root.tsx                       # Root layout, gắn AppProviders + theme init script
│   ├── routes.ts                      # Khai báo route (config object, KHÔNG auto-discover)
│   ├── routes/                        # Route entry — THIN: chỉ compose feature
│   │   ├── home.tsx
│   │   ├── auth/                      # login, register, change-password
│   │   ├── mangaka/                   # layout bọc DashboardLayout mount 1 lần
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx              # MangakaDashboard
│   │   │   ├── series.tsx, propose-series.tsx, series-detail.tsx, series-edit.tsx
│   │   │   ├── my-studio.tsx, assistant-directory.tsx, profile.tsx
│   │   ├── assistant/                 # layout riêng cho Assistant
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx              # AssistantDashboard
│   │   │   ├── tasks.tsx, studio.tsx, invites.tsx, notifications.tsx, profile.tsx
│   │   ├── editor/, board/, admin/    # mỗi role 1 layout + sub-pages
│   │
│   ├── features/                      # Business features, mỗi feature là 1 module độc lập
│   │   ├── auth/                      # register/login/refresh/logout + context
│   │   ├── profile/                   # hồ sơ cá nhân (Mangaka/Assistant dùng chung)
│   │   ├── welcome/                   # landing page
│   │   ├── mangaka/                   # ROLE mangaka — phân theo CHỨC NĂNG:
│   │   │   ├── dashboard/             # /dashboard/mangaka
│   │   │   ├── series/                # proposal → series list/detail/edit + wizard
│   │   │   ├── chapters/              # publication section, create chapter
│   │   │   ├── studio/                # signed image gallery (signed-image + use-signed-image-url)
│   │   │   ├── assistants/            # directory + invite dialog + assignment cards
│   │   │   ├── invites/               # hook tạo invite (dùng bởi assistants feature)
│   │   │   └── index.ts               # BARREL — re-export page-level components
│   │   └── assistant/                 # ROLE assistant — phân theo CHỨC NĂNG:
│   │       ├── dashboard/             # /dashboard/assistant (stats)
│   │       ├── tasks/                 # my tasks + task cards
│   │       ├── invites/               # lời mời cộng tác (PENDING → ACCEPTED/DECLINED)
│   │       ├── studio/                # my studio assignments (active/completed/terminated)
│   │       ├── notifications/         # thông báo + deep-link
│   │       └── index.ts               # BARREL
│   │
│   ├── shared/                        # Tái sử dụng cross-feature
│   │   ├── ui/                        # Generic UI primitives (Button, Input, Card, Dialog)
│   │   │   ├── button.tsx
│   │   │   └── index.ts
│   │   ├── components/                # App-level components đã ráp (ThemeToggle, AppHeader, DashboardLayout...)
│   │   ├── hooks/                     # Generic hooks (useDebounce, useMediaQuery — hiện trống)
│   │   ├── lib/                       # Utils thuần
│   │   │   ├── cn.ts                  # className helper (clsx + tailwind-merge)
│   │   │   ├── storage.ts             # localStorage wrapper an toàn SSR
│   │   │   ├── upload/upload-to-r2.ts # presigned PUT lên Cloudflare R2 (dùng bởi mangaka series, profile)
│   │   │   └── i18n/
│   │   │       ├── index.ts           # Khởi tạo i18next (CHỈ 1 LẦN, client side)
│   │   │       └── resources.ts       # Tổng hợp resources + namespace
│   │   ├── config/
│   │   │   ├── site.ts                # SITE, STORAGE_KEYS, SUPPORTED_LANGUAGES
│   │   │   └── env.ts                 # Type-safe env access
│   │   └── types/                     # Global types (hiện trống)
│   │
│   ├── providers/                     # App-level React context
│   │   ├── app-providers.tsx          # Compose all — DÙNG CÁI NÀY ở root.tsx
│   │   ├── theme-provider.tsx
│   │   └── i18n-provider.tsx
│   │
│   ├── styles/
│   │   ├── app.css                    # Entry: @import tailwind + theme + @theme inline
│   │   └── theme.css                  # CSS variables — ĐỔI MÀU CHỦ ĐẠO TẠI ĐÂY
│   │
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json
│   │   │   ├── welcome.json
│   │   │   ├── auth.json
│   │   │   ├── profile.json
│   │   │   ├── mangaka.json           # namespace = role (gộp key cho series, chapters, studio, dashboard, assistants, invites)
│   │   │   └── assistant.json         # namespace = role (gộp key cho tasks, invites, studio, notifications, dashboard)
│   │   └── vi/                        # mirror đầy đủ key
│   │
│   ├── mocks/                         # MSW mock server (dev only, VITE_ENABLE_MOCK=true)
│   │   ├── browser.ts                 # Setup MSW browser worker
│   │   ├── handlers/
│   │   │   ├── index.ts               # Barrel — gộp tất cả handlers
│   │   │   └── *.handler.ts           # 1 file mỗi swagger tag (khi chưa có Orval gen)
│   │   └── factories/                 # Faker data factories
│   │       └── <tag>.factory.ts
│   │
│   ├── api/                           # API layer (PHẦN LỚN do Orval generate)
│   │   ├── model/<tag>/               # ← orval: TS types, CHIA THEO TAG (post-hook organize-models-by-tag)
│   │   ├── operations/<tag>/          # ← orval: fetch fns + <tag>.msw.ts
│   │   └── mutator/
│   │       └── custom-fetch.ts        # Custom fetch wrapper (auth header, base URL) — KHÔNG bị orval xoá
│   │
│   └── entry.client.tsx               # Client entry — khởi động MSW worker trong dev
│
├── public/
│   └── mockServiceWorker.js           # MSW service worker (auto-gen, commit)
├── orval.config.ts                    # Orval codegen config
├── react-router.config.ts             # ssr: true
├── vite.config.ts
├── tsconfig.json                      # paths { "~/*": "./app/*" }
├── eslint.config.js
└── package.json
```

### 3.1 Quy tắc dependency

```
routes ─┬─► features ─┬─► shared ─► (libs, không bao giờ import ngược lên)
        │             │
        └─► providers ┘
```

| Lớp | Được import | KHÔNG được import |
| --- | --- | --- |
| `routes/*` | `features/*`, `shared/*`, `providers/*` | `mocks/*` |
| `features/<role>/<slice>/*` | `shared/*`, `~/api/*`, `~/features/<same-role>/<other-slice>` | `routes/*`, `mocks/*`, `features/<other-role>/*` |
| `features/auth`, `features/profile`, `features/welcome` | `shared/*`, `~/api/*` | `features/mangaka/*`, `features/assistant/*` |
| `shared/*` | (chỉ React/Tailwind/lib ngoài) | `features/*`, `routes/*`, `mocks/*` |
| `providers/*` | `shared/*` | `features/*`, `routes/*` |

### 3.2 Quy tắc sub-folder trong role (mới — áp dụng `features/mangaka` & `features/assistant`)

**Một role** (vd `features/mangaka`) phải được chia thành các **slice theo chức năng nghiệp vụ** (không phải theo loại file `components/`, `hooks/`):

- Mỗi slice = 1 thư mục con, tự đứng độc lập.
- Mapping slice ↔ swagger tag phải **1-1 hoặc 1-nhiều có chủ đích** (xem bảng §3.3).
- Trong mỗi slice, đặt tự do `components/`, `hooks/`, `lib/` (slice-local). Slice **không nên** chứa page-level ở root trừ khi chỉ có 1 page.
- Cross-slice trong **cùng role** được phép: dùng `~/features/<role>/<other-slice>/...` (vd `mangaka/assistants` import `mangaka/studio/use-signed-image-url`).
- Cross-role **không được** (vd `features/mangaka/*` KHÔNG import `features/assistant/*`).
- Public API của role qua `index.ts` (barrel) — bên ngoài **chỉ** import từ barrel.

### 3.3 Bảng ánh xạ Swagger tag → FE slice

| Swagger tag | Slice (theo role) | Ghi chú |
| --- | --- | --- |
| `auth` | `features/auth` | register, login, refresh, OTP, change-password |
| `users` | `features/auth`, `features/profile` | `/users/me` + hồ sơ công khai |
| `uploads` | `~/shared/lib/upload` | presigned PUT R2 (cross-role) |
| `series`, `names`, `chapters` | `features/mangaka/{series,chapters,studio}` | proposal → series → chapter → name |
| `task` | `features/assistant/tasks`, `features/mangaka/assistants` | assistant nhận task, mangaka giao task |
| `studio` | `features/mangaka/assistants`, `features/mangaka/studio` | invite + assignment + signed image |
| `notifications` | `features/assistant/notifications`, `features/mangaka/dashboard` | badge unread + deep-link |
| `reviews`, `annotations` | (sẽ vào `features/editor` & `features/mangaka/series`) | chưa implement |
| `board`, `contracts`, `payments`, `transfer`, `reprint-requests`, `survey`, `tankobon`, `publication-versions` | `features/{editor,board,admin}` (tương lai) | chưa có route, stub để trống |
| `audit`, `app-config`, `deadline-requests`, `ai` | cross-feature | chưa có FE; khi cần tạo `features/<role>/<slice>/` mới |

### 3.4 Path alias

| Alias | Trỏ đến |
| --- | --- |
| `~/features/<x>` | feature module (qua `index.ts`) |
| `~/features/<role>/<slice>` | slice bên trong role (bypass barrel khi cần) |
| `~/shared/ui`, `~/shared/components`, `~/shared/lib/<topic>`, `~/shared/config/<topic>` | shared layers |
| `~/providers/<x>-provider` | provider context |
| `~/api/operations/<tag>/<tag>` | orval-generated fetch fns |
| `~/api/model/<tag>` | orval-generated TS types theo tag |
| `~/mocks/handlers`, `~/mocks/factories` | MSW (dev only) |

Ưu tiên `~/...` hơn relative dài. Nội bộ slice (cùng cấp) dùng `./` được.

---

## 4. Hệ thống Theme (Dark / Light)

### 4.1 Triết lý — token-driven

- Mọi màu = **CSS variable** trong `app/styles/theme.css`.
- Component dùng class **semantic** (`bg-primary`, `text-foreground`, `border-border`...).
- **TUYỆT ĐỐI** không hard-code (`bg-orange-500`, hex).
- Đổi màu chủ đạo → **chỉ sửa `--color-*` trong `theme.css`**. Không động vào component.

### 4.2 Token hiện tại (rút gọn — xem `theme.css` đầy đủ)

| Token | Light | Dark |
| --- | --- | --- |
| `--color-background` | `#ffffff` | `#0b1220` |
| `--color-foreground` | `#1a1a1a` | `#e2e8f0` |
| `--color-primary` | `#f97316` orange-500 | `#38bdf8` sky-400 |
| `--color-card` | white | `#111a2e` |
| `--color-muted` / `…-foreground` | `#f5f5f4` / `#57534e` | `#1e293b` / `#94a3b8` |
| `--color-secondary` | `#fff7ed` / `#9a3412` | `#1e293b` / `#e2e8f0` |
| `--color-border` | `#e7e5e4` | `#1e293b` |
| `--color-ring` | `#f97316` | `#38bdf8` |
| `--color-destructive` | `#dc2626` / `#fff` | `#ef4444` / `#fff` |

Radius: `--radius-sm/md/lg/xl`.

### 4.3 Class Tailwind tự sinh (qua `@theme inline` ở `app/styles/app.css`)

`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-card`, `text-card-foreground`, `bg-muted`, `text-muted-foreground`, `bg-secondary`, `text-secondary-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-accent`, `text-accent-foreground`, `bg-destructive`, `text-destructive-foreground`, `rounded-sm/md/lg/xl`.

### 4.4 Dark mode

```css
@custom-variant dark (&:where(.dark, .dark *));
```

→ `dark:hidden`, `dark:block`... áp khi `<html>` có class `dark`. **Không cần viết `dark:` cho mỗi màu** — token tự đổi theo class. Chỉ dùng `dark:` cho layout/visibility.

### 4.5 API React

```tsx
import { useTheme } from '~/providers/theme-provider'
const { theme, setTheme, toggleTheme } = useTheme() // "light" | "dark"
```

- `ThemeProvider` mount 1 lần ở `app-providers.tsx`. **KHÔNG** gắn lại ở component con.
- `themeInitScript` inject `<script>` trong `<head>` (tại `root.tsx`) để áp class `dark` **trước** React hydrate → tránh FOUC.
- State persist `localStorage` key `STORAGE_KEYS.theme` = `"mangaka-theme"`. Fallback theo `prefers-color-scheme`.

---

## 5. Hệ thống i18n (EN / VI)

### 5.1 Thư viện & config

- `i18next` core, `react-i18next` React binding.
- `fallbackLng: "vi"`, `supportedLngs: ["en", "vi"]`. Storage key `STORAGE_KEYS.language` = `"mangaka-lang"`.
- Detector order: `localStorage` → `navigator`. Default namespace `"common"`.

### 5.2 Namespace = role

Mỗi role 1 namespace JSON file, **gộp key cho tất cả slice trong role** (không tách mỗi slice 1 file — tránh over-fragment):

```
app/locales/{en,vi}/
├── common.json                        # appName, theme, language, errors
├── welcome.json
├── auth.json                          # register, login, OTP, ...
├── profile.json                       # hồ sơ cá nhân
├── mangaka.json                       # series.* chapters.* studio.* assistants.* invites.* dashboard.*
└── assistant.json                     # tasks.* invites.* studio.* notifications.* dashboard.*
```

### 5.3 Quy tắc thêm key

- Thêm vào **CẢ** EN và VI cùng lúc, đúng namespace.
- Key camelCase, phân cấp bằng dấu `.` (vd `series.list.empty`, `tasks.errors.alreadySubmitted`).
- **Không** nhúng HTML thô vào value — dùng `<Trans>`.
- **Không** ghép chuỗi (`"Hello " + name`) — dùng interpolation `{{name}}`.

### 5.4 Sử dụng

```tsx
import { useTranslation } from 'react-i18next'

// Mặc định "common"
const { t, i18n } = useTranslation()
t('appName')

// Chỉ định namespace:
const { t } = useTranslation('mangaka')
t('series.list.title')

// Đổi ngôn ngữ:
i18n.changeLanguage('en')
```

### 5.5 SSR / Hydration

- App chạy **SSR** (`react-router.config.ts`: `ssr: true`).
- `I18nProvider` render `<I18nextProvider>` từ đầu, nhưng **detect & đổi ngôn ngữ chỉ chạy trong `useEffect`** để tránh hydration mismatch khi đọc `localStorage`.
- Server render dùng `FALLBACK_LANGUAGE` (vi).
- Nếu cần render đúng ngôn ngữ từ HTML server: lưu language trong **cookie**, đọc trong `loader` của route, truyền xuống provider.

---

## 6. Routing (React Router 7)

- Khai báo trong `app/routes.ts` (KHÔNG dùng folder convention auto-discovery):

```ts
import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  route('login', 'routes/auth/login.tsx'),
  layout('routes/mangaka/_layout.tsx', [
    route('dashboard/mangaka', 'routes/mangaka/index.tsx'),
    route('dashboard/series', 'routes/mangaka/series.tsx'),
    // ...
  ]),
] satisfies RouteConfig
```

- Route file **THIN**: chỉ wrap feature page.
- Type của route generate vào `./.react-router/types`, import qua `import type { Route } from "./+types/<route-name>"`.
- Loader/action: pattern React Router v7 (`export async function loader({ request, params }) { ... }`).
- Mỗi role có `_layout.tsx` riêng (vd `routes/mangaka/_layout.tsx`) bọc `DashboardLayout` mount 1 lần cho cả nhóm sub-route.

---

## 7. Quy ước code

### 7.1 TypeScript

- `strict: true`, tránh `any`. Thích `unknown` + narrow.
- `verbatimModuleSyntax: true` → import type phải có `type`: `import type { Foo } from "..."`.
- Dùng `as const` + `satisfies` cho object cấu hình.
- Import types từ **tag folder**: `import type { SeriesResDtoOutput } from '~/api/model/series'` (không dùng root barrel — Orval organize theo tag).

### 7.2 Component

- Function declaration + **named export**. Default export chỉ ở route entry.
- Props interface cùng file, tên `XxxProps`.
- Một component / một file. File > ~150 dòng → cân nhắc tách.
- Mỗi slice có 1 page-level component export qua barrel của role.

### 7.3 Tổ chức code (ranh giới)

| Quy tắc | Vị trí |
| --- | --- |
| Component chỉ 1 slice dùng | `features/<role>/<slice>/components/` |
| Hook chỉ 1 slice dùng | `features/<role>/<slice>/use-xxx.ts` (co-located, không có folder `hooks/`) |
| Component/hook cross-slice trong cùng role | `features/<role>/<slice>/...` — các slice khác import qua `~/features/<role>/<other-slice>/...` |
| Component/hook cross-role (vd upload R2) | `shared/lib/` hoặc `shared/components/` |
| Helper thuần | `shared/lib/<topic>.ts` |
| Hằng số / config | `shared/config/` |
| Provider cấp app | `providers/`, compose vào `app-providers.tsx` |
| UI primitive generic (Button, Input) | `shared/ui/` |

### 7.4 Styling

- **Luôn** dùng Tailwind utility + token semantic.
- Không viết CSS module trừ bất khả kháng.
- Dùng `cn()` từ `~/shared/lib/cn` để gộp class composable:

```tsx
import { cn } from '~/shared/lib/cn'
;<div className={cn('p-4', isActive && 'bg-primary', className)} />
```

### 7.5 File & naming

- File component: `kebab-case.tsx` (vd `welcome-header.tsx`).
- Tên React component: `PascalCase` (vd `WelcomeHeader`).
- Hook custom: `useXxx`, file `use-xxx.ts` đặt **cùng cấp** với component dùng nó (không bỏ vào folder `hooks/`).
- Locale key: camelCase, namespace tách bằng `.`.
- Mỗi feature có `index.ts` làm **public API barrel** — bên ngoài chỉ import qua barrel: `import { WelcomePage } from "~/features/welcome"`.

### 7.6 Lint / Format / Typecheck

```bash
npm run typecheck    # react-router typegen + tsc — BẮT BUỘC chạy trước khi báo done
npm run lint         # ESLint flat config
npm run lint:fix
npm run prettier     # check format
npm run prettier:fix
```

---

## 8. Quy ước gọi API & xử lý Response

### 8.1 Nguồn fetch functions

- **Chỉ dùng** Orval-generated fetch functions từ `~/api/operations/<tag>/<tag>`.
- KHÔNG gọi `fetch('/api/...')` trực tiếp trong feature — Orval sinh sẵn, có type-safe input/output.
- KHÔNG viết tay vào `app/api/model/` hoặc `app/api/operations/` — Orval xoá sạch khi gen lại.
- Customize wrapper fetch (auth header, base URL, error) ở `app/api/mutator/custom-fetch.ts`.

### 8.2 Response envelope — LUÔN đọc `res.data`

Mọi response **thành công**:

```jsonc
{ "success": true, "message": "Success", "data": { /* payload */ } }
```

→ Đọc `res.data` (custom fetch đã unwrap sẵn — payload nằm trực tiếp ở `data` của return value).

Mọi response **lỗi**:

```jsonc
// Field-level (validation 422 hoặc lỗi nghiệp vụ có path):
{ "success": false, "statusCode": 422, "message": "Invalid email address",
  "errors": [ { "message": "Invalid email address", "path": "email" } ] }

// Lỗi đơn:
{ "success": false, "statusCode": 403, "message": "Error.EmailNotVerified" }

// Rate-limit (OTP):
{ "success": false, "statusCode": 429, "message": "Error.OtpRateLimited",
  "code": "AUTH_OTP_RATE_LIMITED", "retryAfter": 60 }
```

→ `message` là string. Mã `Error.PascalCase` là **code** để FE map sang text hiển thị (qua i18n). **KHÔNG** hiển thị raw code cho user. Dùng `extractApiErrorMessage(err, fallback)` ở `~/features/auth/lib/extract-api-error.ts` để extract message an toàn.

### 8.3 Status code semantics (từ `FE-API-Guide-v3.md` §0.2)

| Status | Ý nghĩa |
| --- | --- |
| 200/201 | OK (POST tạo = 201) |
| 401 | Thiếu/sai/hết hạn Bearer token |
| 403 | Đúng token, sai role hoặc sai scope (không phải chủ sở hữu) |
| 404 | Không tìm thấy (gồm id không phải ObjectId hợp lệ) |
| 409 | State machine sai hoặc trùng unique |
| 410 | OTP hết hạn |
| **422** | **Validation fail** (không phải 400!) |
| 429 | Rate-limit (kèm `code` + `retryAfter`) |
| 503 | Service phụ thuộc tắt (vd AI segmentation khi `AI_SERVICE_URL` trống) |

### 8.4 Partial-update convention

- Field **omit hoặc `null`** = giữ nguyên.
- Gửi `[]` cho mảng = xoá sạch.
- Riêng `PATCH /me`: chuỗi rỗng `''` = xoá field nullable (`displayName`/`avatar`). `name`/`phoneNumber` không xoá được.
- Schema `.strict()` → gửi field lạ = 422. Đừng gửi thừa field.

### 8.5 Phân trang

- `limit` (default 20, max 100) + `offset` (default 0). Response kèm `total` khi có.

### 8.6 File upload qua R2

- File **KHÔNG BAO GIỜ** đi qua Backend.
- `POST /uploads/sign` → nhận `uploadUrl` (presigned PUT) + `key` → FE PUT bytes thẳng lên R2 → gửi `key` cho API nghiệp vụ.
- Hiển thị: đổi `key` → URL tạm qua `POST /uploads/sign-download`. KHÔNG cache URL (có hạn) — cache `key`.
- Allowlist: `image/png`, `image/jpeg`, `image/webp`, `application/pdf`; tối đa 15MB.
- Helper dùng: `~/shared/lib/upload/upload-to-r2.ts` (`uploadToR2(file, assetType?)`, `uploadToR2WithMessage(file, fallback, assetType?)`).

### 8.7 Notification deep-link

`Notification.referenceType` có dạng `<ENTITY>_<ACTION>` (vd `TASK_ASSIGNED`, `PROPOSAL_RESUBMITTED`). Deep-link theo **prefix**:

| Prefix | Điều hướng tới |
| --- | --- |
| `TASK_*` | Chi tiết task (`referenceId` = taskId) |
| `PROPOSAL_*`, `SERIES_*`, `NAME_*`, `FRANCHISE_*` | Chi tiết series (`referenceId` = seriesId/nameId) |
| `CHAPTER_*`, `MANUSCRIPT_*`, `PAGE_*` | Chi tiết chapter |
| `CONTRACT_*`, `AMENDMENT_*`, `PAYMENT_*` | Chi tiết hợp đồng / thanh toán |
| `DEADLINE_*` | Chi tiết deadline request |
| `BOARD_*`, `DECISION_*` | Phiên họp / quyết định Board |
| `SURVEY_*`, `RANKING_*` | Kỳ khảo sát / bảng xếp hạng |
| `REVIEW_*`, `INVITE_*`, `ASSIGNMENT_*` | Hồ sơ / lời mời cộng tác |

### 8.8 Realtime

- **Mặc định polling** (10–30s) cho dashboard tiến độ + notification badge (dùng `unreadCount` của `GET /notifications`).
- WebSocket **chỉ** cho phiên họp Board (`/board` namespace, Socket.IO) — xem `FE-API-Guide-v3.md` §15. Kết nối **bắt buộc JWT**.

---

## 9. Scripts có sẵn

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Dev server (HMR) tại `http://localhost:5173` |
| `npm run build` | Build production (SSR client + server bundle) |
| `npm start` | Chạy server bundle production |
| `npm run start:csr` | Preview build SPA (vite preview) |
| `npm run typecheck` | `react-router typegen && tsc` |
| `npm run lint` | ESLint flat config |
| `npm run lint:fix` | ESLint với auto-fix |
| `npm run prettier` | Kiểm tra format |
| `npm run orval` | Codegen từ swagger → types + services + MSW handlers |
| `npm run orval:watch` | Codegen tự động khi `swagger.json` thay đổi |

---

## 10. Skill / kiến thức cần có

Theo thứ tự ưu tiên:

1. **React 19** — function components, hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useId`, `use`, `forwardRef`), Suspense, error boundary.
2. **TypeScript** — generics, type narrowing, `as const`, `satisfies`, type-only imports, declaration merging cho env.
3. **React Router v7** — route module API (loader/action/meta/links), `<Outlet />`, `useNavigate`, `useNavigation`, `useFetcher`. Khác biệt SSR vs SPA mode.
4. **Tailwind CSS v4 (CSS-first)** — `@theme`, `@custom-variant`, đăng ký token qua CSS variables.
5. **i18next / react-i18next** — `useTranslation`, namespace, interpolation `{{var}}`, pluralization, language detector.
6. **Theming với CSS variables** — design token, contrast WCAG AA, test cả dark/light.
7. **SSR & hydration** — vì sao `localStorage`/`window` không truy cập được trong render đầu, `suppressHydrationWarning`, mount-then-render.
8. **Vite** — config plugins, env vars (`import.meta.env`).
9. **OpenAPI / Orval** — đọc swagger để biết tag, response shape, status code. Không gọi `fetch` thẳng.
10. **State machines** — hiểu `SeriesStatus`, `ManuscriptStatus`, `TaskStatus`, ... (xem `FE-API-Guide-v3.md` §1).
11. **Accessibility** — landmark, `aria-label` cho icon-only button, focus-visible ring, contrast.
12. **(Sau)** Forms (`react-hook-form` + `zod`), data fetching (`@tanstack/react-query` hoặc loader của RR7), state mgmt nếu cần — chưa setup, đề xuất khi cần.

---

## 11. DO / DON'T

### ✅ DO

- Dùng class semantic (`bg-primary`, `text-foreground`...) cho mọi màu. Thiếu token → mở rộng `theme.css` trước, rồi dùng class mới.
- Thêm string vào **CẢ** EN và VI cùng lúc, đúng namespace (role).
- Component chỉ-1-slice dùng → đặt trong `features/<role>/<slice>/components/`. Cross-slice cùng role → đặt trong slice sở hữu, import qua `~/features/<role>/<slice>/...`.
- Mỗi role export page-level qua `index.ts` (barrel). Bên ngoài chỉ import barrel.
- Khi tạo route mới, đăng ký trong `app/routes.ts`.
- Bọc `localStorage`/`window` trong `useEffect` hoặc `typeof window !== "undefined"`. Hoặc helper `~/shared/lib/storage`.
- Dùng `cn()` cho mọi class merge có điều kiện.
- Dùng `extractApiErrorMessage(err, fallback)` thay vì đọc `err.message` thẳng.
- Chạy `npm run typecheck` trước khi báo done.

### ❌ DON'T

- **Không** tạo `tailwind.config.{js,ts}` — Tailwind v4 không cần.
- **Không** cài `react-router-dom` (cũ).
- **Không** hard-code màu hex / class kiểu `bg-orange-500` trong component.
- **Không** dùng `dark:bg-xxx` trùng nhiệm vụ token (chỉ dùng `dark:` cho layout/visibility).
- **Không** init `i18next` ở nhiều nơi — chỉ trong `app/shared/lib/i18n/index.ts`.
- **Không** import file dịch trực tiếp vào component — dùng `useTranslation()`.
- **Không** import chéo giữa các **role** (`features/mangaka` ↔ `features/assistant`). Cross-slice trong cùng role OK; cross-role thì kéo lên `shared/`.
- **Không** import `features/*` từ `shared/*` (vi phạm dependency rule).
- **Không** import `mocks/*` hay `api/operations/*` từ `features/*` hay `shared/*` — mock chỉ tồn tại trong `mocks/` và `entry.client.tsx`. Fetch từ `api/operations/` chỉ gọi trong route loader/action.
- **Không** gọi `fetch('/api/...')` thẳng trong feature — dùng Orval-generated fn.
- **Không** hiển thị raw `Error.PascalCase` code cho user — map qua i18n trước.
- **Không** tạo `*.md` linh tinh / README phụ.
- **Không** đụng vào `Dockerfile`, `react-router.config.ts`, `vite.config.ts` trừ khi task yêu cầu.
- **Không** commit khi user chưa yêu cầu.

---

## 12. Recipe — việc thường gặp

### Thêm 1 slice mới vào role đã có (vd `mangaka/deadlines`)

1. Tạo cấu trúc:
   ```
   app/features/mangaka/deadlines/
   ├── deadline-page.tsx
   ├── use-deadlines.ts
   ├── components/deadline-card.tsx
   └── index.ts                         # export { DeadlinePage } from './deadline-page'
   ```
2. Thêm key dịch vào `app/locales/{en,vi}/mangaka.json` (namespace = role), ví dụ `"deadlines.title"`.
3. Thêm page-level vào barrel `app/features/mangaka/index.ts`:
   ```ts
   export { DeadlinePage } from './deadlines/deadline-page'
   ```
4. Tạo route `app/routes/mangaka/deadlines.tsx`:
   ```tsx
   import { DeadlinePage } from '~/features/mangaka'
   import type { Route } from './+types/deadlines'
   export default function Route() { return <DeadlinePage /> }
   ```
5. Đăng ký trong `app/routes.ts`:
   ```ts
   route('dashboard/deadlines', 'routes/mangaka/deadlines.tsx')
   ```
6. (Nếu slice dùng API mới) Chạy `npm run orval` để cập nhật `~/api/operations/deadline-requests/`. Import fetch fn trong hook.

### Thêm 1 role mới (vd `editor`)

1. Tạo cấu trúc `features/editor/<slice>/...` cho mỗi chức năng (vd `series-review`, `board-pitch`).
2. Tạo locale: `app/locales/{en,vi}/editor.json`.
3. Đăng ký vào `app/shared/lib/i18n/resources.ts`:
   - `import enEditor from "~/locales/en/editor.json"` (+ vi).
   - `editor: enEditor` vào `resources.en` (+ vi).
   - `"editor"` vào `NAMESPACES`.
4. Tạo layout `app/routes/editor/_layout.tsx` dùng `DashboardLayout` + `useDashboardNavConfig('EDITOR')`.
5. Tạo sub-routes trong `app/routes/editor/*.tsx` (thin — chỉ wrap page từ barrel).
6. Đăng ký vào `app/routes.ts`:
   ```ts
   layout('routes/editor/_layout.tsx', [
     route('dashboard/editor/series-review', 'routes/editor/series-review.tsx'),
     // ...
   ])
   ```
7. Thêm nav config cho role trong `app/shared/components/dashboard-nav-config.tsx`.

### Thêm 1 feature độc lập (vd `auth`)

1. Tạo cấu trúc:
   ```
   app/features/auth/
   ├── context/auth-context.tsx
   ├── hooks/use-login.ts, use-register.ts, use-refresh.ts
   ├── lib/extract-api-error.ts
   ├── components/login-form.tsx, register-form.tsx, otp-form.tsx
   ├── auth-page.tsx
   └── index.ts                         # export { AuthPage, useAuth }
   ```
2. Tạo locale `app/locales/{en,vi}/auth.json` + đăng ký namespace.
3. Tạo route `app/routes/auth/login.tsx` import từ `~/features/auth`.
4. Đăng ký trong `app/routes.ts`.

### Thêm 1 trang đơn (vd `/about`)

1. `app/routes/about.tsx` viết component (hoặc compose feature).
2. Khai báo trong `app/routes.ts`: `route('about', 'routes/about.tsx')`.
3. Thêm key dịch nếu có chữ.

### Thêm 1 ngôn ngữ mới (vd `ja`)

1. Tạo `app/locales/ja/{common,welcome,auth,profile,mangaka,assistant}.json` đầy đủ key.
2. Sửa `app/shared/lib/i18n/resources.ts`:
   - Import `jaXxx` cho mỗi namespace.
   - Thêm `ja: { common: jaCommon, welcome: jaWelcome, ... }` vào `resources`.
   - Thêm `"ja"` vào `SUPPORTED_LANGUAGES`.
3. Cập nhật `LABEL` cho ngôn ngữ mới trong `LanguageSwitcher`.

### Đổi màu chủ đạo (vd light = trắng/xanh lá, dark = đen/tím)

1. Mở `app/styles/theme.css`.
2. Sửa `--color-primary`, `--color-primary-foreground`, `--color-ring`, `--color-accent` (và token liên quan) trong `:root` và `.dark`.
3. Component dùng token semantic — không cần đổi gì.

### Thêm 1 UI primitive (vd `Input`)

1. Tạo `app/shared/ui/input.tsx`, theo pattern của `button.tsx`:
   - `forwardRef`, props extends HTML element props, nhận `className` để compose qua `cn()`.
   - Variant/size mappings.
2. Re-export trong `app/shared/ui/index.ts`.
3. Chỉ dùng class semantic — không hex.

### Thêm Provider cấp app mới (vd Toast / QueryClient)

1. Tạo `app/providers/<name>-provider.tsx`.
2. Bọc trong `app/providers/app-providers.tsx` đúng vị trí (tuỳ thuộc provider khác hay không).
3. **Không** gắn provider trực tiếp ở route con.

### Truy cập env var

```ts
import { env } from '~/shared/config/env'
fetch(`${env.API_URL}/mangas`)
```

Khi thêm biến: `.env.local` với prefix `VITE_`, khai báo trong `interface ImportMetaEnv` ở `env.ts`, expose qua object `env`.

---

## 13. Mock API — MSW + Faker + Orval

### 13.1 Luồng hoạt động

```
VITE_ENABLE_MOCK=true
  → entry.client.tsx khởi động MSW browser worker
  → mọi fetch() trên browser bị intercept bởi mockServiceWorker.js
  → handler trong app/mocks/handlers/ trả về Faker data (hoặc generated handler từ Orval)
  → FE dev không cần BE thật
```

### 13.2 Bật / tắt mock

`.env.local`:

```env
VITE_ENABLE_MOCK=true   # bật MSW (dev)
VITE_ENABLE_MOCK=false  # tắt, gọi API thật qua VITE_API_URL
```

Khi tắt, code MSW bị **tree-shake** khỏi production bundle (dynamic import trong `app/entry.client.tsx`).

### 13.3 Thêm mock endpoint tay (khi chưa có swagger)

1. Thêm factory `app/mocks/factories/<tag>.factory.ts`:
   ```ts
   import { faker } from '@faker-js/faker'
   import type { Chapter } from '~/api/model/chapters'
   export function createChapter(overrides: Partial<Chapter> = {}): Chapter {
     return { id: faker.string.uuid(), mangaId: faker.string.uuid(), title: faker.lorem.words(4), pageCount: faker.number.int({ min: 10, max: 60 }), ...overrides }
   }
   ```
2. Thêm handler `app/mocks/handlers/<tag>.handler.ts`:
   ```ts
   import { http, HttpResponse } from 'msw'
   import { createChapter } from '../factories/chapter.factory'
   export const chapterHandlers = [
     http.get('/api/chapters/:id', () => HttpResponse.json({ success: true, message: 'OK', data: createChapter() }))
   ]
   ```
3. Đăng ký vào `app/mocks/handlers/index.ts`:
   ```ts
   import { chapterHandlers } from './chapter.handler'
   export const handlers = [...exampleHandlers, ...chapterHandlers]
   ```
   → **Lưu ý:** response phải bọc envelope `{success, message, data}` để khớp §8.2.

### 13.4 Khi BE có swagger — dùng Orval

1. Đặt `swagger.json` ở root, hoặc cập nhật URL trong `orval.config.ts`.
2. Chạy `npm run orval` → auto-generate:
   - `app/api/model/<tag>/` — TS types theo tag (post-hook `organize-models-by-tag.mjs`).
   - `app/api/operations/<tag>/<tag>.ts` — fetch functions.
   - `app/api/operations/<tag>/<tag>.msw.ts` — MSW handlers từ swagger examples.
3. Import generated handlers vào `app/mocks/handlers/index.ts`, **xoá** handler viết tay tương ứng.
4. Dùng generated fetch functions trong route loader hoặc hook:
   ```ts
   import { deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
   const res = await deadlineControllerList({ limit: 20, offset: 0 })
   const items = res.data?.items ?? []  // ← unwrap envelope tại đây
   ```

### 13.5 Quy tắc với `app/api/`

- **KHÔNG** viết tay trong `app/api/model/` và `app/api/operations/` — Orval xoá sạch khi chạy lại.
- **CHỈ** viết tay trong `app/api/mutator/custom-fetch.ts` (wrapper, không bị Orval xoá).
- Factory trong `app/mocks/factories/` dùng types từ `app/api/model/<tag>/`.

---

## 14. Câu hỏi mở / chưa giải quyết

CHƯA có trong repo, agent đừng giả định:

- **Authentication / authorization đầy đủ** — đã có `features/auth` cơ bản; route guard theo role **chưa có**. Mọi route hiện public (trừ auth flow).
- **Data fetching layer** — chưa có TanStack Query. Hiện dùng `fetch` qua `customFetch` mutator + hook local + loader của RR7. Xem xét TanStack Query sau khi có auth guard.
- **State management** — chưa có Zustand/Redux. Trạng thái dùng React context (Theme, i18n, Auth).
- **Form / validation** — chưa có react-hook-form + zod. Form tạm thời dùng `useState` + manual error handling qua `extractApiErrorMessage`.
- **UI library** — không dùng MUI/Ant/shadcn, tự xây trên Tailwind + token (`shared/ui/button.tsx` làm mẫu).
- **Test** — chưa có Vitest / Playwright.
- **Role dashboard chưa implement:** `editor`, `board_member`, `super_admin`. Stub route đã có trong `app/routes.ts`, layout cần tạo khi triển khai.
- **Tag chưa dùng trong FE:** `reviews`, `annotations`, `ai`, `audit`, `app-config`, `deadline-requests`, `reprint-requests`, `transfer`, `payments`, `contracts`, `survey`, `tankobon`, `publication-versions`.

Khi cần thêm thư viện ngoài, **đề xuất rõ trong phản hồi và chờ confirm** trước khi `npm install`.