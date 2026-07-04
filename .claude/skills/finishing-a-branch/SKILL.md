---
name: finishing-a-branch
description: Use BEFORE creating a PR or asking user to merge. Final checklist to ensure branch is ready, docs updated, no debug code left, lint/typecheck clean. Triggers on "ready to merge", "create PR", "done with feature", "finalize branch".
---

# Finishing a Branch

Trước khi tạo PR, chạy checklist này. Đừng để reviewer phải comment các thứ tự fix được.

## Checklist

### 1. Code quality gates

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean (hoặc lint:fix đã chạy)
- [ ] `npm run prettier` — clean (hoặc prettier:fix đã chạy)
- [ ] Không còn `console.log` / `debugger` / `// TODO temp`
- [ ] Không còn comment `// fix later`, `// hack` không có context

### 2. Repo conventions

- [ ] Không hex color trong `.tsx`
- [ ] Không class palette (`bg-orange-500`) — chỉ semantic token
- [ ] i18n key mới có cả EN và VI
- [ ] Namespace mới đã đăng ký vào `app/shared/lib/i18n/resources.ts`
- [ ] Không import chéo giữa features
- [ ] Không sửa file trong `app/api/{model,operations}`
- [ ] Route file thin, business logic trong feature

### 3. Functional verification

- [ ] Chạy `npm run dev`, mở browser, test golden path
- [ ] Test edge case: empty / loading / error
- [ ] Toggle dark/light — không vỡ layout
- [ ] Switch EN/VI — không thấy key raw (vd `welcome:title` chưa dịch)
- [ ] Responsive: mobile (DevTools 375px) + desktop
- [ ] A11y nhanh: keyboard tab qua được, focus ring hiện

### 4. Documentation

- [ ] Nếu thêm convention mới → update `AGENTS.md`
- [ ] Nếu thêm scripts → update `README.md`
- [ ] Nếu thêm env var → update `.env.example`
- [ ] Nếu thay đổi public API của feature → update `feature/index.ts`

### 5. Git hygiene

- [ ] Commit message rõ ràng (theo style repo)
- [ ] Không commit `.env.local`, secrets, file IDE local (`.vscode/settings.json` cá nhân)
- [ ] Branch up-to-date với `main` (rebase hoặc merge)

### 6. PR description sẵn sàng

- Summary: 1-3 bullet "what changed and why"
- Test plan: bullet checklist reviewer làm theo
- Screenshots: cho UI change (cả dark + light)
- Linked issue / ticket

## Anti-pattern

- ❌ "Sẽ fix lint trong commit sau" — fix luôn, đỡ ai phải nhắc.
- ❌ "Test sau khi reviewer xem" — reviewer không chịu trách nhiệm test thay bạn.
- ❌ "Update docs sau khi merge" — docs sẽ không bao giờ được update.
- ❌ PR description "fix stuff" — reviewer mù không biết review gì.

## Tools

Gọi `/pre-commit-check` hoặc spawn `@code-reviewer` để tự động chạy phần lớn checklist trên.
