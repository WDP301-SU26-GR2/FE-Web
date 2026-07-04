# AGENTS.md — mangaka-web

> Tài liệu dành cho các AI agent (Codex, Cursor, Cline, Claude Code, ...) và dev mới khi làm việc trên codebase frontend của dự án **Mangaka**. Đọc kỹ trước khi sinh code, refactor hay đề xuất thay đổi.

---

## 1. Bối cảnh dự án (Project Context)

- **Tên dự án:** Mangaka — nền tảng đăng và xuất bản truyện tranh cho tác giả (manga creator/publisher platform).
- **Khoá / môn:** FPT University, semester 8, môn **WDP**.
- **Vai trò repo này:** Frontend web app (`mangaka-web`).
- **Người dùng cuối:** Tác giả/hoạ sĩ đăng truyện, độc giả đọc truyện, admin kiểm duyệt. UI cần **đa ngôn ngữ** (mặc định **tiếng Việt**, hỗ trợ EN) và **dark/light mode**.
- **Nguyên tắc cốt lõi:** _dễ bảo trì, dễ mở rộng, đa ngôn ngữ, đa theme._

---

## 2. Stack & phiên bản

| Lớp                | Công nghệ                          | Phiên bản |
| ------------------ | ---------------------------------- | --------- |
| Framework          | React Router 7 (SSR mặc định)      | `7.14.0`  |
| UI Runtime         | React + React DOM                  | `^19.2.4` |
| Ngôn ngữ           | TypeScript (strict)                | `^5.9.3`  |
| Build / Dev server | Vite                               | `^8.0.3`  |
| CSS                | Tailwind CSS v4 (CSS-first config) | `^4.2.2`  |
| i18n               | i18next + react-i18next            | mới nhất  |
| Class merge util   | clsx + tailwind-merge (`cn()`)     | mới nhất  |
| Mock API           | MSW + @faker-js/faker              | mới nhất  |
| API codegen        | Orval (chạy khi BE có swagger)     | mới nhất  |

> **Lưu ý quan trọng:**
>
> - Tailwind **v4** dùng cấu hình CSS-first, KHÔNG có `tailwind.config.js`. Token nằm trong `app/styles/theme.css`, đăng ký qua `@theme inline` ở `app/styles/app.css`.
> - Dùng `react-router` v7, **không** dùng `react-router-dom`.
> - Path alias `~/*` → `./app/*` (xem `tsconfig.json`).

---

## 3. Kiến trúc thư mục

Lấy cảm hứng từ **Feature-Sliced Design** (tinh giản): phân lớp rõ giữa `routes` (routing), `features` (business), `shared` (tái sử dụng), `providers` (context cấp app), `styles` (CSS) và `locales` (i18n).

```
mangaka-web/
├── app/
│   ├── root.tsx                       # Root layout, gắn AppProviders + theme init script
│   ├── routes.ts                      # Khai báo route (config object)
│   ├── routes/                        # Route entry — THIN: chỉ compose feature
│   │   └── home.tsx
│   │
│   ├── features/                      # Business features, mỗi feature là 1 module độc lập
│   │   └── welcome/
│   │       ├── assets/                # Asset riêng của feature (svg, png, ...)
│   │       ├── components/            # Component nội bộ chỉ feature này dùng
│   │       │   ├── welcome-header.tsx
│   │       │   └── welcome-resources.tsx
│   │       ├── welcome-page.tsx       # Trang chính của feature (export ra cho route)
│   │       └── index.ts               # Public API barrel của feature
│   │
│   ├── shared/                        # Tái sử dụng cross-feature
│   │   ├── ui/                        # UI primitives generic (Button, Input, Card, ...)
│   │   │   ├── button.tsx
│   │   │   └── index.ts
│   │   ├── components/                # Component cấp app, đã "lắp ráp" (ThemeToggle, ...)
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── language-switcher.tsx
│   │   │   └── index.ts
│   │   ├── hooks/                     # Hook generic (chưa có nội dung)
│   │   ├── lib/                       # Utils thuần
│   │   │   ├── cn.ts                  # className helper (clsx + tailwind-merge)
│   │   │   ├── storage.ts             # localStorage wrapper an toàn SSR
│   │   │   └── i18n/
│   │   │       ├── index.ts           # Khởi tạo i18next (chỉ 1 lần, client side)
│   │   │       └── resources.ts       # Tổng hợp resources + namespace
│   │   ├── config/
│   │   │   ├── site.ts                # Hằng số app (SITE, STORAGE_KEYS)
│   │   │   └── env.ts                 # Truy cập env type-safe (import.meta.env)
│   │   └── types/                     # Global types (chưa có nội dung)
│   │
│   ├── providers/                     # Toàn bộ React context provider cấp app
│   │   ├── app-providers.tsx          # Compose all (DÙNG CÁI NÀY ở root.tsx)
│   │   ├── theme-provider.tsx
│   │   └── i18n-provider.tsx
│   │
│   ├── styles/
│   │   ├── app.css                    # Entry: @import tailwind + theme + @theme inline
│   │   └── theme.css                  # CSS variables — chỉnh màu chủ đạo TẠI ĐÂY
│   │
│   ├── locales/
│   │   ├── en/
│   │   │   ├── common.json
│   │   │   └── welcome.json
│   │   └── vi/
│   │       ├── common.json
│   │       └── welcome.json
│   │
│   ├── mocks/                         # MSW mock server (dev only)
│   │   ├── browser.ts                 # Setup MSW browser worker
│   │   ├── handlers/
│   │   │   ├── index.ts               # Barrel — gộp tất cả handlers
│   │   │   └── example.handler.ts     # Handler viết tay (xoá khi orval generate)
│   │   └── factories/                 # Faker data factories — dùng trong handlers
│   │       ├── manga.factory.ts
│   │       ├── user.factory.ts
│   │       └── index.ts
│   │
│   ├── api/                           # API layer (phần lớn do orval generate)
│   │   ├── model/                     # ← orval: TypeScript interfaces/types
│   │   ├── operations/                # ← orval: fetch functions + MSW handlers
│   │   └── mutator/
│   │       └── custom-fetch.ts        # Custom fetch wrapper (base URL, auth header)
│   │
│   └── entry.client.tsx               # Client entry — khởi động MSW worker trong dev
│
├── public/
│   └── mockServiceWorker.js           # MSW service worker (auto-generated, commit vào git)
├── orval.config.ts                    # Orval codegen config (chạy khi BE có swagger)
├── react-router.config.ts             # ssr: true
├── vite.config.ts
├── tsconfig.json                      # paths { "~/*": "./app/*" }
├── eslint.config.js
└── package.json
```

### 3.1 Quy tắc dependency (lớp nào được import lớp nào)

```
routes ─┬─► features ─┐
        │             ├─► shared ─► (libs, không bao giờ import ngược lên)
        └─► providers ┘
```

- `routes/*` chỉ nên import `features/*` và (đôi khi) `shared/*`.
- `features/<x>/*` được dùng `shared/*`. **KHÔNG** import lẫn nhau giữa các feature (`features/auth` không được import `features/manga` và ngược lại). Nếu cần dùng chung, **kéo lên `shared/`**.
- `shared/*` **không bao giờ** import `features/*` hay `routes/*`.
- `providers/*` chỉ dùng `shared/*`.
- `styles/*` không có code TS — chỉ CSS.

> Vi phạm các quy tắc trên là dấu hiệu cần refactor.

### 3.2 Path alias

| Alias                        | Trỏ đến                          |
| ---------------------------- | -------------------------------- |
| `~/features/<x>`             | feature module (qua `index.ts`)  |
| `~/shared/ui`                | UI primitives                    |
| `~/shared/components`        | App-level shared components      |
| `~/shared/lib/cn`            | className helper                 |
| `~/shared/lib/storage`       | localStorage helper              |
| `~/shared/lib/i18n`          | i18n core                        |
| `~/shared/config/site`       | SITE, STORAGE_KEYS               |
| `~/shared/config/env`        | env vars                         |
| `~/providers/app-providers`  | AppProviders + themeInitScript   |
| `~/providers/theme-provider` | ThemeProvider, useTheme          |
| `~/api/operations`           | Orval-generated fetch functions  |
| `~/api/model`                | Orval-generated TS types (per-tag: `~/api/model/<tag>`) |
| `~/mocks/handlers`           | MSW handler barrel (dev only)    |
| `~/mocks/factories`          | Faker data factories (dev only)  |

Ưu tiên dùng alias `~/...` thay vì relative dài.

---

## 4. Hệ thống Theme (Dark / Light)

### 4.1 Triết lý — token-driven

- Mọi màu được khai báo dưới dạng **CSS variable** trong `app/styles/theme.css`.
- Component dùng class **semantic** (`bg-primary`, `text-foreground`, `border-border`...). **TUYỆT ĐỐI** không hard-code màu (`bg-orange-500`, `text-gray-700`).
- Khi đổi màu chủ đạo (vd: cam → xanh lá), **chỉ sửa các biến `--color-*` trong `theme.css`**. Không động vào component.

### 4.2 Token hiện tại

| Token                                  | Light (white + orange) | Dark (navy + sky)     |
| -------------------------------------- | ---------------------- | --------------------- |
| `--color-background`                   | `#ffffff`              | `#0b1220`             |
| `--color-foreground`                   | `#1a1a1a`              | `#e2e8f0`             |
| `--color-primary`                      | `#f97316` orange-500   | `#38bdf8` sky-400     |
| `--color-primary-foreground`           | `#ffffff`              | `#0b1220`             |
| `--color-card` / `…-foreground`        | white / `#1a1a1a`      | `#111a2e` / `#e2e8f0` |
| `--color-muted` / `…-foreground`       | `#f5f5f4` / `#57534e`  | `#1e293b` / `#94a3b8` |
| `--color-secondary` / `…-foreground`   | `#fff7ed` / `#9a3412`  | `#1e293b` / `#e2e8f0` |
| `--color-border`                       | `#e7e5e4`              | `#1e293b`             |
| `--color-input`                        | `#e7e5e4`              | `#1e293b`             |
| `--color-ring`                         | `#f97316`              | `#38bdf8`             |
| `--color-accent` / `…-foreground`      | `#fed7aa` / `#7c2d12`  | `#1e3a8a` / `#dbeafe` |
| `--color-destructive` / `…-foreground` | `#dc2626` / `#fff`     | `#ef4444` / `#fff`    |

Radius tokens: `--radius-sm/md/lg/xl` (sửa cùng chỗ trong `theme.css`).

### 4.3 Class Tailwind tự sinh

Sau `@theme inline { ... }` ở `app/styles/app.css`, có sẵn:
`bg-background`, `text-foreground`, `bg-primary`, `text-primary-foreground`, `bg-card`, `text-card-foreground`, `bg-muted`, `text-muted-foreground`, `bg-secondary`, `text-secondary-foreground`, `border-border`, `border-input`, `ring-ring`, `bg-accent`, `text-accent-foreground`, `bg-destructive`, `text-destructive-foreground`, `rounded-sm/md/lg/xl`.

### 4.4 Bật dark mode

Class `dark` được toggle trên `<html>`. Variant đã cấu hình:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

→ `dark:hidden`, `dark:block`... áp khi `<html>` có class `dark`.

### 4.5 API React

```tsx
import { useTheme } from '~/providers/theme-provider'

const { theme, setTheme, toggleTheme } = useTheme()
// theme: "light" | "dark"
```

- `ThemeProvider` được gắn 1 lần tại `app/providers/app-providers.tsx`. **KHÔNG** gắn lại ở component con.
- `themeInitScript` được inject `<script>` trong `<head>` (tại `root.tsx`) để áp class `dark` **trước khi** React hydrate → tránh flash màu sai (FOUC).
- State persist trong `localStorage` key `STORAGE_KEYS.theme` = `"mangaka-theme"`.
- Khi chưa có giá trị lưu, fallback theo `prefers-color-scheme` của OS.

### 4.6 Đổi màu chủ đạo về sau

1. Mở `app/styles/theme.css`.
2. Sửa `--color-primary`, `--color-ring`, `--color-accent`, ... bên trong `:root` (light) và `.dark` (dark).
3. **Không cần đụng vào file component nào khác.**

---

## 5. Hệ thống i18n (EN / VI)

### 5.1 Thư viện

- `i18next` — core
- `react-i18next` — React binding (`useTranslation`, `Trans`)
- Custom detector logic trong `app/providers/i18n-provider.tsx` đọc localStorage → navigator.languages → fallback

### 5.2 Cấu hình

File `app/shared/lib/i18n/index.ts`:

- `fallbackLng: "vi"` (mặc định tiếng Việt)
- `supportedLngs: ["en", "vi"]`
- Detector order: `localStorage` → `navigator`
- Storage key: `STORAGE_KEYS.language` = `"mangaka-lang"`
- Default namespace: `"common"`
- Namespaces hiện có: `["common", "welcome"]`

### 5.3 Cấu trúc locale (theo namespace)

Mỗi feature 1 namespace, mỗi namespace 1 file. Tránh đè key giữa feature và sẵn sàng cho lazy-load sau này.

```
app/locales/
├── en/
│   ├── common.json     # nameApp, theme, language, errors...
│   └── welcome.json    # title, subtitle, docs, discord...
└── vi/
    ├── common.json
    └── welcome.json
```

**Quy tắc khi thêm key:**

- Key phải có **trong CẢ hai** file EN và VI.
- Tổ chức theo feature: `auth.json`, `manga.json`, ...
- Không nhúng HTML thô vào value — dùng `<Trans>` nếu cần.
- Tránh ghép chuỗi (`"Hello " + name`). Dùng interpolation: `t("greet", { name })` với value `"Xin chào {{name}}"`.

### 5.4 Sử dụng trong component

```tsx
import { useTranslation } from 'react-i18next'

// Mặc định dùng namespace "common"
const { t, i18n } = useTranslation()
t('appName')

// Hoặc chỉ định namespace:
const { t } = useTranslation('welcome')
t('title')

// Đổi ngôn ngữ:
i18n.changeLanguage('en')
```

### 5.5 Thêm namespace mới (vd `auth`)

1. Tạo `app/locales/en/auth.json` và `app/locales/vi/auth.json`.
2. Mở `app/shared/lib/i18n/resources.ts`:
   - Thêm `import enAuth from "~/locales/en/auth.json"` (và VI).
   - Thêm `auth: enAuth` vào `resources.en` (và VI).
   - Thêm `"auth"` vào mảng `NAMESPACES`.
3. Dùng: `useTranslation("auth")`.

### 5.6 Lưu ý SSR / Hydration

- App đang chạy **SSR** (`react-router.config.ts`: `ssr: true`).
- `I18nProvider` (`app/providers/i18n-provider.tsx`) render `I18nextProvider` ngay từ lần đầu nhưng việc **detect & đổi ngôn ngữ** chỉ chạy trong `useEffect` (client) để tránh hydration mismatch khi đọc localStorage. Lần render server dùng `FALLBACK_LANGUAGE` (vi).
- Nếu cần render đúng ngôn ngữ ngay từ HTML server: chuyển sang lưu language trong **cookie** và đọc trong `loader` của route → truyền xuống provider.

---

## 6. Routing (React Router 7)

- Khai báo route: `app/routes.ts` (KHÔNG dùng folder convention auto-discovery).

  ```ts
  import { type RouteConfig, index, route } from '@react-router/dev/routes'

  export default [
    index('routes/home.tsx')
    // route("manga", "routes/manga.tsx"),
  ] satisfies RouteConfig
  ```

- Khi thêm route mới:
  1. Tạo file `app/routes/<name>.tsx` — **giữ thin**, chỉ compose `feature` tương ứng.
  2. Khai báo trong `app/routes.ts` qua helpers `index`, `route`, `layout`, `prefix`.
- Type của route được generate vào `./.react-router/types`. Import qua `import type { Route } from "./+types/<route-name>"`.
- Loader / action: pattern React Router v7 (`export async function loader({ request, params }) { ... }`).

---

## 7. Quy ước code

### 7.1 TypeScript

- `strict: true`. Tránh `any`. Thích `unknown` + narrow.
- `verbatimModuleSyntax: true` → import type phải có từ khoá `type`: `import type { Foo } from "..."`.
- Dùng `as const` + `satisfies` cho object cấu hình.
- Path alias `~/*` → `./app/*`.

### 7.2 Component

- Function declaration + named export. Default export chỉ ở entry route.
- Props interface cùng file, tên `XxxProps`.
- Một component / một file. Khi file > ~150 dòng cân nhắc tách.

### 7.3 Tổ chức code (ranh giới)

- **Khi một component chỉ một feature dùng** → đặt trong `app/features/<feature>/components/`.
- **Khi cần dùng ở 2+ feature** → kéo lên `app/shared/components/` (đã ráp, có business meaning) hoặc `app/shared/ui/` (primitive headless).
- **Helper function** thuần → `app/shared/lib/<topic>.ts`.
- **Hằng số / config** → `app/shared/config/`.
- **Provider cấp app** → `app/providers/`. Compose vào `app-providers.tsx`.

### 7.4 Styling

- **Luôn** dùng Tailwind utility + token semantic.
- Không viết CSS module trừ khi bất khả kháng.
- Dùng `cn()` từ `~/shared/lib/cn` để gộp class composable:
  ```tsx
  import { cn } from '~/shared/lib/cn'
  ;<div className={cn('p-4', isActive && 'bg-primary', className)} />
  ```
- Dark mode **không cần viết `dark:` cho mỗi màu** — token tự đổi theo class `dark`. Chỉ dùng `dark:` cho thay đổi _layout/visibility_ (vd `dark:hidden`).

### 7.5 File & naming

- File component: `kebab-case.tsx` (vd `welcome-header.tsx`).
- Tên React component: `PascalCase` (vd `WelcomeHeader`).
- Hook custom: `useXxx`, file `use-xxx.ts`.
- Locale key: `camelCase`, namespace tách bằng `.`.
- Mỗi feature có `index.ts` làm **public API barrel** — nơi khác chỉ import qua barrel: `import { WelcomePage } from "~/features/welcome"`.

### 7.6 Lint / Format / Typecheck

```bash
npm run typecheck    # react-router typegen + tsc
npm run lint         # ESLint flat config
npm run lint:fix
npm run prettier     # check format
npm run prettier:fix
```

---

## 8. Scripts có sẵn

| Lệnh                  | Mục đích                                             |
| --------------------- | ---------------------------------------------------- |
| `npm run dev`         | Dev server (HMR) tại `http://localhost:5173`         |
| `npm run build`       | Build production (SSR client + server bundle)        |
| `npm start`           | Chạy server bundle production                        |
| `npm run start:csr`   | Preview build SPA (vite preview)                     |
| `npm run typecheck`   | `react-router typegen && tsc`                        |
| `npm run lint`        | ESLint flat config                                   |
| `npm run lint:fix`    | ESLint với auto-fix                                  |
| `npm run prettier`    | Kiểm tra format                                      |
| `npm run orval`       | Codegen từ swagger → types + services + MSW handlers |
| `npm run orval:watch` | Codegen tự động khi swagger.json thay đổi            |

---

## 9. Skill / kiến thức cần có

Theo thứ tự ưu tiên:

1. **React 19** — function components, hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useId`, `use`, `forwardRef`), Suspense, error boundary.
2. **TypeScript** — generics, type narrowing, `as const`, `satisfies`, type-only imports, declaration merging cho env.
3. **React Router v7** — route module API (loader/action/meta/links), `<Outlet />`, `useNavigate`, `useNavigation`, `useFetcher`. Khác biệt SSR vs SPA mode.
4. **Tailwind CSS v4 (CSS-first)** — `@theme`, `@custom-variant`, đăng ký token qua CSS variables.
5. **i18next / react-i18next** — `useTranslation`, namespace, interpolation `{{var}}`, pluralization, language detector.
6. **Theming với CSS variables** — design token, contrast WCAG AA, test cả dark/light.
7. **SSR & hydration** — vì sao `localStorage`/`window` không truy cập được trong render đầu, `suppressHydrationWarning`, mount-then-render.
8. **Vite** — config plugins, env vars (`import.meta.env`).
9. **Accessibility** — landmark, `aria-label` cho icon-only button, focus-visible ring, contrast.
10. **(Sau)** Forms (`react-hook-form` + `zod`), data fetching (`@tanstack/react-query` hoặc loader của RR7), state mgmt nếu cần — chưa setup, đề xuất khi cần.

---

## 10. DO / DON'T

### ✅ DO

- Dùng class semantic (`bg-primary`, `text-foreground`...) cho **mọi màu**. Khi thiếu token, **mở rộng `app/styles/theme.css` trước**, rồi dùng class mới.
- Thêm string **vào CẢ EN và VI** cùng lúc, đúng namespace.
- Đặt component chỉ-1-feature-dùng trong `app/features/<feature>/components/`. Kéo lên `shared/` chỉ khi 2+ feature dùng.
- Mỗi feature export qua `index.ts` (barrel).
- Khi tạo route mới, đăng ký trong `app/routes.ts`.
- Bọc localStorage/window trong `useEffect` hoặc check `typeof window !== "undefined"`. Hoặc dùng helper `~/shared/lib/storage`.
- Dùng `cn()` cho mọi class merge có điều kiện.
- Chạy `npm run typecheck` trước khi báo done.

### ❌ DON'T

- **Không** tạo `tailwind.config.js` / `tailwind.config.ts` — Tailwind v4 không cần.
- **Không** cài `react-router-dom` (cũ).
- **Không** hard-code màu hex / class kiểu `bg-orange-500` trong component. Sai quy ước → phá tính năng switch theme.
- **Không** dùng `dark:bg-xxx` trùng nhiệm vụ token (chỉ dùng `dark:` cho layout/visibility).
- **Không** init `i18next` ở nhiều nơi — chỉ trong `app/shared/lib/i18n/index.ts`.
- **Không** import file dịch trực tiếp vào component — dùng `useTranslation()`.
- **Không** import chéo giữa các feature (`features/auth` ↔ `features/manga`). Cần share thì kéo lên `shared/`.
- **Không** import `features/*` từ `shared/*` (vi phạm dependency rule).
- **Không** import `mocks/*` hay `api/operations/*` từ `features/*` hay `shared/*` — mock code chỉ tồn tại trong `mocks/` và `entry.client.tsx`. Fetch functions từ `api/operations/` chỉ được gọi từ route loader/action.
- **Không** tạo `*.md` linh tinh / README phụ.
- **Không** đụng vào `Dockerfile`, `react-router.config.ts`, `vite.config.ts` trừ khi task yêu cầu.
- **Không** commit khi user chưa yêu cầu.

---

## 11. Recipe — việc thường gặp

### Thêm 1 feature mới (vd `auth`)

1. Tạo cấu trúc:
   ```
   app/features/auth/
   ├── components/
   │   └── login-form.tsx
   ├── hooks/                  (nếu cần, vd use-login.ts)
   ├── api/                    (nếu cần, vd auth-api.ts)
   ├── types.ts                (nếu cần)
   ├── auth-page.tsx
   └── index.ts                # export { AuthPage } from "./auth-page";
   ```
2. Tạo locale: `app/locales/{en,vi}/auth.json`, đăng ký vào `app/shared/lib/i18n/resources.ts`.
3. Tạo route entry: `app/routes/login.tsx` import `AuthPage` từ `~/features/auth`.
4. Đăng ký trong `app/routes.ts`: `route("login", "routes/login.tsx")`.

### Thêm 1 trang đơn (vd `/about`)

1. `app/routes/about.tsx` viết component (hoặc compose feature).
2. Khai báo trong `app/routes.ts`.
3. Thêm key dịch nếu có chữ.

### Thêm 1 ngôn ngữ mới (vd `ja`)

1. Tạo `app/locales/ja/{common,welcome}.json` đầy đủ key giống en/vi.
2. Sửa `app/shared/lib/i18n/resources.ts`:
   - `import jaCommon from "~/locales/ja/common.json"` (và các namespace khác).
   - Thêm `ja: { common: jaCommon, ... }` vào `resources`.
   - Thêm `"ja"` vào `SUPPORTED_LANGUAGES`.
3. `LanguageSwitcher` map qua `SUPPORTED_LANGUAGES` — chỉ cần cập nhật `LABEL`.

### Đổi màu chủ đạo (vd light = trắng/xanh lá, dark = đen/tím)

1. Mở `app/styles/theme.css`.
2. Sửa `--color-primary`, `--color-primary-foreground`, `--color-ring`, `--color-accent` (và token liên quan) trong `:root` và `.dark`.
3. Không cần đổi gì trong component nếu component đã tuân thủ dùng token.

### Thêm 1 UI primitive (vd `Input`)

1. Tạo `app/shared/ui/input.tsx`, theo pattern của `button.tsx`:
   - `forwardRef`, props extends HTML element props, nhận `className` để compose qua `cn()`.
   - Variant/size mappings.
2. Re-export trong `app/shared/ui/index.ts`.
3. Chỉ dùng class semantic — không hex.

### Thêm Provider cấp app mới (vd Toast / QueryClient)

1. Tạo `app/providers/<name>-provider.tsx`.
2. Bọc trong `app/providers/app-providers.tsx` đúng vị trí (tuỳ thuộc vào provider khác hay không).
3. **Không** gắn provider trực tiếp ở route con.

### Truy cập env var

```ts
import { env } from '~/shared/config/env'
fetch(`${env.API_URL}/mangas`)
```

Khi thêm biến: thêm vào `.env.local` với prefix `VITE_`, khai báo trong `interface ImportMetaEnv` ở `env.ts`, expose qua object `env`.

---

## 12. Mock API — MSW + Faker + Orval

### 12.1 Luồng hoạt động

```
VITE_ENABLE_MOCK=true
  → entry.client.tsx khởi động MSW browser worker
  → mọi fetch() trên browser bị intercept bởi mockServiceWorker.js
  → handler trong app/mocks/handlers/ trả về Faker data
  → FE dev không cần BE thật
```

### 12.2 Bật / tắt mock

Trong `.env.local`:

```env
VITE_ENABLE_MOCK=true   # bật mock
VITE_ENABLE_MOCK=false  # tắt mock, gọi API thật (cần VITE_API_URL)
```

### 12.3 Thêm mock endpoint mới (khi chưa có swagger)

1. Thêm factory vào `app/mocks/factories/<feature>.factory.ts`:

```ts
import { faker } from '@faker-js/faker'

export type Chapter = { id: string; mangaId: string; title: string; pageCount: number }

export function createChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: faker.string.uuid(),
    mangaId: faker.string.uuid(),
    title: faker.lorem.words(4),
    pageCount: faker.number.int({ min: 10, max: 60 }),
    ...overrides
  }
}
```

2. Thêm handler vào `app/mocks/handlers/<feature>.handler.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { createChapter } from '../factories/chapter.factory'

export const chapterHandlers = [
  http.get('/api/mangas/:mangaId/chapters', () => HttpResponse.json(Array.from({ length: 10 }, () => createChapter())))
]
```

3. Đăng ký vào `app/mocks/handlers/index.ts`:

```ts
import { chapterHandlers } from './chapter.handler'

export const handlers = [
  ...exampleHandlers,
  ...chapterHandlers // thêm dòng này
]
```

### 12.4 Khi BE có swagger — dùng Orval

1. Đặt file swagger: `./swagger.json` (hoặc cập nhật URL trong `orval.config.ts`).
2. Chạy: `npm run orval`
3. Orval generate vào:
   - `app/api/model/<tag>/` — TypeScript types, **chia theo tag** (auth, series, ...). Post-hook `organize-models-by-tag.mjs` tự tách từ flat ra folder.
   - `app/api/operations/<tag>/` — fetch functions, đã chia sẵn theo tag
   - `app/api/operations/<tag>/<tag>.msw.ts` — MSW handlers tự động
4. Import generated handlers vào `app/mocks/handlers/index.ts`, xoá handler viết tay tương ứng.
5. Dùng generated fetch functions trong route loader:

```ts
// app/routes/manga.tsx
import { getMangas } from '~/api/operations'

export async function loader() {
  const mangas = await getMangas()
  return { mangas }
}
```

### 12.5 Quy tắc với `app/api/`

- **KHÔNG** viết code tay trong `app/api/model/` và `app/api/operations/` — orval xoá sạch khi chạy lại.
- **CHỈ** viết tay trong `app/api/mutator/custom-fetch.ts` (đây là wrapper, không bị orval xoá).
- Factory trong `app/mocks/factories/` sẽ dùng types từ `app/api/model/<tag>/` (khuyến nghị import từ tag folder cụ thể, không dùng root barrel).

---

## 13. Câu hỏi mở / chưa giải quyết

CHƯA có trong repo, agent đừng giả định:

- **Authentication / authorization** — chưa.
- **Data fetching layer** — chưa có TanStack Query. Hiện dùng `fetch` qua `customFetch` mutator + loader của RR7. Xem xét TanStack Query sau khi có auth.
- **State management** — chưa có Zustand/Redux. Trạng thái dùng React context (Theme, i18n).
- **Form / validation** — chưa có react-hook-form + zod.
- **UI library** — không dùng MUI/Ant/shadcn, tự xây trên Tailwind + token (`shared/ui/button.tsx` làm mẫu).
- **Test** — chưa có Vitest / Playwright.
- **Swagger / OpenAPI** — BE chưa sẵn sàng. `orval.config.ts` đã config, chỉ cần BE cung cấp URL hoặc file `swagger.json`.

Khi cần thêm thư viện ngoài, **đề xuất rõ trong phản hồi và chờ confirm** trước khi `npm install`.
