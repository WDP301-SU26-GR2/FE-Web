---
inclusion: always
---

# Product — Mangaka

## What it is

**Mangaka** là nền tảng web cho **tác giả/hoạ sĩ truyện tranh** đăng và xuất bản manga, kèm tính năng cho độc giả đọc. Dự án FPT University, semester 8, môn **WDP**.

## Repo này

`mangaka-web` — frontend SPA + SSR. Backend riêng (dự án `BE-dev-mangaka` của team).

## End users

- **Tác giả/hoạ sĩ**: tạo truyện, upload chapter, quản lý series.
- **Độc giả**: duyệt, đọc, follow truyện.
- **Admin**: kiểm duyệt nội dung.

## UX requirements

- **Đa ngôn ngữ**: mặc định tiếng Việt, hỗ trợ English. Mọi chuỗi user-facing **phải** đi qua i18next, không hardcode.
- **Dark/light mode**: token-driven, người dùng chủ động toggle, persist localStorage.
- **Anti-FOUC**: script đồng bộ trong `<head>` áp class `dark` trước hydrate.
- **SSR mặc định** (SEO + first paint nhanh): mọi component phải SSR-safe (không touch `window`/`localStorage` trong render).
- **Accessibility**: keyboard nav, ARIA cho icon-only button, contrast WCAG AA.

## Nguyên tắc cốt lõi

> _Dễ bảo trì, dễ mở rộng, đa ngôn ngữ, đa theme._
