# Prompt: Git Worktrees

Moi branch = 1 folder rieng, share .git chung. Tranh stash/restash khi switch.

## Tao

```bash
git worktree add ../mangaka-web-hotfix main
# tao folder ../mangaka-web-hotfix checkout main

git worktree add ../mangaka-web-experiment -b experiment/new-theme
# tao branch moi + folder moi
```

## List & remove

```bash
git worktree list
git worktree remove ../mangaka-web-experiment
```

## Use cases mangaka-web

1. **Hot fix khi dang do feature** — folder goc giu state, hot fix o folder phu.
2. **So sanh approach** — `..-tanstack` vs `..-loader`, compare side-by-side.
3. **Review PR** — `git worktree add ../mangaka-web-review-pr-42 origin/feature/x`, chay dev server, test that.

## Caveat

- `node_modules` KHONG share — moi worktree `npm install` rieng. Ton disk.
- `.env.local` KHONG share — copy thu cong.
- Cung branch khong checkout o 2 worktree.
- `git worktree remove` safe (refuse neu uncommitted). KHONG `rm -rf`.

## Pattern khuyen nghi

```
Code/
├── FE/                  # main worktree (feature dang lam)
├── FE-hotfix/           # khi can fix main
└── FE-review/           # khi review PR
```

.gitignore da ignore node_modules.
