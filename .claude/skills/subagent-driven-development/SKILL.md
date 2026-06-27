---
name: subagent-driven-development
description: Use when to spawn a subagent (Agent tool) vs do work inline. Spawn for independent research, parallel queries, or to protect main context from large search results. Don't spawn for tasks you can do directly in 2-3 tool calls. Triggers when considering Agent tool.
---

# Subagent-Driven Development

Subagent (`@code-reviewer`, `@i18n-checker`, hoặc spawn ad-hoc) chạy trong **context window riêng** — kết quả trả về main là 1 message tóm tắt.

## KHI NÀO spawn

### 1. Independent research broad scope

"Tìm tất cả nơi code đang hard-code màu hex" → spawn agent grep + report, không nhét full output vào main context.

### 2. Parallel exploration

3 hypothesis cần verify song song: spawn 3 agent cùng lúc trong 1 message.

### 3. Protected context

Task cần đọc 20 file để hiểu architecture trước khi đề xuất. Inline sẽ phình main context. Spawn agent → tóm tắt → main context nhận paragraph.

### 4. Specialized prompt

`@code-reviewer` có system prompt đặc biệt (checklist mangaka-web). Inline thì AI chính phải tự nhớ checklist.

## KHI NÀO KHÔNG spawn

### 1. Task biết rõ target

"Đọc `app/root.tsx`" → Read trực tiếp. Spawn là phí thời gian + token.

### 2. Task < 3 tool call

"Sửa typo trong README" → Read + Edit. Không spawn.

### 3. Cần context của conversation

Subagent KHÔNG thấy lịch sử conversation. Nếu task phụ thuộc vào "cái user vừa nói lúc nãy" → không spawn được (hoặc phải brief lại trong prompt agent).

### 4. Cần làm code change từng bước có feedback

Subagent return 1 lần. Implementation lớn cần iterative review → inline để user can thiệp giữa chừng.

## Cách brief subagent

Agent **không có context conversation**. Prompt phải self-contained:

### ❌ Bad

```
Review changes based on what we discussed.
```

### ✅ Good

```
Review the diff between `main` and current branch in repo mangaka-web.
Context: I just added a /mangas route. Check these specifically:
1. Route file is thin (only composes feature).
2. New i18n keys exist in BOTH en/manga.json and vi/manga.json.
3. No hex colors in new components.
4. No cross-feature imports.

Report findings in this format:
🔴 Blocker: ...
🟡 Warning: ...
✅ OK: ...
```

## Parallel spawn pattern

Khi cần check nhiều thứ độc lập:

```
[Single message với 3 Agent tool calls song song]
- Agent 1: audit i18n parity
- Agent 2: grep hex color violations
- Agent 3: check route file thinness
```

Cả 3 chạy parallel, return cùng lúc → main tổng hợp.

## Trust but verify

Subagent **report intent**, không guarantee thực hiện đúng. Nếu agent write code:

- Đọc lại diff thật bằng Read.
- Không tin "agent nói đã làm X" mà không kiểm tra.

## Cost awareness

Mỗi spawn = fresh context = đắt hơn 1 tool call thông thường. Cân nhắc.
