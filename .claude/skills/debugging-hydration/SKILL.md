---
name: debugging-hydration
description: Use when seeing "hydration mismatch", "did not match server HTML", different render between SSR and client, or content flashing/jumping after page load. mangaka-web runs SSR by default so hydration bugs are common. Triggers on "hydration", "FOUC", "flash of unstyled", "mismatch".
---

# Debugging React Hydration Mismatches

mangaka-web chạy **SSR mặc định** (`react-router.config.ts`: `ssr: true`). Server render HTML → client hydrate React lên đó. Nếu render server ≠ render client lần đầu → **hydration mismatch**.

## Triệu chứng

- Console warning: `Hydration failed because the server rendered HTML didn't match...`
- UI nhấp nháy / nhảy ngay sau load (FOUC).
- Component không react với event sau khi load (hydration aborted).
- `useEffect` chạy nhưng state không update.

## Nguyên nhân thường gặp trong repo này

### 1. Truy cập `window` / `localStorage` trong render
Server không có `window`. Nếu component render dùng:
```tsx
const theme = localStorage.getItem("theme"); // ❌ throw on SSR
```
→ Server render fallback, client render khác → mismatch.

**Fix**: bọc trong `useEffect` (mount-then-state pattern, xem [theme-provider.tsx](app/providers/theme-provider.tsx)) hoặc dùng `~/shared/lib/storage` (đã guard `typeof window`).

### 2. Render time-dependent value
```tsx
<p>{new Date().toLocaleString()}</p> // ❌ server time ≠ client time
<p>{Math.random()}</p>              // ❌
```
**Fix**: render placeholder server-side, update trong `useEffect`. Hoặc dùng `suppressHydrationWarning` nếu chủ ý.

### 3. Render khác theo `prefers-color-scheme` hay locale browser
Server không biết browser preference. Nếu component render khác theo `matchMedia` → mismatch.

**Fix**: pattern đã có trong repo — `themeInitScript` inject vào `<head>` áp class `dark` **trước hydrate**. React hydrate sau đó thấy class đã đúng.

### 4. i18n đổi language client-side trước hydrate
`I18nProvider` detect language trong `useEffect`. Lần render server dùng `FALLBACK_LANGUAGE` (vi). Nếu user chọn EN, client mount đổi → render khác → mismatch.

**Fix hiện tại**: chấp nhận lần render đầu là VI, sau effect mới đổi. Để render đúng từ server: lưu language trong **cookie** + đọc trong route loader (xem AGENTS.md §5.6).

### 5. Conditional render dựa trên `typeof window`
```tsx
{typeof window !== "undefined" && <ClientOnlyThing />}
```
→ Server không render, client render. Mismatch.

**Fix**: dùng pattern `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])` rồi `{mounted && <ClientOnlyThing />}`. Hoặc dynamic import với `ssr: false`.

### 6. HTML invalid (browser auto-fix)
`<p><div>...</div></p>` — browser tự đóng `<p>` trước `<div>` → DOM khác HTML string. → Hydration mismatch.

**Fix**: validate semantic HTML. Không nest block-level trong inline.

## Workflow debug

1. **Đọc warning đầy đủ** — React 19 in ra cây mismatch chính xác.
2. **Disable JS** (DevTools → Settings → Disable JavaScript) → reload → xem HTML server thuần. So sánh với render client (enable JS lại).
3. **Identify branch**: render khác do logic nào? Time? Random? Window? Storage?
4. **Move to effect**: chuyển logic gây khác biệt vào `useEffect`, render placeholder ban đầu.
5. **Verify**: reload nhiều lần, không thấy warning.

## Anti-pattern

- ❌ Đặt `suppressHydrationWarning` lung tung để giấu warning. Chỉ dùng khi **biết chính xác lý do** và chấp nhận (vd timestamp render).
- ❌ Wrap toàn component bằng `if (typeof window === "undefined") return null` → mất SSR benefit.
- ❌ Disable SSR (`ssr: false`) để né hydration — mất SEO + slow first paint.
