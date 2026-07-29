# Remove Assistant-Directory Search Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the name, availability-date, and level filters from the Mangaka assistant directory while retaining specialization filtering and all directory workflows.

**Architecture:** The page keeps the specialization chip bar but drops the right-hand input grid and its local input state. The data hook retains pagination and specialization filtering only, so the generated assistant-list request no longer receives the removed query parameters.

**Tech Stack:** React 19, TypeScript, React Router 7, i18next, Node.js static source test.

## Global Constraints

- Keep all colors token-driven through existing Tailwind semantic classes.
- Preserve specialization chips, assistant cards, pagination, empty/error states, and invitation/profile workflows.
- Remove matching English and Vietnamese translation keys in the `mangaka` namespace.
- Do not hand-edit generated API types or operation functions.
- Verify with the focused test and `npm run typecheck`.

---

### Task 1: Add a regression check for the removed controls and query state

**Files:**
- Create: `scripts/assistant-directory-search-filter-removal.test.mjs`

**Interfaces:**
- Consumes: `app/features/mangaka/assistants/assistant-directory-page.tsx` and `app/features/mangaka/assistants/use-assistant-directory.ts` as UTF-8 source files.
- Produces: a zero-exit Node.js check when the search/date/level controls and hook query-state symbols are absent.

- [x] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/features/mangaka/assistants/assistant-directory-page.tsx', 'utf8')
const hook = readFileSync('app/features/mangaka/assistants/use-assistant-directory.ts', 'utf8')

for (const source of [page, hook]) {
  for (const symbol of ['setLevel', 'setQuery', 'setAvailableFrom', 'setAvailableTo']) {
    assert.equal(source.includes(symbol), false, `${symbol} must be removed`)
  }
}

assert.equal(page.includes('namePlaceholder'), false)
assert.equal(page.includes('levelPlaceholder'), false)
assert.equal(page.includes("type='datetime-local'"), false)
assert.equal(hook.includes('params.q ='), false)
assert.equal(hook.includes('params.level ='), false)
assert.equal(hook.includes('params.availableFrom ='), false)
assert.equal(hook.includes('params.availableTo ='), false)
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node scripts/assistant-directory-search-filter-removal.test.mjs`

Expected: FAIL because `setLevel` and the date/search controls still exist.

### Task 2: Remove the controls and unused directory query state

**Files:**
- Modify: `app/features/mangaka/assistants/assistant-directory-page.tsx`
- Modify: `app/features/mangaka/assistants/use-assistant-directory.ts`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**
- Consumes: the unchanged `setSpecialization`, `specialization`, `setPage`, and `refresh` members of `useAssistantDirectory`.
- Produces: `useAssistantDirectory()` fetches using only `limit`, `offset`, and an optional `specialization` request parameter.

- [x] **Step 1: Write the minimal implementation**

```tsx
const { items, total, page, perPage, isLoading, error, setPage, setSpecialization, specialization, refresh } =
  useAssistantDirectory()

// Keep this specialization-chip bar; remove the adjacent search/date/level grid.
<div className='flex flex-1 flex-wrap items-center gap-2'>...</div>
```

```ts
const fetchPage = useCallback(async (targetPage: number, spec: Specialization | undefined) => {
  const params: UsersControllerListAssistantsParams = { limit: ASSISTANT_PAGE_SIZE, offset }
  if (spec) params.specialization = spec
  // No q, level, availableFrom, or availableTo query parameters.
}, [t])
```

Remove `namePlaceholder`, `levelPlaceholder`, `availableFrom`, and `availableTo` from both locale files if they have no other references.

- [x] **Step 2: Run the regression test to verify it passes**

Run: `node scripts/assistant-directory-search-filter-removal.test.mjs`

Expected: PASS with no assertion output.

- [x] **Step 3: Run the project typecheck**

Run: `npm run typecheck`

Expected: PASS with exit code 0.
