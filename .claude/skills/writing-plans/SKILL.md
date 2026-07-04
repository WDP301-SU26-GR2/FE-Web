---
name: writing-plans
description: Use BEFORE non-trivial implementation (3+ files, new feature, refactor). Write a structured plan in conversation that lists files to change, expected behavior, and verification steps. Get user approval BEFORE writing code. Triggers when user says "implement X", "add feature Y", "refactor Z".
---

# Writing Plans

Khi task chạm ≥3 file hoặc tạo feature mới: **viết plan trước, code sau**.

## Cấu trúc plan

```markdown
## Plan: <ten task>

### Mục tiêu

1 câu mô tả outcome user-facing.

### Files affected

- `app/features/manga/manga-page.tsx` — CREATE — entry page
- `app/features/manga/components/manga-list.tsx` — CREATE — grid
- `app/routes/mangas.tsx` — CREATE — thin route wrapper
- `app/routes.ts` — EDIT — thêm route entry
- `app/locales/{en,vi}/manga.json` — CREATE — i18n keys
- `app/shared/lib/i18n/resources.ts` — EDIT — đăng ký namespace

### Behavior

- URL `/mangas` render grid 3 cột, fetch từ `/api/mangas` (mock đang trả 10 items).
- Mỗi card click → `/mangas/:id` (chưa làm, ra task sau).
- Loading state dùng key `common.loading`.
- Empty state nếu items.length = 0.

### Verification

- `npm run typecheck` clean.
- Mở `http://localhost:5173/mangas` thấy grid.
- Toggle dark mode không vỡ.
- Switch EN ↔ VI hoạt động.

### Out of scope (làm sau)

- Detail page `/mangas/:id`.
- Search / filter.
- Pagination.
```

## Quy tắc

1. **Plan đi vào conversation**, không tạo file `.md` plan trừ khi user yêu cầu.
2. Liệt kê file cụ thể với action: `CREATE` / `EDIT` / `DELETE`.
3. Behavior phải mô tả được **user-facing** (không phải "tạo component X" mà là "user thấy gì").
4. Section **Out of scope** quan trọng — chống scope creep.
5. Sau khi viết plan → **dừng, chờ user duyệt**. Không tự code.

## Khi nào KHÔNG cần plan

- Sửa 1 file, 1-2 dòng (typo, color tweak, copy fix).
- Bug fix scope nhỏ rõ ràng.
- Task user đã mô tả chi tiết tới mức plan trùng lặp.

## Plan thay đổi mid-task

Nếu trong lúc implement phát hiện plan sai (vd cần thêm file ngoài plan, hoặc cách tiếp cận không work):

1. **STOP code.**
2. Báo user: "Plan cũ không work vì X. Đề xuất Y."
3. Chờ confirm trước khi tiếp tục.

KHÔNG silent deviate khỏi plan đã duyệt.
