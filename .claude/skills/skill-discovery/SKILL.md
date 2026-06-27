---
name: skill-discovery
description: Use this FIRST when starting a task to identify which skills, commands, or agents apply. Prevents reinventing patterns the repo already encoded. Read this skill if you're unsure what tools are available.
---

# Skill Discovery — Meta Skill

Trước khi bắt tay vào task, scan resources có sẵn trong repo. Đừng tự nghĩ ra workflow nếu đã có sẵn.

## Resources có trong mangaka-web

### `.claude/skills/` — auto-discoverable skills

Đọc frontmatter `description` trong mỗi `SKILL.md`. Skill kích hoạt khi description khớp với intent task.

| Skill                         | Khi nào dùng                       |
| ----------------------------- | ---------------------------------- |
| `brainstorming`               | Task mơ hồ, cần explore option     |
| `writing-plans`               | Non-trivial work (≥3 file)         |
| `root-cause-analysis`         | Debug bug, error, test fail        |
| `defensive-programming`       | Cân nhắc validate ở đâu            |
| `subagent-driven-development` | Cân nhắc spawn agent vs inline     |
| `test-driven-development`     | Viết logic có input/output rõ ràng |
| `using-git-worktrees`         | Multi-branch parallel work         |
| `finishing-a-branch`          | Trước khi mở PR / merge            |

### `.claude/commands/` — slash commands (dev gõ thủ công)

| Command              | Khi nào dùng                           |
| -------------------- | -------------------------------------- |
| `/new-feature`       | Scaffold feature mới                   |
| `/add-route`         | Thêm route vào RR7                     |
| `/add-i18n-key`      | Thêm key giữ parity EN/VI              |
| `/add-mock-endpoint` | Tạo MSW handler + Faker factory        |
| `/add-ui-primitive`  | Tạo headless component trong shared/ui |
| `/pre-commit-check`  | Gate quality trước commit              |

### `.claude/agents/` — subagents (gọi qua @mention)

| Agent           | Khi nào dùng                         |
| --------------- | ------------------------------------ |
| `code-reviewer` | Review diff / PR theo checklist repo |
| `i18n-checker`  | Audit parity locale, key thiếu       |

### Docs (canonical knowledge)

| File              | Nội dung                                          |
| ----------------- | ------------------------------------------------- |
| `AGENTS.md`       | Architecture + conventions (đọc lại khi nghi ngờ) |
| `ARCHITECTURE.md` | Onboarding + ví dụ thêm feature                   |
| `README.md`       | Setup + scripts                                   |

## Workflow khi nhận task mới

1. **Identify task type**:
   - Bug → `root-cause-analysis`
   - Feature mới → `brainstorming` → `writing-plans` → `/new-feature` → `/add-route`
   - Refactor → `writing-plans` + spawn `@code-reviewer` sau
   - Audit → `@code-reviewer` hoặc `@i18n-checker`

2. **Check conventions**: nếu task chạm vùng có quy ước (styling, i18n, architecture) → mở `AGENTS.md` section liên quan.

3. **Apply skill**: skill có description match → tự kích hoạt. Manual trigger nếu cần: "use the writing-plans skill".

4. **Verify**: trước khi báo done → `finishing-a-branch` checklist.

## Cấm

- ❌ Tự nghĩ ra workflow khi repo đã có command/skill tương đương.
- ❌ Bỏ qua `AGENTS.md` rồi đoán convention.
- ❌ Dùng skill như checklist máy móc — skill là **gợi ý cấu trúc**, vẫn cần judgement.
