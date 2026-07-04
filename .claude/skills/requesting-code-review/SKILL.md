---
name: requesting-code-review
description: Use after completing a non-trivial implementation, BEFORE marking task as done. Self-review then spawn @code-reviewer subagent for independent check. Catches issues you missed because you wrote the code. Triggers on "done implementing", "ready for review", "finished feature", "before merge".
---

# Requesting Code Review

Sau khi viết code xong, **bạn quá gần code** để thấy bug rõ. Cần fresh perspective.

## Workflow 2 tầng

### Tầng 1 — Self-review (5 phút)

Trước khi gọi reviewer khác, tự đọc lại như reviewer:

1. **Đọc diff đầy đủ** — `git diff main...HEAD` hoặc tương đương.
2. **Đọc như người không viết code này** — câu hỏi:
   - Tên biến/function có rõ không?
   - Có chỗ nào "wtf" cần comment giải thích không?
   - Có phần copy-paste có thể tách function không?
   - Có console.log / debugger / TODO sót lại không?
3. **Verify behavior**: chạy app, test golden path + 1 edge case (xem skill `verification-before-completion`).

### Tầng 2 — Spawn `@code-reviewer`

```
@code-reviewer review my changes on this branch. Context:
- Vừa thêm feature /mangas (route + page + manga list)
- Đã thêm i18n namespace "manga"
- Chưa wire auth (out of scope)
Focus đặc biệt vào: i18n parity, dependency boundary, hex color.
```

Subagent có:

- Fresh context (không bias bởi bạn vừa code).
- System prompt chuyên review mangaka-web (checklist architecture/i18n/styling/TS).
- Tools đủ để grep, read, run check.

## Khi nào MUST request review

- Feature mới (≥3 file changed).
- Refactor → check không gãy behavior.
- Code chạm vùng high-risk: auth, payment, data fetching, SSR.
- Trước khi mở PR cho team review.
- Sau khi merge conflict resolve.

## Khi nào SKIP review

- Sửa 1 file, 1-2 dòng (typo, copy fix).
- Chỉ thay đổi color token trong `theme.css`.
- Update docs.
- Bug fix scope nhỏ với reproduction step rõ.

## Cách handle review feedback

Reviewer report 3 levels:

### 🔴 Blocker

**Fix ngay**. Đừng "sẽ fix sau" — sau không bao giờ tới.

### 🟡 Warning

- Hỏi user: "Reviewer report X warning. Fix luôn hay defer?" — không tự quyết.
- Nếu defer → tạo TODO + ticket, không silent ignore.

### 🟢 Nice-to-have

- Cân nhắc cost/benefit. Nếu nhanh thì fix; nếu không thì document.

## Anti-pattern

- ❌ Skip self-review, nhảy thẳng vào reviewer.
- ❌ Dismiss reviewer feedback vì "tui biết code này rõ hơn".
- ❌ Reviewer report blocker nhưng vẫn báo task done với user.
- ❌ Hỏi reviewer review nhưng không brief context → reviewer guess sai focus.

## Tự review subagent output

Reviewer cũng có thể sai (false positive). Đừng máy móc fix mọi thứ reviewer nói:

1. Đọc kỹ feedback.
2. Nếu thấy reviewer hiểu sai context → push back: "Reviewer flagged X nhưng thật ra Y vì Z. Có cần fix không?"
3. User là người chốt cuối cùng.

## Trust but verify

Khi reviewer nói "approve" — đừng tin 100%. Vẫn verify behavior trước khi báo done với user.
