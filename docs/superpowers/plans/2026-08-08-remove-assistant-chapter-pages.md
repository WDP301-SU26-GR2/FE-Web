# Remove Assistant Chapter Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant Assistant chapter overview page and every page-specific entry point while preserving shared chapter and task functionality.

**Architecture:** The page is a self-contained route module registered under the Assistant dashboard. Remove that module, its route registration, its Assistant sidebar entry, and its dedicated bilingual translation object. Keep generated API code and shared task/chapter hooks because repository search shows they are consumed by other features.

**Tech Stack:** React Router 7, React 19, TypeScript, i18next/react-i18next, Tailwind CSS v4, npm scripts, PowerShell/`rg` verification.

## Global Constraints

- Remove only the Assistant chapter overview feature at `/dashboard/assistant/chapter-pages`.
- Do not alter generated files under `app/api/`.
- Do not remove shared chapter/task operations or `useTaskSignedUrl` because other workflows consume them.
- Keep all English and Vietnamese locale files structurally valid after deleting the page-specific `nav.chapterPages` and `assistant.chapterPages` keys.
- Do not commit unless explicitly requested by the user.

---

### Task 1: Capture the removal boundary and verify shared consumers

**Files:**

- Read: `app/routes/assistant/chapter-pages.tsx`
- Read: `app/routes.ts`
- Read: `app/shared/components/dashboard-nav-config.tsx`
- Read: `app/locales/en/common.json`
- Read: `app/locales/vi/common.json`
- Read: `app/locales/en/assistant.json`
- Read: `app/locales/vi/assistant.json`
- Test: repository-wide `rg` searches described below

**Interfaces:**

- Consumes: Existing route, navigation, and locale references for `chapter-pages`/`chapterPages`.
- Produces: A verified list of page-specific references to remove and a verified list of shared API/hook consumers to preserve.

- [x] **Step 1: Confirm the page-specific references before editing**

Run:

```powershell
rg -n --glob '!app/api/**' --glob '!node_modules/**' 'chapter-pages|chapterPages' app
```

Expected: matches are limited to the Assistant route registration, Assistant sidebar item, Assistant route module, common navigation labels, and the dedicated `chapterPages` locale objects, plus any intentionally related translation references found during review.

- [x] **Step 2: Confirm shared chapter/task consumers remain**

Run:

```powershell
rg -n 'chapterControllerListPages|taskControllerListTasks|useTaskSignedUrl' app --glob '!app/routes/assistant/chapter-pages.tsx'
```

Expected: matches remain in Mangaka, Editor, Assistant task, and shared hook files, proving those APIs and hooks must not be deleted.

### Task 2: Remove the Assistant chapter overview feature

**Files:**

- Delete: `app/routes/assistant/chapter-pages.tsx`
- Modify: `app/routes.ts`
- Modify: `app/shared/components/dashboard-nav-config.tsx`
- Modify: `app/locales/en/common.json`
- Modify: `app/locales/vi/common.json`
- Modify: `app/locales/en/assistant.json`
- Modify: `app/locales/vi/assistant.json`

**Interfaces:**

- Consumes: The route and navigation references identified in Task 1.
- Produces: Assistant dashboard routing and navigation without the chapter overview entry; bilingual Assistant resources without the unused `chapterPages` namespace key.

- [x] **Step 1: Remove the route registration**

In the Assistant route group in `app/routes.ts`, remove only this child route:

```ts
route('chapter-pages', 'routes/assistant/chapter-pages.tsx'),
```

Keep the neighboring `tasks`, `studio`, `invites`, `notifications`, and `profile` routes unchanged.

- [x] **Step 2: Remove the Assistant sidebar item**

In `buildAssistantConfig` in `app/shared/components/dashboard-nav-config.tsx`, remove only this item:

```tsx
{ label: t('nav.chapterPages'), href: '/dashboard/assistant/chapter-pages', icon: BookOpen },
```

Keep `BookOpen` imported if another navigation configuration still uses it; do not change unrelated role navigation.

- [x] **Step 3: Delete the self-contained route module**

Delete `app/routes/assistant/chapter-pages.tsx`, including its page component, `ChapterPageCard`, and `EmptyState`. Do not delete `app/shared/hooks/use-task-signed-url.ts` or generated chapter/task operations.

- [x] **Step 4: Remove the dedicated locale object in English**

In `app/locales/en/assistant.json`, remove the complete top-level object beginning with:

```json
"chapterPages": {
```

and ending immediately before the existing top-level `"tasks"` object. Preserve the comma placement between the remaining `dashboard` and `tasks` objects so the JSON remains valid.

- [x] **Step 5: Remove the dedicated locale object in Vietnamese**

Apply the same structural deletion in `app/locales/vi/assistant.json`: remove the complete top-level `"chapterPages"` object between `dashboard` and `tasks`, preserving valid JSON and leaving all other Assistant translations unchanged.

- [x] **Step 6: Remove the obsolete sidebar labels from common locales**

In both `app/locales/en/common.json` and `app/locales/vi/common.json`, remove only the `chapterPages` property inside the top-level `nav` object:

```json
"chapterPages": "Chapter pages",
```

Use the Vietnamese value `"Trang chương"` in the Vietnamese file. Preserve all other common navigation labels and valid comma placement.

### Task 3: Verify the cleanup and application integrity

**Files:**

- Read: final git diff and repository references
- Test: repository reference scans, JSON parsing through the project toolchain, `npm run typecheck`, `npm run lint`

**Interfaces:**

- Consumes: Changes from Task 2.
- Produces: Evidence that the removed route is unreachable through configuration, no page-specific references remain, and the application still typechecks and lints.

- [x] **Step 1: Confirm page-specific references are gone**

Run:

```powershell
rg -n --glob '!app/api/**' --glob '!node_modules/**' 'chapter-pages|chapterPages' app
```

Expected: no matches. If a remaining match is found, inspect it and remove it only when it belongs specifically to the deleted Assistant page; preserve unrelated generic chapter strings.

- [x] **Step 2: Confirm the route file is absent and inspect the diff**

Run:

```powershell
Test-Path -LiteralPath 'app/routes/assistant/chapter-pages.tsx'
git diff -- app/routes.ts app/shared/components/dashboard-nav-config.tsx app/locales/en/common.json app/locales/vi/common.json app/locales/en/assistant.json app/locales/vi/assistant.json app/routes/assistant/chapter-pages.tsx
```

Expected: `False`; the diff contains only route/nav/locale removal plus the deleted self-contained route file.

- [x] **Step 3: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0 with no TypeScript or React Router type-generation errors.

- [x] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: exit code 0 with no ESLint errors.

Observed: the full repository lint reports four pre-existing errors and 351 warnings outside this change. Targeted lint for `app/routes.ts` and `app/shared/components/dashboard-nav-config.tsx` exits successfully.

- [x] **Step 5: Review the final status without committing**

Run:

```powershell
git status --short
```

Observed: the Assistant cleanup changes are present and no commit is created. The workspace also contains unrelated pre-existing Mangaka ranking changes; those changes were preserved and not included in this task's edits.
