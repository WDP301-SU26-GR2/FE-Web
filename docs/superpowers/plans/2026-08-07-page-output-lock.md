# Page Output Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable Mangaka's add-page and per-page delete controls after production output confirmation succeeds.

**Architecture:** Keep `ProductionStagePanel` as the source of production state. Extract the page-set lock predicate into a pure helper, use it when notifying the page reader, and keep the existing reader controls unchanged because they already consume `pageSetLocked`.

**Tech Stack:** React, TypeScript, Node test runner with `--experimental-strip-types`.

## Global Constraints

- All colors use semantic tokens from `app/styles/theme.css`.
- API calls remain in Orval-generated operations; no new API calls are introduced.
- Responses continue to be read through `res.data`.
- Preserve unrelated existing worktree changes.

---

### Task 1: Add the lock predicate regression test

**Files:**

- Create: `app/features/mangaka/publication/lib/page-set-lock.test.mjs`
- Create: `app/features/mangaka/publication/lib/page-set-lock.ts`

**Interfaces:**

- Produces `isPageSetLocked(activeStageStatus: string | undefined, outputsLocked: boolean): boolean` for the production panel.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { isPageSetLocked } from './page-set-lock.ts'

test('locks the page set when active-stage outputs are confirmed', () => {
  assert.equal(isPageSetLocked('ACTIVE', true), true)
})

test('keeps the page set open while active-stage outputs are unconfirmed', () => {
  assert.equal(isPageSetLocked('ACTIVE', false), false)
})

test('locks the page set when the first stage is no longer active', () => {
  assert.equal(isPageSetLocked(undefined, false), true)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test app/features/mangaka/publication/lib/page-set-lock.test.mjs`

Expected: FAIL because `page-set-lock.ts` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function isPageSetLocked(activeStageStatus: string | undefined, outputsLocked: boolean): boolean {
  return outputsLocked || activeStageStatus !== 'ACTIVE'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-strip-types --test app/features/mangaka/publication/lib/page-set-lock.test.mjs`

Expected: PASS.

### Task 2: Connect confirmed outputs to page controls

**Files:**

- Modify: `app/features/mangaka/publication/components/production-stage-panel.tsx`

**Interfaces:**

- Consumes `isPageSetLocked` from `../lib/page-set-lock`.
- Produces the same `onPageSetLockChange(boolean)` contract already consumed by `PublicationPagesReaderView`.

- [ ] **Step 1: Update the refresh calculation**

Import `isPageSetLocked` and replace the callback argument with:

```ts
onPageSetLockChange(isPageSetLocked(current?.status, areOutputsLocked))
```

This keeps the page set open for an active stage until confirmation, locks it once all outputs are confirmed, and reopens it after refresh when the next stage becomes active.

- [ ] **Step 2: Run the focused regression test**

Run: `node --experimental-strip-types --test app/features/mangaka/publication/lib/page-set-lock.test.mjs`

Expected: PASS.

- [ ] **Step 3: Run project verification**

Run: `npm run typecheck`

Expected: PASS with no TypeScript errors.

Run: `npm run lint`

Expected: PASS with no ESLint errors.
