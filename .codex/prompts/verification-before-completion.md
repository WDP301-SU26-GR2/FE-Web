# Prompt: Verification Before Completion

TRUOC khi bao "done" / "completed", PHAI verify thuc te. Typecheck pass != feature work.

## Levels

### Level 1 — Static (bare minimum)
```bash
pnpm typecheck
pnpm lint
```
Chua du de bao done.

### Level 2 — Real app (DEFAULT cho UI change)
```bash
pnpm dev
```
- Mo browser localhost:5173
- Navigate URL feature thay doi
- Click golden path
- Check DevTools console — khong error / hydration warning
- Test 1 edge case: empty/loading/error

### Level 3 — Cross-cutting (feature lon)
- Mobile viewport (375px)
- Dark/light toggle
- EN/VI switch
- Keyboard nav
- Reload nhieu lan (hydration stability)

## Verify checklist

Cuoi task, tra loi 5 cau:
1. Typecheck pass?
2. Lint clean?
3. App chay duoc?
4. Golden path work?
5. Khong regression cho khac?

Du 5 yes -> done. 1 no -> chua done.

## Anti-pattern

- "Code viet, typecheck pass — done!" ma chua chay app.
- "Tui da sua, chac work" — khong "chac", phai verify.
- "Test sau" — khong ton tai "sau".
- Bao done dua tren doc lai code — bug an o runtime.
- Verify chi happy path, skip edge case.

## Khi khong verify duoc

- Bao user thang: "Da viet X, chua verify vi Y. Test giup."
- Liet ke chinh xac step user can test.
- KHONG mark "done" — mark "ready for user verification".

## Trust but verify subagent

Agent report "da xong X" -> doc diff that, chay app that, khong tin loi noi.
