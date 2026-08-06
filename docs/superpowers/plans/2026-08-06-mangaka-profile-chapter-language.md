# Mangaka Profile and Chapter Language Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Correct the Mangaka Vietnamese profile terminology and simplify the create-chapter dialog so no English `chapter`, internal series ID, or unwanted explanatory paragraph is shown.

**Architecture:** Keep all domain/API identifiers unchanged. Update the existing locale objects for copy, and adjust the existing `CreateChapterDialog` presentation to omit the internal ID and description. A Node test will validate the locale values and the JSX source contract because this repository has no React DOM test harness.

**Tech Stack:** React 19, TypeScript, react-i18next, Node built-in test runner, JSON locale resources.

## Global Constraints

- Every new or changed user-facing string must exist in both EN and VI locale files.
- Keep `portfolioFiles`, `seriesId`, and `chapterNumber` as internal code/API identifiers.
- Do not change chapter creation payloads, validation, navigation, or API calls.
- Do not expose raw internal IDs in the user-facing dialog.
- Preserve all unrelated working-tree changes; only touch the scoped files and the new focused test/spec/plan files.

---

### Task 1: Add a failing regression test for the requested UI contract

**Files:**
- Create: `scripts/mangaka-profile-chapter-language.test.mjs`
- Read: `app/locales/vi/profile.json`
- Read: `app/locales/vi/mangaka.json`
- Read: `app/locales/en/mangaka.json`
- Read: `app/features/mangaka/chapters/create-chapter-dialog.tsx`

**Interfaces:**
- Consumes the locale JSON and dialog source text from the repository.
- Produces a repeatable Node test covering the exact requested copy and hidden UI elements.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')

test('Vietnamese profile uses Danh mục dự án for portfolio labels', async () => {
  const profile = JSON.parse(await read('app/locales/vi/profile.json'))

  assert.equal(profile.sections.portfolio, 'Danh mục dự án')
  assert.equal(profile.fields.portfolio, 'Danh mục dự án')
  assert.equal(profile.portfolioAlt, 'Ảnh Danh mục dự án')
})

test('create-chapter dialog uses Vietnamese chapter wording without internal details', async () => {
  const vi = JSON.parse(await read('app/locales/vi/mangaka.json'))
  const en = JSON.parse(await read('app/locales/en/mangaka.json'))
  const dialog = await read('app/features/mangaka/chapters/create-chapter-dialog.tsx')
  const createVi = vi.seriesDetail.publication.create
  const createEn = en.seriesDetail.publication.create

  assert.equal(createVi.dialogTitle, 'Tạo chương mới')
  assert.equal(createVi.confirm, 'Tạo chương')
  assert.equal(createVi.creating, 'Đang tạo...')
  assert.equal(createVi.success, 'Đã tạo chương mới.')
  assert.equal(createVi.errorGeneric, 'Không thể tạo chương. Vui lòng thử lại.')
  assert.equal('dialogDescription' in createVi, false)
  assert.equal('dialogDescription' in createEn, false)
  assert.doesNotMatch(dialog, /aria-describedby=/)
  assert.doesNotMatch(dialog, /\{seriesId\}/)
})
```

- [ ] **Step 2: Run the focused test to verify it fails for the current behavior**

Run: `node --test scripts/mangaka-profile-chapter-language.test.mjs`

Expected: FAIL because the existing Vietnamese locale still contains
`Portfolio`/`chapter`, the description key exists, and the dialog source still
renders both `aria-describedby` and `{seriesId}`.

### Task 2: Implement the copy and dialog cleanup

**Files:**
- Modify: `app/locales/vi/profile.json:85-120`
- Modify: `app/locales/vi/mangaka.json:859-870`
- Modify: `app/locales/en/mangaka.json:859-870`
- Modify: `app/features/mangaka/chapters/create-chapter-dialog.tsx:91-125`

**Interfaces:**
- Consumes the existing i18n keys and `CreateChapterDialogProps.seriesId` used by the parent.
- Produces the same form submit behavior while changing only visible presentation and locale values.

- [ ] **Step 1: Update Vietnamese profile labels**

Change only the visible profile values in `app/locales/vi/profile.json`:

```json
"sections": { "portfolio": "Danh mục dự án" },
"fields": { "portfolio": "Danh mục dự án" },
"portfolioAlt": "Ảnh Danh mục dự án"
```

Leave keys such as `portfolioFiles` in TypeScript and all upload/error behavior unchanged.

- [ ] **Step 2: Remove the obsolete create-dialog description locale key in both languages**

Delete only the `dialogDescription` property from the matching `create` object in both `vi/mangaka.json` and `en/mangaka.json`. Keep the rest of each language's existing wording until the Vietnamese chapter translations are applied.

- [ ] **Step 3: Translate the create-chapter Vietnamese copy**

In `vi/mangaka.json`, use these exact values:

```json
"dialogTitle": "Tạo chương mới",
"confirm": "Tạo chương",
"creating": "Đang tạo...",
"success": "Đã tạo chương mới.",
"errorGeneric": "Không thể tạo chương. Vui lòng thử lại."
```

Keep `seriesLabel` as `Series` and the already-correct `chapterNumberLabel` as `Số chương`.

- [ ] **Step 4: Remove internal ID and description rendering from the dialog**

In `create-chapter-dialog.tsx`:

- Remove `aria-describedby='create-chapter-dialog-desc'` from the dialog root.
- Remove the `<p id='create-chapter-dialog-desc'>...</p>` block.
- Remove the `/* Series (read-only) */` block that renders `{seriesId}`.
- Keep `seriesId` in the public props type because the parent still supplies it,
  but stop destructuring it in the function since it is no longer rendered.

- [ ] **Step 5: Run the focused test to verify the implementation passes**

Run: `node --test scripts/mangaka-profile-chapter-language.test.mjs`

Expected: PASS with both requested regression tests passing.

### Task 3: Run repository verification and inspect the final diff

**Files:**
- Inspect: `app/features/mangaka/chapters/create-chapter-dialog.tsx`
- Inspect: `app/locales/vi/profile.json`
- Inspect: `app/locales/vi/mangaka.json`
- Inspect: `app/locales/en/mangaka.json`
- Inspect: `scripts/mangaka-profile-chapter-language.test.mjs`

**Interfaces:**
- Consumes the implementation from Task 2.
- Produces verified, formatted, type-safe changes without modifying unrelated generated/API worktree changes.

- [ ] **Step 1: Run the full existing test script**

Run: `npm test`

Expected: PASS for all repository-listed Node tests, including the focused test only when invoked separately because the existing script has an explicit file list.

- [ ] **Step 2: Validate typecheck and lint**

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0, with no new diagnostics from the scoped files.

- [ ] **Step 3: Validate formatting for changed files**

Run: `npx prettier --check app/features/mangaka/chapters/create-chapter-dialog.tsx app/locales/vi/profile.json app/locales/vi/mangaka.json app/locales/en/mangaka.json scripts/mangaka-profile-chapter-language.test.mjs`

Expected: all listed files pass formatting.

- [ ] **Step 4: Review the scoped diff**

Run: `git diff -- app/features/mangaka/chapters/create-chapter-dialog.tsx app/locales/vi/profile.json app/locales/vi/mangaka.json app/locales/en/mangaka.json scripts/mangaka-profile-chapter-language.test.mjs`

Confirm that the diff contains only the requested text/UI changes and the regression test. Do not stage or commit because the repository instructions prohibit committing without an explicit user request.
