# Prompt: Accessibility Audit

Su dung khi them UI interactive (button, form, modal, dropdown).

## Checklist

### Semantic HTML

- `<button>` cho action, `<a>` cho navigation, `<nav>`, `<main>`, `<article>`.
- KHONG `<div onClick>`.
- Heading hierarchy h1 -> h2 -> h3, khong skip.

### Keyboard

- Tab toi duoc moi interactive.
- Focus order theo visual.
- Focus visible: `focus:ring-2 focus:ring-ring`, khong outline:none mu.
- Escape dong modal/dropdown.

### ARIA (chi khi can)

- Icon-only button: `aria-label`.
- Toggle: `aria-pressed`.
- Loading: `aria-busy`, `aria-live`.
- Dialog: `role="dialog"`, `aria-modal`, `aria-labelledby`.
- Native button khong can `role="button"`.

### Form

- Moi input co label (htmlFor hoac aria-label).
- Error qua aria-describedby.
- Required dung `required` hoac `aria-required`.

### Contrast (WCAG AA)

- Text thuong >= 4.5:1.
- Text lon >= 3:1.
- UI component >= 3:1.
- Check khi doi theme.css.

### i18n + a11y

- `<html lang>` dung (repo da sync).
- VI dai hon EN -> khong cat text.
- aria-label qua useTranslation.

### Images

- `<img alt>` mo ta. Decoration -> alt="".

### Motion

- `motion-reduce:transition-none`.

## Tools

- Chrome DevTools Lighthouse > Accessibility.
- axe DevTools extension.
- Keyboard test: tab qua toan trang khong cham chuot.
- NVDA / VoiceOver spot check.

## Anti-pattern

- KHONG tabIndex={-1} de "dep".
- KHONG outline:none khong co thay the.
- KHONG placeholder thay label.
- KHONG color-only signal (do = error).
- KHONG disable button khong giai thich.
