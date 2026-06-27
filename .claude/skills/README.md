# Skills — mangaka-web

14 skills theo pattern Anthropic Superpowers. Auto-discovered & auto-invoked qua frontmatter `description`.

## Phân loại

### 🌍 Universal (12 skills) — reusable cho bất kỳ dự án nào

Các skill này là **workflow patterns** không phụ thuộc tech stack. Copy nguyên thư mục sang repo khác, chỉ cần search & replace `mangaka-web` → `<your-repo>`:

| Skill                            | Mô tả                                    |
| -------------------------------- | ---------------------------------------- |
| `skill-discovery`                | Meta — scan tools có sẵn trước task      |
| `brainstorming`                  | Explore options trước khi code           |
| `writing-plans`                  | Plan structured cho task ≥3 file         |
| `root-cause-analysis`            | 5 Whys, không patch triệu chứng          |
| `defensive-programming`          | Validate boundary, trust internal        |
| `subagent-driven-development`    | Khi nào spawn Agent vs inline            |
| `test-driven-development`        | Red-Green-Refactor                       |
| `using-git-worktrees`            | Multi-branch parallel work               |
| `finishing-a-branch`             | Gate trước PR / merge                    |
| `verification-before-completion` | Verify thật trước khi báo done           |
| `condition-based-waiting`        | Polling điều kiện thực, không `sleep` mù |
| `requesting-code-review`         | Self-review + spawn reviewer             |

### 🎯 Project-specific (2 skills) — đặc thù mangaka-web stack

Reference tới file/pattern cụ thể của repo (`react-router.config.ts`, `theme.css`, `i18n-provider.tsx`...). Khi copy sang repo khác cần điều chỉnh ví dụ:

| Skill                 | Phụ thuộc                                          |
| --------------------- | -------------------------------------------------- |
| `debugging-hydration` | SSR mode của React Router 7, themeInitScript, i18n |
| `accessibility-audit` | Pattern token-driven theme, language-switcher      |

## Cách tái sử dụng skills cho repo khác

### Option 1 — Copy nguyên thư mục (đơn giản nhất)

```bash
# Trong repo mới:
cp -r <mangaka-web>/.claude/skills .claude/

# Search & replace project-specific refs:
# - "mangaka-web" → "<new-repo-name>"
# - "AGENTS.md §11", "ARCHITECTURE.md §3" — kiểm tra section number còn đúng
# - Stack ref trong debugging-hydration / accessibility-audit nếu khác stack
```

### Option 2 — Chỉ copy universal skills

Bỏ qua `debugging-hydration/` và `accessibility-audit/` nếu repo mới không phải React SSR / không cần a11y heavy. Còn lại 9 universal skills dùng được ngay.

### Option 3 — Install vào user global (chuẩn Superpowers)

```bash
# Một lần cho toàn bộ máy:
cp -r <mangaka-web>/.claude/skills/* ~/.claude/skills/

# Sau đó MỌI repo Claude Code chạy lên đều có sẵn skills.
# Repo riêng chỉ giữ skill project-specific trong .claude/skills/ của repo đó.
```

→ Khuyến nghị nếu bạn làm nhiều dự án song song.

## Convention khi thêm skill mới

1. **1 skill = 1 thư mục** với 1 file `SKILL.md`.
2. **Frontmatter bắt buộc**:
   ```yaml
   ---
   name: kebab-case-slug
   description: Câu mô tả khi nào dùng. Phải có "Use when..." hoặc "Triggers on..." để AI biết kích hoạt khi nào.
   ---
   ```
3. **`description` là cái duy nhất AI thấy mặc định** — phải đủ chi tiết để AI quyết định có load body không. Body chỉ load khi description match intent task.
4. **Body** ≤ 80 dòng. Dài hơn → tách subskill hoặc chuyển sang AGENTS.md.
5. **Tone**: imperative ("Use when X", "DO Y", "NEVER Z"). Không passive ("It is recommended...").
6. **Examples**: dùng ví dụ thực tế trong repo (manga, chapter, i18n) — concrete hơn abstract.

## Anti-pattern

- ❌ Skill bị duplicate với `commands/` hoặc `agents/`. Phân biệt rõ:
  - **Skill** = workflow pattern AI auto-apply (vd cách suy nghĩ)
  - **Command** = scaffolding lặp lại dev gõ thủ công
  - **Agent** = specialist context riêng cho task lớn
- ❌ Skill mô tả vague ("use this for coding") → AI không biết khi nào kích hoạt.
- ❌ Skill body dài 500 dòng → đốt context khi load. Tách hoặc tóm.
- ❌ Hard-code path absolute (`C:\Users\...`) → break trên máy khác.

## Nguồn

Pattern dựa trên **Anthropic Superpowers** (obra/superpowers). Bộ này thêm 2 skill FE-specific cho mangaka-web. Universal skills giữ nguyên spirit của Superpowers, dịch sang tiếng Việt + ví dụ phù hợp dự án.
