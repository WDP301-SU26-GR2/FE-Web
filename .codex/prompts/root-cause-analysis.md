# Prompt: Root Cause Analysis

Su dung khi debug bug, error, test fail. **KHONG patch trieu chung** — tim goc roi fix.

## 5 Whys

Hoi "tai sao?" >=5 lan den khi cham root cause.

Vi du:
1. Why theme reset? -> localStorage tra null.
2. Why null? -> writeStorage khong duoc goi.
3. Why khong goi? -> useEffect deps sai.
4. Why sai? -> hydrated state khong toggle.
5. Why? -> import circular.
-> Root: import circular. Fix import, KHONG va theme logic.

## Process

1. **Reproduce** — confirm step. Khong reproduce duoc -> hoi user.
2. **Read error fully** — toan bo stack, khong chi dong dau.
3. **Form hypothesis** — doan TRUOC khi doc code.
4. **Verify** — doc code/log confirm. Sai -> hypothesis moi, khong doan mo.
5. **Identify root vs symptom** — fix root.
6. **Fix + check regression** — typecheck + manual test.

## Anti-pattern

- KHONG try/catch de "khoi crash" (giau loi).
- KHONG reload de workaround.
- KHONG fix ma khong hieu vi sao bug ton tai.
- KHONG disable test fail thay vi sua code/test.

## Khi nao "patch nhanh" chap nhan duoc

- Hot fix production critical -> kem TODO + ticket quay lai fix root.
- Bug trong dependency ben thu 3 -> workaround + bao upstream.
