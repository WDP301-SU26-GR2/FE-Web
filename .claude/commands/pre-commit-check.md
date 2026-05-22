---
description: Chạy gate quality trước khi user commit / merge
---

Chạy đầy đủ check để xác minh branch sẵn sàng commit. Báo cáo từng bước.

## 1. Type check

```bash
npm run typecheck
```

Nếu fail → STOP, liệt kê file + line lỗi, đề xuất fix.

## 2. Lint

```bash
npm run lint
```

Nếu có warning/error → đề xuất chạy `npm run lint:fix` hoặc fix tay.

## 3. Prettier

```bash
npm run prettier
```

Nếu format lệch → đề xuất `npm run prettier:fix`.

## 4. i18n parity check

So sánh số lượng & path key giữa `app/locales/en/<ns>.json` và `app/locales/vi/<ns>.json` cho từng namespace trong `NAMESPACES` của `app/shared/lib/i18n/resources.ts`. Báo:
- Key có ở EN mà thiếu VI (hoặc ngược lại).
- Namespace có trong locale folder nhưng chưa đăng ký vào `resources.ts`.

## 5. Architecture guard (read-only check)

Grep nhanh để phát hiện vi phạm quy ước:
- `grep -rn "from \"~/features/" app/shared app/providers` → phải rỗng (shared/providers không được import features).
- `grep -rn "import.*from \"~/mocks" app/features app/shared` → phải rỗng (features/shared không import mocks).
- `grep -rEn "(bg|text|border|ring)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]" app` → phải rỗng (không hardcode color của Tailwind palette, dùng semantic token).
- `grep -rn "react-router-dom" app package.json` → phải rỗng.

## 6. Báo cáo tổng

Format:
- ✅ Typecheck pass
- ✅ Lint clean
- ⚠️ i18n: thiếu key `auth.forgotPassword` ở `vi/auth.json`
- ❌ Architecture: `app/shared/components/foo.tsx:12` import từ `~/features/auth`

Cuối cùng kết luận: **READY** / **NEEDS FIX**.
