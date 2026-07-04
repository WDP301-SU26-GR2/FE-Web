# Prompt: Code Review (mangaka-web)

Review diff pending cua repo `mangaka-web`. Doc `AGENTS.md` truoc neu chua biet quy uoc.

## Checklist (theo do uu tien)

### Architecture

- `app/shared/**` KHONG import tu `app/features/**` / `app/routes/**`.
- `app/providers/**` KHONG import tu `app/features/**`.
- `app/features/<a>/**` KHONG import tu `app/features/<b>/**`.
- `app/features` va `app/shared` KHONG import tu `app/mocks/**`.
- `app/api/operations/**` chi goi tu route loader/action / feature hook.

### Styling

- Khong hex color trong .tsx.
- Khong dung class palette (`bg-orange-500`, `text-gray-700`...). Phai semantic (`bg-primary`, `text-foreground`...).
- Khong tao `tailwind.config.*`.
- `dark:` chi cho layout/visibility.

### i18n

- Moi chuoi user-facing qua `useTranslation()`.
- Key moi: co o ca EN va VI.
- Khong ghep chuoi — dung interpolation `{{var}}`.

### TypeScript

- Khong `any`.
- `import type` cho type-only.
- `as const` + `satisfies` cho config.

### React / Component

- Named export, default chi o route entry.
- File `kebab-case.tsx`, component `PascalCase`.
- localStorage/window bocked SSR-safe.
- File > 150 dong → de xuat tach.

### Route

- Thin: chi compose feature.
- Dang ky trong `app/routes.ts`.

### Mock / API

- KHONG sua `app/api/model` / `app/api/operations` (Orval clean).
- Custom fetch logic -> `app/api/mutator/custom-fetch.ts`.

### Dependencies

- KHONG cai `react-router-dom`.

## Output

```
🔴 BLOCKER:
- <file>:<line> — <issue> — <fix>

🟡 WARNING:
- ...

🟢 NICE-TO-HAVE:
- ...

✅ OK:
- ...
```

Ket luan: APPROVE / REQUEST CHANGES.

KHONG tu sua. Chi report.
