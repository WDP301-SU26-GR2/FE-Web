# Prompt: Requesting Code Review

Sau khi code, ban qua gan code de thay bug. Can fresh perspective.

## Workflow 2 tang

### Tang 1 — Self-review (5 phut)

1. Doc diff day du (`git diff main...HEAD`).
2. Doc nhu nguoi khong viet code:
   - Ten bien/function ro?
   - Cho "wtf" can comment?
   - Copy-paste co the tach function?
   - console.log / debugger / TODO sot?
3. Verify behavior: chay app, test golden path + 1 edge.

### Tang 2 — Goi review prompt

Su dung `.codex/prompts/code-review.md` voi context:

```
Review changes on branch <name>. Context:
- Vua them feature /mangas (route + page + list)
- Da them i18n namespace "manga"
- Chua wire auth (out of scope)
Focus: i18n parity, dependency boundary, hex color.
```

## Khi MUST request review

- Feature moi (>=3 file).
- Refactor — check khong gay behavior.
- Code cham vung high-risk: auth, payment, data fetching, SSR.
- Truoc khi mo PR team review.
- Sau khi merge conflict resolve.

## Khi SKIP review

- Sua 1 file, 1-2 dong (typo, copy fix).
- Chi doi color token theme.css.
- Update docs.
- Bug fix nho voi repro step ro.

## Handle review feedback

### Blocker

Fix ngay. Khong "se fix sau".

### Warning

- Hoi user: "Reviewer report X warning. Fix luon hay defer?"
- Defer -> tao TODO + ticket, khong silent ignore.

### Nice-to-have

- Can nhac cost/benefit.

## Anti-pattern

- Skip self-review, nhay thang vao reviewer.
- Dismiss feedback vi "tui biet code ro hon".
- Reviewer report blocker nhung van bao task done.
- Hoi review khong brief context — reviewer guess sai focus.

## Tu review subagent output

Reviewer cung co the sai (false positive). Doc ky:

1. Neu reviewer hieu sai context -> push back: "Da flag X nhung that ra Y vi Z. Co can fix?"
2. User chot cuoi cung.

## Trust but verify

"Approve" != tin 100%. Van verify behavior truoc khi bao done.
