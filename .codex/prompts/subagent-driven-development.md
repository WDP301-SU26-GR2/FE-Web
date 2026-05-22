# Prompt: Subagent-Driven Development

Subagent chay trong context window rieng — main chi nhan tom tat.

## SPAWN khi

1. **Independent research broad scope** — vd "tim tat ca noi hard-code mau" -> agent grep + report, khong nhet vao main.
2. **Parallel exploration** — 3 hypothesis verify song song -> spawn 3 agent cung message.
3. **Protected context** — task can doc 20 file truoc khi de xuat. Inline lam phinh main. Spawn -> tom tat tra ve.
4. **Specialized prompt** — `@code-reviewer` co system prompt rieng (checklist mangaka-web).

## KHONG spawn khi

1. **Target biet ro** — "Doc root.tsx" -> Read truc tiep.
2. **Task < 3 tool call** — sua typo README -> Read + Edit, khong spawn.
3. **Can context conversation** — agent khong thay history. Phai brief lai trong prompt.
4. **Iterative voi feedback** — agent return 1 lan, can sua tung buoc -> inline.

## Brief agent self-contained

Agent KHONG co context conversation. Prompt phai du:

### Bad
```
Review changes based on what we discussed.
```

### Good
```
Review diff main..HEAD trong repo mangaka-web.
Context: vua them /mangas route. Check:
1. Route file thin (chi compose feature).
2. i18n key moi co ca en/manga.json va vi/manga.json.
3. Khong hex color trong component moi.
4. Khong cross-feature import.

Report:
🔴 Blocker: ...
🟡 Warning: ...
✅ OK: ...
```

## Parallel spawn

Trong 1 message, goi nhieu Agent tool song song. Vd:
- Agent 1: audit i18n parity
- Agent 2: grep hex color
- Agent 3: check route thinness

## Trust but verify

Agent report **intent**. Neu agent write code -> doc lai diff bang Read, khong tin "agent noi xong".

## Cost

Moi spawn = fresh context = dat hon tool call thuong. Can nhac.
