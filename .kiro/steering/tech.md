---
inclusion: always
---

# Tech Stack — mangaka-web

| Lớp                | Công nghệ                          | Phiên bản |
| ------------------ | ---------------------------------- | --------- |
| Framework          | React Router 7 (SSR mặc định)      | `7.14.0`  |
| UI Runtime         | React + React DOM                  | `^19.2.4` |
| Ngôn ngữ           | TypeScript (strict)                | `^5.9.3`  |
| Build / Dev server | Vite                               | `^8.0.3`  |
| CSS                | Tailwind CSS v4 (CSS-first config) | `^4.2.2`  |
| i18n               | i18next + react-i18next + detector | mới nhất  |
| Class merge util   | clsx + tailwind-merge (`cn()`)     | mới nhất  |
| Mock API           | MSW + @faker-js/faker              | mới nhất  |
| API codegen        | Orval (chạy khi BE có swagger)     | mới nhất  |

## Critical version constraints

- **React Router v7** — KHÔNG dùng `react-router-dom` (cũ).
- **Tailwind v4** — CSS-first config, KHÔNG tạo `tailwind.config.js`/`tailwind.config.ts`. Token đăng ký qua `@theme inline` trong `app/styles/app.css`, giá trị nằm trong `app/styles/theme.css`.
- **TypeScript** — `verbatimModuleSyntax: true` → import type phải có từ khoá `type`: `import type { Foo } from "..."`.

## Scripts

| Lệnh                | Mục đích                                             |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Dev server (HMR) tại `http://localhost:5173`         |
| `npm run build`     | Build production (SSR client + server bundle)        |
| `npm start`         | Chạy server bundle production                        |
| `npm run start:csr` | Preview build SPA (vite preview)                     |
| `npm run typecheck` | `react-router typegen && tsc`                        |
| `npm run lint`      | ESLint flat config                                   |
| `npm run prettier`  | Kiểm tra format                                      |
| `npm run orval`     | Codegen từ swagger → types + services + MSW handlers |

## Path alias

`~/*` → `./app/*` (config trong `tsconfig.json`). Ưu tiên alias thay vì relative path dài.

## Chưa có trong repo (đừng giả định)

- Authentication / authorization
- TanStack Query (đang dùng RR7 loader + custom fetch mutator)
- State management (Zustand/Redux) — đang dùng React context
- Form library (react-hook-form + zod)
- UI library (MUI/Ant/shadcn) — tự xây trên Tailwind + token
- Test framework (Vitest / Playwright)
- Swagger / OpenAPI (Orval đã config sẵn, chờ BE)

Khi cần thêm thư viện, **đề xuất rõ và chờ confirm** trước khi `npm install`.
