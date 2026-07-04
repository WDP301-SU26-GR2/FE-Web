# Prompt: Pre-Commit Check

Su dung truoc khi commit / merge branch.

## Steps

1. `npm run typecheck` — fail thi STOP, liet ke loi.
2. `npm run lint` — fail thi de xuat `npm run lint:fix`.
3. `npm run prettier` — fail thi de xuat `npm run prettier:fix`.
4. i18n parity:
   - So sanh key giua `app/locales/en/<ns>.json` va `app/locales/vi/<ns>.json` cho tung ns trong `NAMESPACES`.
   - Bao key thieu / value rong.
5. Architecture guard (grep):
   - `app/shared` va `app/providers` KHONG import tu `~/features/`.
   - `app/features` va `app/shared` KHONG import tu `~/mocks/`.
   - Khong co `bg-orange-500`/`text-gray-700`/... hex color trong `.tsx`.
   - Khong co `react-router-dom` trong code va package.json.

## Output

Format:

```
[ok|warn|fail] typecheck
[ok|warn|fail] lint
[ok|warn|fail] prettier
[ok|warn|fail] i18n parity
[ok|warn|fail] architecture guard
```

Ket luan: READY / NEEDS FIX (<so van de>).
