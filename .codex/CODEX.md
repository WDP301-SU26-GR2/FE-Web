# Codex Setup - mangaka-web

Muc tieu: tao standard workflow cho Codex de team code nhat quan, de review, de maintain.

## 0) Required context first

- Doc `AGENTS.md` truoc khi de xuat hoac sua code (nguon truth).
- Khi thay doi lon, doc them `ARCHITECTURE.md`.

CODEX.md nay chi liet ke Codex-specific tooling. Khong lap lai quy uoc tu AGENTS.md.

## 1) Reusable prompts (`.codex/prompts/`)

| Prompt                              | Tac dung                                                 |
| ----------------------------------- | -------------------------------------------------------- |
| `new-feature.md`                    | Scaffold feature moi (folder + i18n + barrel)            |
| `pre-commit-check.md`               | Typecheck + lint + prettier + i18n parity + arch guard   |
| `code-review.md`                    | Review diff theo checklist mangaka-web                   |
| `brainstorming.md`                  | Truoc khi code task mo ho — options + tradeoff           |
| `writing-plans.md`                  | Truoc khi implement non-trivial (>=3 file)               |
| `root-cause-analysis.md`            | Debug bug — 5 Whys, khong patch trieu chung              |
| `finishing-a-branch.md`             | Truoc khi tao PR / merge                                 |
| `debugging-hydration.md`            | Hydration mismatch / FOUC / SSR vs client lech           |
| `accessibility-audit.md`            | Khi them UI interactive — keyboard/ARIA/contrast         |
| `defensive-programming.md`          | Validate boundary, trust internal                        |
| `subagent-driven-development.md`    | Khi nao spawn agent vs inline                            |
| `test-driven-development.md`        | Red-Green-Refactor cho logic input/output ro             |
| `using-git-worktrees.md`            | Multi-branch parallel work                               |
| `skill-discovery.md`                | Meta — scan resource co san dau task                     |
| `verification-before-completion.md` | TRUOC khi bao done — verify that su, khong chi typecheck |
| `condition-based-waiting.md`        | Polling dieu kien that thay vi `sleep` mu                |
| `requesting-code-review.md`         | Self-review + goi code-review.md sau khi xong            |
| `add-i18n-key.md`                   | Them key vao ca EN va VI, giu parity                     |
| `add-route.md`                      | Tao route thin + dang ky vao routes.ts                   |
| `add-mock-endpoint.md`              | Tao MSW handler + Faker factory                          |
| `add-ui-primitive.md`               | Tao headless component trong shared/ui                   |

Su dung: copy noi dung prompt + paste vao Codex hoac dung `@.codex/prompts/<name>.md`.

## 2) Config (`.codex/config.toml`)

Da pre-config:

- `approval_policy = "on-request"` — Codex hoi truoc khi chay command lon.
- `sandbox_mode = "workspace-write"` — chi ghi trong workspace, khong dung he thong.
- Allowed commands: `npm run *`, `git status/diff/log/branch/show`.
- Denied paths: `app/api/model`, `app/api/operations`, `tailwind.config.*`.

Dev co the override local trong `.codex/config.local.toml` (da gitignore).

## 3) Workflow mac dinh (Superpowers-inspired)

1. **Clarify** — xac dinh dung problem, constraints, acceptance criteria.
2. **Plan** — liet ke files, impact, rollback-safe approach.
3. **Implement** — thay doi nho, theo boundaries, uu tien typing ro rang.
4. **Review** — dung `@.codex/prompts/code-review.md` hoac tu check.
5. **Finalize** — cap nhat tai lieu lien quan neu co thay doi convention/flow.

## 4) Repo-specific engineering constraints

- Respect layers: `routes -> features -> shared`; `providers -> shared`.
- No cross-feature imports; can share thi move len `shared`.
- Keep routes thin; business logic nam trong feature modules.
- Khong hard-code mau trong components; dung token + semantic utility classes.
- i18n key moi phai update ca `app/locales/en` va `app/locales/vi`.
- Khong edit hand-written vao file codegen cua Orval (`app/api/model`, `app/api/operations`).
- Uu tien path alias `~/...`.

## 5) Definition of done

- Dung yeu cau.
- Dung conventions cua repo.
- Code ro rang, de maintain, khong tang debt khong can thiet.
- Chay xong `pre-commit-check` clean.
