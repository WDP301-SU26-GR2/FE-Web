# Mangaka Series and Chapter Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the missing Mangaka series, proposal-Name, and draft-chapter lifecycle actions documented in `FE-Web-Guide/03-mangaka.md`.

**Architecture:** Extend the existing `mangaka/series`, `mangaka/chapters`, and `mangaka/publication` slices. Actions are gated by the documented state machine and refresh the current series/chapter view after success.

**Tech Stack:** React 19, React Router 7, TypeScript strict, Orval-generated API operations, Tailwind v4 semantic tokens, i18next.

## Global Constraints

- Do not implement annotation or task batch behavior.
- Preserve completed proposal create/submit/resubmit/withdraw/reopen behavior.
- Use `res.data`, shared error mapping, R2 helpers for files, dual-language strings, and semantic tokens.
- Do not add dependencies or commit changes without explicit user approval.

---

### Task 1: Wire series metadata, franchise consent, and completion proposal actions

**Files:**

- Create: `app/features/mangaka/series/use-series-lifecycle-actions.ts`
- Create: `app/features/mangaka/series/components/series-metadata-dialog.tsx`
- Modify: `app/features/mangaka/series/components/completion-proposal-dialog.tsx`
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useSeriesLifecycleActions` calls `seriesControllerUpdateSeriesMetadata`, `seriesControllerFranchiseConsent`, and `seriesControllerProposeCompletion` and returns success/error results.
- The series detail page calls `refresh()` after each successful lifecycle mutation.

- [x] Implement metadata updates with `title`, `coverImage`, `synopsis`, and `characterDesigns`, retaining omitted fields and requiring confirmation before intentionally clearing cover/synopsis/character designs.
- [x] Wire the existing completion dialog submit handler to `seriesControllerProposeCompletion({ id }, { reason, proposedEndingChapters })`; show it only for owner-accessible `SERIALIZED` or `HIATUS` series.
- [x] Render franchise consent only when `franchiseConsentStatus === 'PENDING'` and the current user owns the parent series; require explicit approve/reject confirmation.
- [x] Add state-specific EN/VI copy and run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 2: Complete proposal-Name and chapter-Name detail/page actions

**Files:**

- Create: `app/features/mangaka/publication/hooks/use-name-detail.ts`
- Create: `app/features/mangaka/publication/hooks/use-add-name-page.ts`
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx`
- Modify: `app/features/mangaka/publication/publication-name-view.tsx`
- Modify: `app/features/mangaka/publication/components/upload-page-dialog.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useNameDetail` selects `nameControllerGetOne` for proposal Names and `chapterNameControllerGetOne` for chapter Names.
- `useAddNamePage` uploads to R2, then calls `nameControllerAddPage` or `chapterNameControllerAddPage` with `{ pageNumber, fileUrl }`.

- [x] Add detail loading before displaying a Name's pages so the UI uses the full response rather than assuming list-item completeness.
- [x] Add an append-page path that is visible only in `DRAFT` or `REVISION`, validates a positive unique page number, uploads the file, and refreshes the Name after success.
- [x] Keep whole-list replace behavior intact; never replace pages when the user chose append.
- [x] Provide EN/VI empty, validation, upload, and API-error feedback; run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 3: Add draft-chapter edit and delete controls

**Files:**

- Create: `app/features/mangaka/chapters/components/chapter-edit-dialog.tsx`
- Create: `app/features/mangaka/chapters/use-chapter-actions.ts`
- Modify: `app/features/mangaka/chapters/publication-section.tsx`
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useChapterActions` exposes `updateChapter(id, { title?, chapterNumber? })` and `removeChapter(id)` using `chapterControllerUpdate` and `chapterControllerRemove`.
- Both actions call the supplied `onChanged` only after an HTTP success.

- [x] Render edit/delete controls only for an owned DRAFT chapter.
- [x] Validate positive chapter numbers and reject duplicate numbers in the currently loaded list before calling the API; retain backend 409 as the final authority.
- [x] Use a destructive confirmation that names the chapter to be deleted and refresh the series chapter list after success.
- [x] Add complete EN/VI strings and run `npm run typecheck`, `npm run lint`, and `npm run prettier`.
