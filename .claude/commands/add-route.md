---
description: Đăng ký 1 route mới vào react-router v7, giữ route file thin
argument-hint: <url-path> <feature-name>
---

Đăng ký route mới. Argument: `$ARGUMENTS` (vd `mangas manga` → URL `/mangas` mount `~/features/manga`).

## Bước 1 — Kiểm tra feature tồn tại

- Đọc `app/features/<feature-name>/index.ts`.
- Nếu chưa có → STOP, yêu cầu user chạy `/new-feature <feature-name>` trước.
- Lấy tên page component export ra (vd `MangaPage`).

## Bước 2 — Tạo route entry

Tạo `app/routes/<url-path>.tsx` **THIN** (chỉ compose, không có business logic):

```tsx
import { XxxPage } from "~/features/<feature-name>";
import type { Route } from "./+types/<url-path>";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "<Title> - Mangaka" },
    { name: "description", content: "<desc>" },
  ];
}

export default function <UrlPathPascal>() {
  return <XxxPage />;
}
```

Tiêu đề lấy từ i18n nếu khả thi, hoặc đặt placeholder và hỏi user.

## Bước 3 — Đăng ký vào routes.ts

Mở `app/routes.ts`, thêm dòng:

```ts
route("<url-path>", "routes/<url-path>.tsx"),
```

vào mảng default export. Giữ thứ tự alphabetical hoặc theo grouping logic.

## Bước 4 — Verify

- `npm run typecheck` (sẽ chạy `react-router typegen` sinh types vào `.react-router/types`).
- Báo URL đầy đủ (vd `http://localhost:5173/mangas`).

## Cấm

- KHÔNG đặt business logic / fetch / state trong route file — kéo vào feature.
- KHÔNG tạo route mà chưa có feature tương ứng.
