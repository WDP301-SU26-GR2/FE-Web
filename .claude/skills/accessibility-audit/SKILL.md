---
name: accessibility-audit
description: Use when adding interactive UI (button, form, modal, dropdown), or when user asks "is this accessible", "a11y check", "WCAG". Ensures keyboard nav, ARIA, contrast, semantic HTML. Triggers on "a11y", "accessibility", "screen reader", "keyboard", "WCAG".
---

# Accessibility Audit

mangaka-web phục vụ tác giả + độc giả manga — UI phải dùng được bằng keyboard, screen reader, đủ contrast.

## Checklist tối thiểu (per component)

### 1. Semantic HTML

- Dùng tag đúng nghĩa: `<button>` cho action, `<a>` cho navigation, `<nav>`, `<main>`, `<article>`, `<section>`.
- ❌ Không `<div onClick={...}>` thay button — mất keyboard + screen reader.
- ❌ Không `<a href="#" onClick={...}>` — dùng button nếu không navigate.
- Heading hierarchy đúng (`h1` → `h2` → `h3`), không skip cấp.

### 2. Keyboard navigation

- Mọi interactive element phải **focusable** (Tab tới được).
- **Focus order** logic theo visual (không nhảy lung tung).
- **Focus visible**: ring rõ ràng. Repo dùng `focus:ring-2 focus:ring-ring` — không tắt outline mà thay bằng ring.
- **Escape** đóng modal/dropdown.
- **Enter / Space** kích hoạt button (native button đã có sẵn).
- **Arrow keys** trong list (vd grid manga) → optional nhưng nice.

### 3. ARIA — chỉ khi cần

- Icon-only button: `aria-label="..."` (xem [theme-toggle.tsx](app/shared/components/theme-toggle.tsx)).
- Toggle: `aria-pressed={active}` (xem [language-switcher.tsx](app/shared/components/language-switcher.tsx)).
- Loading state: `aria-busy="true"` + `aria-live="polite"` cho announce.
- Dialog: `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- ❌ Đừng nhồi ARIA khi semantic HTML đã đủ. Native `<button>` không cần `role="button"`.

### 4. Form

- Mọi `<input>` có `<label htmlFor>` (hoặc `aria-label`).
- Error message liên kết qua `aria-describedby`.
- Required: `aria-required="true"` hoặc HTML `required`.
- Submit phải có `<button type="submit">`, không Enter-only.

### 5. Contrast (WCAG AA)

- Text thường: contrast ratio ≥ 4.5:1.
- Text lớn (≥18pt hoặc 14pt bold): ≥ 3:1.
- UI component / icon: ≥ 3:1.
- Token repo đã chỉnh đủ contrast — KIỂM TRA khi đổi `theme.css`.
- Tool check: Chrome DevTools → Lighthouse → Accessibility, hoặc extension axe DevTools.

### 6. i18n + a11y

- `<html lang>` đúng — repo đã sync qua `I18nProvider`.
- Đừng để text bị cắt khi VI dài hơn EN — test cả 2 ngôn ngữ.
- `aria-label` cũng phải qua `useTranslation()`, không hardcode.

### 7. Images

- `<img alt="...">` mô tả nội dung. Alt rỗng (`alt=""`) cho ảnh decoration.
- Manga cover: alt = tên truyện (vd `alt={manga.title}`).

### 8. Motion

- Respect `prefers-reduced-motion`: `motion-reduce:transition-none`.

## Workflow

1. **Build feature first**, audit a11y sau.
2. **Keyboard test**: tab qua toàn trang, không chạm chuột → mọi action làm được?
3. **Screen reader spot check**: NVDA (Windows) hoặc VoiceOver (Mac) đọc 1 vòng.
4. **DevTools Lighthouse**: chạy audit accessibility, fix red/orange.
5. **axe DevTools** extension: scan deeper.

## Anti-pattern

- ❌ `tabIndex={-1}` để "đẹp" → mất accessibility.
- ❌ `outline: none` không có thay thế → mù focus.
- ❌ Placeholder thay label.
- ❌ Color-only signal (chỉ đỏ = error, không text/icon kèm) — mù màu không thấy.
- ❌ Disable button mà không giải thích vì sao (dùng tooltip + `aria-describedby`).
