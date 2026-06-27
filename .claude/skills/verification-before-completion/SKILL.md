---
name: verification-before-completion
description: Use BEFORE reporting a task as "done" / "completed" / "finished". NEVER claim success without verifying the change actually works in the real app. Run dev server, click through UI, check console, verify edge cases. Especially critical for SSR apps where typecheck passing ≠ feature working. Triggers on "done", "completed", "finished", "task complete", "ready to ship".
---

# Verification Before Completion

**Quy tắc vàng**: `npm run typecheck` pass ≠ feature works. TypeScript chỉ kiểm tra type, không kiểm tra **behavior**. Trước khi báo done, **phải verify thật**.

## Khi nào MUST verify (không skip)

- Feature mới có UI → mở browser, click, test golden path.
- Bug fix → reproduce step gốc, confirm không còn lỗi, confirm không gây regression chỗ khác.
- Refactor → behavior phải y hệt trước refactor (test cả happy + edge path).
- SSR-related change → check hydration warning console, reload nhiều lần.
- i18n change → switch EN ↔ VI, confirm key hiển thị đúng (không thấy raw `welcome:title`).
- Theme change → toggle dark ↔ light, confirm không vỡ layout.

## Levels of verification

### Level 1 — Static (BẮT BUỘC, ít nhất phải làm)

```bash
pnpm typecheck      # type pass
pnpm lint           # no lint error
```

**Chưa đủ để báo done**. Đây là bare minimum.

### Level 2 — Real app run (DEFAULT cho mọi UI change)

```bash
pnpm dev
```

- Mở browser http://localhost:5173
- Navigate tới URL feature thay đổi
- Click qua golden path
- Check DevTools console — không error / hydration warning
- Test ít nhất 1 edge case: empty / loading / error

### Level 3 — Cross-cutting (cho feature lớn)

- Mobile viewport (DevTools 375px)
- Dark mode toggle
- Switch EN ↔ VI
- Keyboard nav (tab qua interactive element)
- Reload page nhiều lần (hydration stability)

## Anti-pattern — NEVER do

- ❌ "Code đã viết, typecheck pass — done!" mà chưa chạy app.
- ❌ "Tui đã sửa file X, chắc work" — không "chắc", phải verify.
- ❌ "Test sau" — không tồn tại "sau". Verify NOW hoặc task chưa done.
- ❌ Báo done dựa trên đọc code lại — bug đa số ẩn ở runtime, không thấy khi đọc.
- ❌ Verify chỉ happy path, skip edge case.

## Khi không thể verify được

Nếu môi trường không cho phép verify (vd: không có browser, không có data BE):

1. **Báo user thẳng**: "Tui đã viết code X nhưng chưa verify được vì Y. Bạn test giúp."
2. Liệt kê **chính xác** step user cần test.
3. KHÔNG đánh dấu task là "done" — đánh dấu là "ready for user verification".

## Verify checklist template

Cuối mỗi task, trả lời 5 câu:

1. ✅ Type check pass? (run `pnpm typecheck`)
2. ✅ Lint clean? (run `pnpm lint`)
3. ✅ App chạy được? (run `pnpm dev`, mở browser)
4. ✅ Golden path work? (click qua flow chính)
5. ✅ Không regression chỗ khác? (test 1-2 feature liên quan)

Trả lời được CẢ 5 mới được nói "done". Nếu 1 cái "no" → tiếp tục, không báo done.

## Trust but verify (cho subagent)

Khi subagent report "đã làm xong X":

- KHÔNG tin lời nói. Đọc diff thật bằng Read tool.
- Run app, test thật.
- Subagent có thể đã hallucinate hoặc làm 80% đúng + 20% sai.
