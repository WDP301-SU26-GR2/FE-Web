# Prompt: New Feature Scaffolding

Su dung khi can scaffold feature moi cho `mangaka-web` (FSD-lite).

## Input
- Feature name (kebab-case, vd `manga`, `auth`, `chapter-reader`).

## Steps

1. Tao cau truc:
   ```
   app/features/<name>/
   ├── components/
   ├── hooks/                (tao khi can)
   ├── api/                  (tao khi can)
   ├── types.ts
   ├── <name>-page.tsx
   └── index.ts              # export { XxxPage } from "./<name>-page"
   ```

2. Tao locale:
   - `app/locales/en/<name>.json` voi it nhat `{ "title": "..." }`
   - `app/locales/vi/<name>.json` parity
   - Dang ky namespace vao `app/shared/lib/i18n/resources.ts`:
     - import enXxx, viXxx
     - them vao `resources.en` va `resources.vi`
     - them ten ns vao mang `NAMESPACES`

3. KHONG tu dang ky route. Hoi user URL truoc.

4. Chay `npm run typecheck` sau khi xong.

## Constraints
- Khong import tu feature khac (cross-feature). Can share -> shared/.
- Khong hardcode chuoi -> dung useTranslation.
- Khong hex color -> chi class semantic.
- File kebab-case.tsx, component PascalCase.
- Import qua alias `~/...`.
