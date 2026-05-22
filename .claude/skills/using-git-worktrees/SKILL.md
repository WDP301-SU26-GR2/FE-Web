---
name: using-git-worktrees
description: Use when working on multiple branches in parallel, exploring an alternative approach without losing current work, or testing a risky refactor in isolation. Worktrees give each branch its own folder so node_modules and dev server don't conflict.
---

# Git Worktrees

**Vấn đề**: bạn đang code feature A trên `branch-a`, sếp bảo hot fix `main`. `git stash` rồi switch → mất state, dev server restart, có khi pending file mất.

**Giải pháp**: worktree — mỗi branch là 1 folder riêng, share `.git` chung.

## Tạo worktree

```bash
# Từ repo gốc:
git worktree add ../mangaka-web-hotfix main
# → tạo folder ../mangaka-web-hotfix checkout branch main

git worktree add ../mangaka-web-experiment -b experiment/new-theme
# → tạo branch mới + folder mới
```

## List & remove

```bash
git worktree list
# /d/.../mangaka-web              abc123 [feature/manga]
# /d/.../mangaka-web-hotfix       def456 [main]
# /d/.../mangaka-web-experiment   ghi789 [experiment/new-theme]

git worktree remove ../mangaka-web-experiment
```

## Use cases cho mangaka-web

### 1. Hot fix khi đang dở feature
- `mangaka-web/` đang code feature `/mangas` (chưa commit).
- Tạo `../mangaka-web-hotfix` checkout `main` → fix bug → push → xoá worktree.
- Folder gốc giữ nguyên state feature dở.

### 2. So sánh approach
- Đang phân vân giữa "TanStack Query" vs "RR7 loader".
- Tạo `../mangaka-web-tanstack` thử Query.
- Tạo `../mangaka-web-loader` thử loader.
- Compare side-by-side trong VS Code workspaces.

### 3. Code review PR
- Người khác mở PR → `git worktree add ../mangaka-web-review-pr-42 origin/feature/x`.
- Chạy dev server trong folder đó, test thực tế.
- Không ảnh hưởng folder làm việc chính.

## Caveat

- **`node_modules` không share** — mỗi worktree cần `npm install` riêng. Tốn disk.
- **`.env.local` không share** — copy thủ công.
- **Cùng 1 branch không thể checkout ở 2 worktree** → có lý do, đừng workaround.
- **Worktree khi remove**: `git worktree remove` an toàn (refuse nếu có uncommitted change). Không `rm -rf` thẳng.

## Pattern khuyến nghị cho team mangaka-web

Đặt sibling folder:
```
d:\FPT\semester-8\WDP\Code\
├── FE\                  # main worktree (feature đang làm)
├── FE-hotfix\           # khi cần fix main
└── FE-review\           # khi review PR
```

`.gitignore` đã ignore `node_modules/`, không lo commit nhầm.
