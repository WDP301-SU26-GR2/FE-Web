---
inclusion: always
---

# Structure — mangaka-web

Kiến trúc lấy cảm hứng từ **Feature-Sliced Design** (tinh giản).

## Folder layout

```
mangaka-web/
├── app/
│   ├── root.tsx                       # Root layout, gắn AppProviders + theme init script
│   ├── routes.ts                      # Khai báo route (config object)
│   ├── routes/                        # Route entry — THIN: chỉ compose feature
│   │
│   ├── features/                      # Business features, mỗi feature là 1 module độc lập
│   │   └── welcome/
│   │       ├── assets/                # Asset riêng của feature
│   │       ├── components/            # Component nội bộ chỉ feature này dùng
│   │       ├── welcome-page.tsx       # Trang chính (export ra cho route)
│   │       └── index.ts               # Public API barrel
│   │
│   ├── shared/                        # Tái sử dụng cross-feature
│   │   ├── ui/                        # UI primitives generic (Button, Input...)
│   │   ├── components/                # Component cấp app, đã ráp (ThemeToggle...)
│   │   ├── hooks/                     # Hook generic
│   │   ├── lib/                       # Utils thuần (cn, storage, i18n)
│   │   ├── config/                    # site.ts, env.ts
│   │   └── types/                     # Global types
│   │
│   ├── providers/                     # React context provider cấp app
│   │   ├── app-providers.tsx          # Compose all (DÙNG CÁI NÀY ở root.tsx)
│   │   ├── theme-provider.tsx
│   │   └── i18n-provider.tsx
│   │
│   ├── styles/
│   │   ├── app.css                    # @import tailwind + @theme inline
│   │   └── theme.css                  # CSS variables — chỉnh màu chủ đạo TẠI ĐÂY
│   │
│   ├── locales/
│   │   ├── en/{common,welcome}.json
│   │   └── vi/{common,welcome}.json
│   │
│   ├── mocks/                         # MSW mock server (dev only)
│   │   ├── browser.ts
│   │   ├── handlers/                  # Barrel + handler viết tay
│   │   └── factories/                 # Faker data factories
│   │
│   ├── api/                           # API layer (phần lớn do orval generate)
│   │   ├── model/                     # ← orval: TypeScript types (KHÔNG sửa tay)
│   │   ├── operations/                # ← orval: fetch functions (KHÔNG sửa tay)
│   │   └── mutator/
│   │       └── custom-fetch.ts        # Custom fetch wrapper (sửa tay được)
│   │
│   └── entry.client.tsx               # Client entry — khởi động MSW trong dev
│
├── public/
│   └── mockServiceWorker.js           # MSW service worker
├── orval.config.ts                    # Orval codegen config
├── react-router.config.ts             # ssr: true
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
└── package.json
```

## Dependency rules (HARD constraints)

```
routes ─┬─► features ─┐
        │             ├─► shared ─► (libs, không bao giờ import ngược lên)
        └─► providers ┘
```

- `routes/*` chỉ import `features/*` và (đôi khi) `shared/*`.
- `features/<x>/*` được dùng `shared/*`. **KHÔNG** import lẫn nhau giữa features.
- `shared/*` **không bao giờ** import `features/*` hay `routes/*`.
- `providers/*` chỉ dùng `shared/*`.
- `features/*` và `shared/*` **không** import `mocks/*` — mock chỉ tồn tại trong `mocks/` và `entry.client.tsx`.
- `api/operations/*` chỉ gọi từ **route loader/action** hoặc feature hook. KHÔNG gọi trong component render.

## Conventions

- File component: `kebab-case.tsx` (vd `welcome-header.tsx`).
- React component: `PascalCase` (vd `WelcomeHeader`).
- Hook custom: `useXxx`, file `use-xxx.ts`.
- Locale key: `camelCase`, namespace tách bằng `.`.
- Mỗi feature có `index.ts` làm public API barrel.
- Function declaration + named export. Default export chỉ ở route entry.
- File > ~150 dòng cân nhắc tách.

## Theming

- Mọi màu khai báo dưới dạng CSS variable trong `app/styles/theme.css`.
- Component dùng class **semantic** (`bg-primary`, `text-foreground`...). **TUYỆT ĐỐI** không hard-code màu (`bg-orange-500`).
- Đổi màu chủ đạo: chỉ sửa `--color-*` trong `:root` và `.dark` của `theme.css`.

## i18n

- Mọi chuỗi user-facing qua `useTranslation()`. KHÔNG hardcode.
- Key mới phải có **cả EN và VI**.
- Namespace mới: tạo file locale + đăng ký vào `app/shared/lib/i18n/resources.ts`.
