# Claude Setup - mangaka-web

Mục tiêu: giúp AI code đúng chuẩn, dễ hiểu, dễ maintain — theo workflow inspired by Superpowers.

## 0) Bắt buộc đọc trước khi code

1. `AGENTS.md` (nguồn truth về architecture + conventions)
2. `ARCHITECTURE.md` (hiểu luồng dữ liệu và module boundaries)
3. `README.md` (scripts và setup runtime)

CLAUDE.md này chỉ liệt kê **Claude-specific tooling**. Không lặp lại quy ước từ AGENTS.md.

## 1) Skills (`.claude/skills/`) — Anthropic Superpowers pattern

Auto-discovered & auto-invoked dựa trên `description` trong frontmatter. AI tự kích hoạt khi intent task khớp.

| Skill                            | Khi nào kích hoạt                                          |
| -------------------------------- | ---------------------------------------------------------- |
| `skill-discovery`                | Đầu mỗi task — scan resource có sẵn (meta)                 |
| `brainstorming`                  | Task mơ hồ, cần explore options                            |
| `writing-plans`                  | Non-trivial work (≥3 file, feature mới)                    |
| `root-cause-analysis`            | Debug bug, error, test fail                                |
| `defensive-programming`          | Cân nhắc validate ở đâu                                    |
| `subagent-driven-development`    | Cân nhắc spawn agent vs inline                             |
| `test-driven-development`        | Viết logic có input/output rõ                              |
| `using-git-worktrees`            | Multi-branch parallel work                                 |
| `finishing-a-branch`             | Trước khi mở PR / merge                                    |
| `debugging-hydration`            | Hydration mismatch / FOUC / SSR vs client lệch             |
| `accessibility-audit`            | Khi thêm UI interactive — keyboard/ARIA/contrast           |
| `verification-before-completion` | TRƯỚC khi báo done — phải verify thật, không chỉ typecheck |
| `condition-based-waiting`        | Polling điều kiện thực thay vì `sleep` mù                  |
| `requesting-code-review`         | Self-review + spawn @code-reviewer sau khi xong            |

Manual trigger nếu cần: nói "use the brainstorming skill" hoặc gõ `/<skill-name>`.

📖 Đọc [`.claude/skills/README.md`](./skills/README.md) để hiểu cách tái sử dụng bộ skills này cho dự án khác.

## 2) Slash commands có sẵn (`.claude/commands/`)

Dev gõ slash command để scaffold đúng quy ước, không cần nhớ chi tiết:

| Command                                       | Tác dụng                                                     |
| --------------------------------------------- | ------------------------------------------------------------ |
| `/new-feature <name>`                         | Scaffold feature mới đúng FSD-lite (folder + i18n namespace) |
| `/add-route <url> <feature>`                  | Tạo route thin + đăng ký vào `app/routes.ts`                 |
| `/add-i18n-key <ns>.<k> "EN" "VI"`            | Thêm key vào cả 2 locale, giữ parity                         |
| `/add-mock-endpoint <method> <url> <factory>` | Tạo factory Faker + handler MSW                              |
| `/add-ui-primitive <Name>`                    | Tạo UI primitive headless trong `shared/ui/`                 |
| `/pre-commit-check`                           | Typecheck + lint + prettier + i18n parity + arch guard       |

## 3) Subagents (`.claude/agents/`)

| Agent           | Dùng khi                                                             |
| --------------- | -------------------------------------------------------------------- |
| `code-reviewer` | Review diff / PR theo full checklist (architecture/i18n/styling/TS). |
| `i18n-checker`  | Audit parity EN↔VI, key thiếu, namespace chưa đăng ký.               |

Gọi qua: "review this branch with @code-reviewer" hoặc "@i18n-checker".

## 4) Permissions & guardrails (`.claude/settings.json`)

Đã pre-config:

- ✅ Allow: tất cả `npm run *`, `git status/diff/log/branch/show`, Read/Glob/Grep.
- ❌ Deny: Edit/Write vào `app/api/{model,operations}` (Orval generated), `tailwind.config.*`, `git commit/push`, `npm install react-router-dom*`.
- Dev có thể override local trong `.claude/settings.local.json` (đã được gitignore).

## 5) Workflow mặc định (bắt buộc)

1. **Brainstorm** — làm rõ scope, assumption, edge case.
2. **Plan** — chia task nhỏ, rõ file cần sửa, rõ expected behavior.
3. **Implement** — thay đổi nhỏ, đúng boundary, không patch ad-hoc.
4. **Review** — gọi `@code-reviewer` hoặc tự soat lại theo `/pre-commit-check`.
5. **Finalize** — đảm bảo docs liên quan được cập nhật (nếu thay đổi convention).

## 6) Hard constraints (xem AGENTS.md để biết "tại sao")

- Tôn trọng dependency graph: `routes → features → shared`, `providers → shared`.
- Không import chéo giữa các feature.
- Không hard-code color; dùng semantic class + token trong `app/styles/theme.css`.
- i18n key mới phải có đủ cho `en` và `vi`.
- Ưu tiên alias `~/...` thay vì relative path dài.
- Không sửa tay file generated trong `app/api/model` và `app/api/operations`.
- Route file giữ "thin", business logic đặt trong `features/*`.

## 7) Principle

- Evidence over claims.
- Simplicity over cleverness.
- Maintainability over speed.
