# Prompt: Skill Discovery (Meta)

Truoc khi bat dau task, scan resource co san trong mangaka-web. Dung tu nghi ra workflow neu repo da co encode pattern.

## Resources mangaka-web

### `.codex/prompts/` — reference prompts (manual reference)

| Prompt                           | Khi nao dung                    |
| -------------------------------- | ------------------------------- |
| `brainstorming.md`               | Task mo ho, can explore options |
| `writing-plans.md`               | Non-trivial work (>=3 file)     |
| `root-cause-analysis.md`         | Debug bug, error, test fail     |
| `defensive-programming.md`       | Can nhac validate o dau         |
| `subagent-driven-development.md` | Can nhac spawn vs inline        |
| `test-driven-development.md`     | Viet logic co input/output ro   |
| `using-git-worktrees.md`         | Multi-branch parallel           |
| `finishing-a-branch.md`          | Truoc khi mo PR / merge         |
| `debugging-hydration.md`         | Hydration mismatch / FOUC       |
| `accessibility-audit.md`         | Khi them UI interactive         |
| `new-feature.md`                 | Scaffold feature moi            |
| `pre-commit-check.md`            | Gate quality truoc commit       |
| `code-review.md`                 | Review diff theo checklist      |

### Docs (canonical)

| File              | Noi dung                                      |
| ----------------- | --------------------------------------------- |
| `AGENTS.md`       | Architecture + conventions (doc khi nghi ngo) |
| `ARCHITECTURE.md` | Onboarding + vi du them feature               |
| `README.md`       | Setup + scripts                               |

## Workflow khi nhan task moi

1. **Identify task type**:
   - Bug -> `root-cause-analysis.md`
   - Feature moi -> `brainstorming.md` -> `writing-plans.md` -> `new-feature.md`
   - Refactor -> `writing-plans.md` + `code-review.md` sau
   - Audit -> `code-review.md` hoac targeted prompt

2. **Check convention**: chinh vung co quy uoc (styling, i18n, architecture) -> mo `AGENTS.md` section lien quan.

3. **Apply prompt**: copy noi dung prompt vao Codex, hoac `@.codex/prompts/<name>.md`.

4. **Verify**: truoc khi bao done -> `finishing-a-branch.md` checklist.

## Cam

- Tu nghi ra workflow khi repo da co prompt tuong duong.
- Bo qua `AGENTS.md` roi doan convention.
- Dung prompt may moc — prompt la goi y cau truc, van can judgement.
