# Prompt: Writing Plans

Su dung TRUOC khi implement non-trivial (>=3 file, feature moi, refactor).

## Plan template

```
## Plan: <ten task>

### Muc tieu
1 cau outcome user-facing.

### Files affected
- path/file.tsx — CREATE | EDIT | DELETE — mo ta

### Behavior
- Mo ta user-facing behavior.
- Edge case: loading / empty / error.

### Verification
- npm run typecheck.
- Manual test URL.
- Toggle dark/light, switch EN/VI.

### Out of scope (lam sau)
- ...
```

## Quy tac

1. Plan dat trong conversation, khong tao file .md.
2. File action ro: CREATE / EDIT / DELETE.
3. Behavior mo ta user-facing, khong noi "tao component X".
4. Section "Out of scope" chong scope creep.
5. Sau khi viet plan -> DUNG, cho user duyet.

## Khi nao SKIP plan

- Sua 1 file, 1-2 dong.
- Bug fix nho ro rang.
- Task user da chi tiet hoa.

## Mid-task deviation

Neu phat hien plan sai giua chung:
1. STOP code.
2. Bao user: "Plan cu khong work vi X. De xuat Y."
3. Cho confirm.

KHONG silent deviate.
