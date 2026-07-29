# Remove Mangaka Publication Versions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the publication-version section and its data requests from the Mangaka series-detail page.

**Architecture:** The series-detail page will stop importing and rendering the dedicated panel and stop invoking its hook. Since those files are private to the Mangaka series slice and have no remaining callers, they and their i18n keys will be removed. Other roles retain their independent publication-version flows.

**Tech Stack:** React 19, TypeScript, React Router 7, react-i18next, ESLint.

## Global Constraints

- Preserve Editor, Admin, and Board publication-version features.
- Keep English and Vietnamese locale resources structurally mirrored.
- Use named exports, TypeScript strict mode, and existing `~/` import conventions.

---

### Task 1: Remove Mangaka publication-version UI and unused assets

**Files:**
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx:54-55,187,664-674`
- Modify: `app/locales/en/mangaka.json:seriesDetail.publicationVersions`
- Modify: `app/locales/vi/mangaka.json:seriesDetail.publicationVersions`
- Delete: `app/features/mangaka/series/components/publication-versions-panel.tsx`
- Delete: `app/features/mangaka/series/use-publication-versions.ts`

**Interfaces:**
- Consumes: Existing series detail page, Mangaka locale resources.
- Produces: A series detail page with no publication-version UI or API loading.

- [ ] **Step 1: Establish the removal boundary**

Run: `rg -n "PublicationVersionsPanel|usePublicationVersions|seriesDetail\\.publicationVersions" app --glob "!api/**"`

Expected: Only the Mangaka series-detail page, its private hook/panel, and their locales use the identifiers.

- [ ] **Step 2: Remove the page integration**

Delete the `PublicationVersionsPanel` and `usePublicationVersions` imports, remove the hook call, and remove the panel JSX. Retain the adjacent publication chapter section and image carousel unchanged.

- [ ] **Step 3: Remove private dead code and translations**

Delete the private panel and hook files. Delete `seriesDetail.publicationVersions` from both locale JSON files so both language trees remain identical.

- [ ] **Step 4: Verify the resulting application**

Run: `rg -n "PublicationVersionsPanel|usePublicationVersions|seriesDetail\\.publicationVersions" app --glob "!api/**"`

Expected: No matches.

Run: `npm run typecheck`

Expected: Exit code 0.

Run: `npm run lint`

Expected: Exit code 0.
