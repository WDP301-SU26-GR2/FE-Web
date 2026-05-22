---
name: defensive-programming
description: Use to decide WHERE to validate inputs and WHERE to trust them. Validate only at system boundaries (user input, external APIs, untrusted data). Trust internal code and framework guarantees. Prevents over-engineering and useless try/catch noise.
---

# Defensive Programming — Where to Validate

**Nguyên tắc**: validate ở **boundary**, trust ở **internal**.

## Boundaries (PHẢI validate)

Nơi data từ ngoài đi vào hệ thống:

1. **User input** — form fields, URL params, query strings, file uploads.
2. **External API** — response từ BE, third-party service.
3. **Storage layer** — localStorage, cookie, IndexedDB (user có thể đã sửa tay).
4. **Environment variables** — `env.API_URL` có thể rỗng.
5. **`fetch()` results** — `response.ok` false? `response.json()` throw?

Cách validate: zod schema, type guard, runtime check + early return / throw with clear message.

## Internal (TRUST, không validate lại)

Nơi data đã qua boundary và đi giữa các function nội bộ:

1. **Function nhận data đã type-checked bởi TS** — không cần `if (!data) throw`.
2. **Provider context** — `useTheme()` đã được guard trong hook, consumer không cần check `theme === undefined`.
3. **Function call ngay sau type guard** — đã narrow rồi, không re-check.

## Ví dụ — manga page

### ❌ Over-defensive (noise)

```tsx
export function MangaCard({ manga }: { manga: Manga }) {
  if (!manga) return null;                    // TS đảm bảo manga là Manga
  if (!manga.id) return null;                 // type Manga đã require id
  if (typeof manga.title !== "string") ...    // TS guarantee
  try {
    return <article>{manga.title}</article>;  // không có gì throw ở đây
  } catch (e) {
    console.error(e);
    return null;
  }
}
```

### ✅ Đúng

```tsx
export function MangaCard({ manga }: { manga: Manga }) {
  return <article>{manga.title}</article>;
}

// Validate ở boundary — nơi fetch:
async function fetchMangas(): Promise<Manga[]> {
  const res = await fetch("/api/mangas");
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  const body = await res.json();
  return MangaListSchema.parse(body).items;   // ← validate Ở ĐÂY
}
```

## Quy tắc cụ thể cho mangaka-web

1. **localStorage read** — luôn dùng `~/shared/lib/storage` (đã wrap safe).
2. **localStorage parse** — nếu lưu JSON, parse có thể throw → wrap try/catch và fallback.
3. **Route loader** — validate params (`params.id` có thể undefined trong type generated).
4. **Form submit** — dùng zod ở edge (route action), không sprinkle validate trong component.
5. **MSW handler input** — `params.id` luôn là `string | readonly string[]`, narrow trước khi dùng.

## Try/catch — chỉ khi

- Code có thể **thực sự throw** (network, parse JSON, localStorage quota).
- Có handler ý nghĩa: fallback, retry, user message. Không phải `catch (e) {}` (swallow lỗi).
- Log error có thông tin (không chỉ `console.error(e)` mà context: "Failed to load manga list", e).

## Anti-pattern

- ❌ `catch (e) {}` (swallow lỗi không trace được).
- ❌ Validate cùng 1 data ở 5 layer.
- ❌ `if (data) {...}` khi TS đã đảm bảo non-null.
- ❌ Fallback default value cho mọi prop optional (làm bug ẩn nặng hơn).
