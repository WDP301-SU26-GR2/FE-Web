# Prompt: Add i18n Key

Them 1 i18n key vao ca EN va VI, dam bao parity.

## Input format

`<namespace>.<key.path> "EN value" "VI value"`

Vi du: `welcome.subtitle "Welcome subtitle" "Phu de chao mung"`

`key.path` co the nested (vd `errors.notFound`).

## Steps

1. Parse argument theo format tren.
2. Mo `app/locales/en/<namespace>.json` va `app/locales/vi/<namespace>.json`.
3. Neu namespace CHUA ton tai -> STOP, bao user dung `new-feature.md` hoac tu tao namespace truoc (can dang ky vao `app/shared/lib/i18n/resources.ts`).
4. Them key vao CA HAI file. Neu key da ton tai o 1 trong 2 -> bao conflict, hoi user truoc khi ghi de.
5. Giu JSON valid (indent 2 spaces giong file goc, khong trailing comma).

## Verify

- Doc lai 2 file confirm parity (cung tap key).
- Bao: "Da them `<namespace>:<key.path>` vao EN/VI."

## Cam

- Khong nhung HTML tho vao value. Can markup -> goi y dung `<Trans>` component.
- Khong ghep chuoi trong code — value dung interpolation `{{name}}` khi can.
