---
name: brainstorming
description: Use BEFORE coding when scope is unclear, requirements are ambiguous, or user asks "how should we approach X". Explore options, edge cases, and tradeoffs FIRST instead of jumping to implementation. Triggers on phrases like "what do you think", "how should we", "any ideas", "approach", "options".
---

# Brainstorming

Khi user mô tả task mơ hồ hoặc hỏi định hướng, **KHÔNG code ngay**. Thay vào đó:

## 1. Restate problem

Diễn giải lại task bằng 1-2 câu để confirm hiểu đúng. Nếu sai → user sửa sớm, đỡ phí công.

## 2. Surface assumptions

Liệt kê assumption bạn đang giả định (vd "tui đoán bạn muốn route /mangas hiển thị grid 3 cột, có search bar, dùng loader của RR7"). User confirm hoặc correct.

## 3. Generate 2-3 options

Đưa ra **vài approach khác nhau** kèm tradeoff:

- Option A: <cách 1> — pros / cons
- Option B: <cách 2> — pros / cons
- (Optional) Option C: ...

Không cần exhaustive. 2-3 option đủ. Nêu rõ recommendation đi kèm "vì sao".

## 4. Surface edge cases

Liệt kê edge case dễ quên:

- Empty state? Loading? Error?
- SSR vs CSR khác biệt?
- Mobile / dark mode?
- i18n cho cả EN và VI?
- A11y?

## 5. Wait for user choice

Đặt câu hỏi cụ thể: "Bạn chọn A hay B? Có muốn handle edge case X không?"

KHÔNG code đến khi user xác nhận hướng.

## Anti-pattern

- ❌ Nhảy vào code ngay khi user nói "làm cho tui trang manga".
- ❌ Đưa 1 option duy nhất rồi implement luôn (mất cơ hội user redirect).
- ❌ Brainstorm xong tự chọn — user phải là người chốt.

## Khi nào KHÔNG cần brainstorm

- Task rõ ràng, 1 cách làm hợp lý (vd "đổi màu primary thành xanh lá").
- Bug fix có root cause cụ thể.
- User đã chỉ định approach trong prompt.
