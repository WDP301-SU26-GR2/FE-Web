---
description: Scaffold một feature mới theo chuẩn mangaka-web (FSD-lite)
argument-hint: <feature-name>
---

Tạo feature mới tên `$ARGUMENTS` cho `mangaka-web`. Đọc `AGENTS.md` §11 và `ARCHITECTURE.md` §3 trước nếu chưa thuộc quy ước.

## Bước 1 — Tạo cấu trúc thư mục

```
app/features/$ARGUMENTS/
├── components/                  # component nội bộ
├── hooks/                       # custom hook (tạo khi cần)
├── api/                         # gọi API (tạo khi cần)
├── types.ts                     # type của feature
├── $ARGUMENTS-page.tsx          # entry page component
└── index.ts                     # public API barrel
```

Quy ước:

- File component `kebab-case.tsx`, React component `PascalCase`.
- `index.ts` chỉ export public API (vd `export { XxxPage } from "./xxx-page"`).
- Component dùng class **semantic** (`bg-card`, `text-foreground`...), KHÔNG hex color.
- Import qua alias `~/...`.

## Bước 2 — Tạo i18n namespace

1. Tạo `app/locales/en/$ARGUMENTS.json` và `app/locales/vi/$ARGUMENTS.json` với ít nhất key `title`.
2. Đăng ký namespace trong `app/shared/lib/i18n/resources.ts`:
   - Thêm import `enXxx`, `viXxx`.
   - Thêm vào `resources.en` và `resources.vi`.
   - Thêm tên namespace vào mảng `NAMESPACES`.

## Bước 3 — KHÔNG tự đăng ký route

Dừng lại và hỏi user URL muốn mount feature (vd `/mangas`, `/manga/:id`). Sau khi user xác nhận, mới:

- Tạo `app/routes/<url>.tsx` thin wrapper import từ `~/features/$ARGUMENTS`.
- Thêm vào `app/routes.ts`.

## Bước 4 — Verify

Chạy `npm run typecheck`. Báo cáo file đã tạo + key i18n cần dịch lại nếu placeholder.

## Cấm

- KHÔNG import từ feature khác. Cần share → kéo lên `app/shared/`.
- KHÔNG hard-code chuỗi — phải qua `useTranslation`.
- KHÔNG tạo `tailwind.config.*` hay cài `react-router-dom`.
