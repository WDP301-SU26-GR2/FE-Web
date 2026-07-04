---
inclusion: always
---

# Hard Rules — mangaka-web

## ✅ DO

- Dùng class semantic (`bg-primary`, `text-foreground`...) cho **mọi màu**. Thiếu token → mở rộng `app/styles/theme.css` trước.
- Thêm i18n string vào **CẢ EN và VI** cùng lúc, đúng namespace.
- Đặt component chỉ-1-feature-dùng trong `app/features/<feature>/components/`. Kéo lên `shared/` chỉ khi 2+ feature dùng.
- Mỗi feature export qua `index.ts` (barrel).
- Khi tạo route mới, đăng ký trong `app/routes.ts`.
- Bọc localStorage/window trong `useEffect` hoặc check `typeof window !== "undefined"`. Hoặc dùng helper `~/shared/lib/storage`.
- Dùng `cn()` cho mọi class merge có điều kiện.
- Chạy `npm run typecheck` trước khi báo done.
- Ưu tiên path alias `~/...` thay vì relative path dài.
- Đề xuất rõ trước khi `npm install` thư viện ngoài.

## ❌ DON'T

- **KHÔNG** tạo `tailwind.config.js` / `tailwind.config.ts` — Tailwind v4 không cần.
- **KHÔNG** cài `react-router-dom` (cũ). Dùng `react-router` v7.
- **KHÔNG** hard-code màu hex / class kiểu `bg-orange-500` trong component. Sai quy ước → phá tính năng switch theme.
- **KHÔNG** dùng `dark:bg-xxx` trùng nhiệm vụ token (chỉ dùng `dark:` cho layout/visibility).
- **KHÔNG** init `i18next` ở nhiều nơi — chỉ trong `app/shared/lib/i18n/index.ts`.
- **KHÔNG** import file dịch trực tiếp vào component — dùng `useTranslation()`.
- **KHÔNG** import chéo giữa các feature. Cần share thì kéo lên `shared/`.
- **KHÔNG** import `features/*` từ `shared/*` (vi phạm dependency rule).
- **KHÔNG** import `mocks/*` hay `api/operations/*` từ `features/*` hay `shared/*`.
- **KHÔNG** sửa tay file trong `app/api/model/` và `app/api/operations/` — Orval xoá khi regenerate. Customize fetch trong `app/api/mutator/custom-fetch.ts`.
- **KHÔNG** đặt business logic / fetch / state trong route file — kéo vào feature.
- **KHÔNG** tạo `*.md` linh tinh / README phụ.
- **KHÔNG** đụng vào `Dockerfile`, `react-router.config.ts`, `vite.config.ts` trừ khi task yêu cầu.
- **KHÔNG** commit khi user chưa yêu cầu.

## Workflow

1. **Brainstorm** task mơ hồ → explore options trước, không code ngay.
2. **Plan** trước khi implement non-trivial (≥3 file) → liệt kê file affected + behavior + verification.
3. **Implement** thay đổi nhỏ, đúng boundary, không patch ad-hoc.
4. **Review** — soat lại logic, typing, i18n/theme impact.
5. **Finish** — chạy typecheck + lint + check golden path + cập nhật docs.

## Principle

- Evidence over claims.
- Simplicity over cleverness.
- Maintainability over speed.
- Validate at boundaries, trust internals.
- Find root cause, don't patch symptoms.
