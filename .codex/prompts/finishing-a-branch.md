# Prompt: Finishing a Branch

Truoc khi tao PR / merge. Dung de reviewer khoi phai comment thu fix duoc.

## Checklist

### Code quality
- [ ] npm run typecheck clean
- [ ] npm run lint clean
- [ ] npm run prettier clean
- [ ] Khong console.log / debugger / // TODO temp con sot

### Repo conventions
- [ ] Khong hex color trong .tsx
- [ ] Khong class palette (bg-orange-500) — chi semantic token
- [ ] i18n key moi co ca EN va VI
- [ ] Namespace moi da dang ky vao resources.ts
- [ ] Khong import cheo features
- [ ] Khong sua app/api/{model,operations}
- [ ] Route file thin, logic trong feature

### Functional verify
- [ ] npm run dev, test golden path
- [ ] Test edge: empty/loading/error
- [ ] Dark/light khong vo
- [ ] EN/VI khong thay raw key
- [ ] Mobile 375px + desktop
- [ ] Keyboard tab + focus ring

### Docs
- [ ] Convention moi -> update AGENTS.md
- [ ] Script moi -> update README.md
- [ ] Env var moi -> update .env.example
- [ ] Public API feature thay doi -> update feature/index.ts

### Git
- [ ] Commit message ro
- [ ] Khong commit secrets / .env.local / IDE settings
- [ ] Branch up-to-date voi main

### PR description
- Summary 1-3 bullet what + why
- Test plan bullet list
- Screenshots (dark + light) cho UI change
- Linked issue / ticket
