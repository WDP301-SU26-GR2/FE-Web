# Mangaka State Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw backend state values on the Mangaka dashboard and series pages with localised labels and a safe unknown-state fallback.

**Architecture:** Dashboard and series each own focused enum-translation helpers in their local `lib/` folder. The helpers receive i18next's translator, resolve documented Swagger enum values to existing `mangaka` keys, and return `state.unknown` for null or unfamiliar values. UI components consume helpers while preserving their present badge colour logic.

**Tech Stack:** React 19, TypeScript 5.9, i18next/react-i18next, Node 22 built-in `node:test` with TypeScript type stripping.

## Global Constraints

- Do not edit generated files under `app/api/model` or `app/api/operations`.
- Keep helpers in the affected feature's `lib/` folder.
- Add every localisation key to both `app/locales/en/mangaka.json` and `app/locales/vi/mangaka.json`.
- Unknown, null, and future state values must display `state.unknown`; raw API values must never be the label fallback.
- Preserve existing uncommitted publication-version and production-stage changes.
- Run `npm.cmd run typecheck` and `npm.cmd run lint` before completion.

---

### Task 1: Establish executable tests for translation mappings

**Files:**
- Modify: `package.json`
- Create: `app/features/mangaka/dashboard/lib/translate-manuscript-status.test.mjs`
- Create: `app/features/mangaka/series/lib/translate-series-state.test.mjs`

**Interfaces:**
- Consumes: Node 22's `node:test`, `node:assert/strict`.
- Produces: `npm.cmd test`, which runs both translation-helper test files with `node --experimental-strip-types --test --experimental-test-isolation=none`.

- [ ] **Step 1: Add the test command**

Add this script to `package.json`:

```json
"test": "node --experimental-strip-types --test --experimental-test-isolation=none app/features/mangaka/dashboard/lib/translate-manuscript-status.test.mjs app/features/mangaka/series/lib/translate-series-state.test.mjs"
```

- [ ] **Step 2: Write failing helper tests**

Use a translator stub that returns its key, then assert these contracts:

```ts
assert.equal(translateManuscriptStatus('IN_PRODUCTION', translate), 'dashboard.studio.subtitleInProduction')
assert.equal(translateManuscriptStatus('FUTURE_STATE', translate), 'state.unknown')
assert.equal(translateSeriesStatus('IN_REVIEW', translate), 'mySeries.statuses.IN_REVIEW')
assert.equal(translateProposalStatus('PROPOSAL_REVISION', translate), 'seriesDetail.proposalStatus.PROPOSAL_REVISION')
assert.equal(translateNameStatus('IN_REVIEW', translate), 'seriesDetail.nameStatus.IN_REVIEW')
assert.equal(translateNameStatus(null, translate), 'state.unknown')
```

The `.mjs` test files import the helpers using explicit `.ts` extensions so Node can execute them directly without changing the TypeScript compiler options.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm.cmd test`

Expected: FAIL because the helper modules do not exist yet.

### Task 2: Implement typed, feature-local translation helpers

**Files:**
- Create: `app/features/mangaka/dashboard/lib/translate-manuscript-status.ts`
- Create: `app/features/mangaka/series/lib/translate-series-state.ts`

**Interfaces:**
- Consumes: `t: (key: string) => string` and API state values as `string | null | undefined`.
- Produces:
  - `translateManuscriptStatus(status, t): string`
  - `translateSeriesStatus(status, t): string`
  - `translateProposalStatus(status, t): string`
  - `translateNameStatus(status, t): string`

- [ ] **Step 1: Implement the dashboard mapping**

Implement an exhaustive key map for `DRAFT`, `IN_PRODUCTION`, `EDITOR_REVIEW`, `EDITOR_REVISION`, `READY_FOR_PRINT`, `AWAITING_CO_OWNER_APPROVAL`, and `PUBLISHED`. Resolve the map entry through `t`; use `t('state.unknown')` whenever no entry exists.

- [ ] **Step 2: Implement the series mapping**

Implement separate key maps for the documented Series, Proposal, and Name enum members. The Series map targets `mySeries.statuses.*`; Proposal and Name maps target `seriesDetail.proposalStatus.*` and `seriesDetail.nameStatus.*`. All three use `t('state.unknown')` for a missing entry.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm.cmd test`

Expected: PASS for all recognised and fallback mapping assertions.

### Task 3: Integrate translators and localise the unknown fallback

**Files:**
- Modify: `app/features/mangaka/dashboard/mangaka-dashboard.tsx`
- Modify: `app/features/mangaka/series/my-series-page.tsx`
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**
- Consumes: helper exports from Task 2 and `state.unknown` in the `mangaka` namespace.
- Produces: localised labels on every scoped status badge and subtitle, including unfamiliar backend values.

- [ ] **Step 1: Add identical locale structure**

Add the root-level structure below to each locale file, with its language-specific label:

```json
"state": {
  "unknown": "Unknown status"
}
```

Use `Trạng thái chưa xác định` for the Vietnamese value.

- [ ] **Step 2: Replace dashboard label resolution**

Remove the component-local `getManuscriptSubtitle` switch and call `translateManuscriptStatus(item.manuscriptStatus, t)` for both the chapter subtitle fallback and the displayed status badge. Keep `getWarningColor` and `getSeriesStatusColor` unchanged.

- [ ] **Step 3: Replace series-page label resolution**

Remove the `statusLabel` function that falls back to `status`; call `translateSeriesStatus(series.status, t)` for the list badge.

- [ ] **Step 4: Replace series-detail raw fallbacks**

Remove the local `translate(key, fallback)` function. Render the main series status, proposal status, and Name status with the corresponding Task 2 translator. Keep badge metadata and action-state checks unchanged.

- [ ] **Step 5: Run targeted tests and static checks**

Run: `npm.cmd test`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: exit code 0.

Run: `npm.cmd run lint`

Expected: exit code 0.
