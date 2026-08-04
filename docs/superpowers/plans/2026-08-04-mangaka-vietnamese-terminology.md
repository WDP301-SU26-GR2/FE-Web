# Mangaka Vietnamese Terminology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every Vietnamese Mangaka-facing use of the `series` and `studio` concepts display as “loạt truyện” and “xưởng vẽ”.

**Architecture:** Preserve routes, API clients, enum values, i18n keys and interpolation variable names. Change Vietnamese leaf copy and Mangaka browser-title values only. A Node test walks locale leaf values, ignoring `{{series}}`-style placeholders, and rejects visible `series`, `studio`, and the legacy spelling `seri`.

**Tech Stack:** React Router 7, TypeScript, i18next JSON resources, Node built-in test runner.

## Global Constraints

- Change visible Mangaka Vietnamese terminology only: `series` → `loạt truyện`; `studio` → `xưởng vẽ`.
- Do not change enums, APIs, routes, directory names, i18n key names, interpolation names, English copy, or non-Mangaka copy.
- Keep JSON valid and UTF-8 encoded.

---

### Task 1: Guard the Vietnamese terminology contract

**Files:**
- Create: `app/locales/vi/mangaka.terminology.test.mjs`
- Test: `app/locales/vi/mangaka.terminology.test.mjs`

**Interfaces:**
- Consumes: `app/locales/vi/mangaka.json` as UTF-8 JSON.
- Produces: a Node test that ignores technical interpolation variables and fails when prohibited visible terms remain.

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const forbidden = /\b(?:series|studio|seri)\b/i

function visibleLeaves(value, path = []) {
  if (typeof value === 'string') return [[path.join('.'), value.replace(/{{\s*[^}]+\s*}}/g, '')]]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => visibleLeaves(child, [...path, key]))
}

test('Vietnamese Mangaka copy uses the approved terminology', () => {
  const locale = JSON.parse(readFileSync(new URL('./mangaka.json', import.meta.url), 'utf8'))
  const violations = visibleLeaves(locale).filter(([, copy]) => forbidden.test(copy))
  assert.deepEqual(violations, [])
})
```

- [ ] **Step 2: Run the test before copy changes**

Run: `node --test app/locales/vi/mangaka.terminology.test.mjs`

Expected: FAIL, listing existing untranslated leaf values.

- [ ] **Step 3: Commit the test guard**

Run: `git add app/locales/vi/mangaka.terminology.test.mjs` then `git commit -m "test: guard Mangaka Vietnamese terminology"`.

### Task 2: Normalize Mangaka copy and browser titles

**Files:**
- Modify: `app/locales/vi/mangaka.json`
- Modify: `app/shared/config/document-titles.ts:11-21`
- Test: `app/locales/vi/mangaka.terminology.test.mjs`

**Interfaces:**
- Consumes: existing i18next keys and `resolveDocumentTitle(pathname)` route patterns.
- Produces: unchanged keys/patterns whose user-visible Vietnamese values use the approved terms.

- [ ] **Step 1: Update all locale leaf values**

Update every user-visible occurrence in route metadata, dashboard, invitations, My Studio, My Series, detail/wizard/publication, tasks, franchise consent, deadlines, finance, rankings, transfers, contracts and notifications. Use “loạt truyện” for the domain entity and “xưởng vẽ” for the working area; retain placeholders such as `{{series}}`.

- [ ] **Step 2: Update Mangaka document titles**

Keep the existing Mangaka route patterns. Change series title values to “loạt truyện” and `/dashboard/mangaka/studio` to “Xưởng vẽ của tôi”; do not alter other roles’ title values.

- [ ] **Step 3: Run terminology checks**

Run: `node --test app/locales/vi/mangaka.terminology.test.mjs`.

Expected: PASS.

Run: `rg -n -i "series|studio|seri" app/shared/config/document-titles.ts`.

Expected: no Mangaka title value includes a prohibited term; route patterns and other-role values may match.

- [ ] **Step 4: Commit the copy change**

Run: `git add app/locales/vi/mangaka.json app/shared/config/document-titles.ts` then `git commit -m "fix: normalize Mangaka Vietnamese terminology"`.

### Task 3: Validate integration

**Files:**
- Verify: `app/locales/vi/mangaka.json`
- Verify: `app/shared/config/document-titles.ts`

**Interfaces:**
- Consumes: existing i18next resource loading and TypeScript app contract.
- Produces: parseable resources and unchanged application behavior outside visible Vietnamese Mangaka terms.

- [ ] **Step 1: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('app/locales/vi/mangaka.json', 'utf8')); console.log('valid JSON')"`.

Expected: `valid JSON`.

- [ ] **Step 2: Run project checks**

Run: `npm run typecheck`, `npm run lint`, and `npx prettier --check app/locales/vi/mangaka.json app/locales/vi/mangaka.terminology.test.mjs app/shared/config/document-titles.ts`.

Expected: each command exits 0.

- [ ] **Step 3: Commit verified work**

Run: `git add app/locales/vi/mangaka.json app/locales/vi/mangaka.terminology.test.mjs app/shared/config/document-titles.ts` then `git commit -m "fix: normalize Mangaka Vietnamese terminology"`.
