# Transfer Public Series Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent HTTP 422 on the Mangaka transfer page while loading the complete public-series catalog.

**Architecture:** Add a transfer-slice helper that owns the public-series pagination contract. The route loader consumes the helper and keeps its existing eligibility filter.

**Tech Stack:** TypeScript 5.9, React Router 7, Orval fetch client, Node test runner.

## Global Constraints

- Every `/public/series` request uses `limit <= 50`.
- Read payloads from `response.data`.
- Do not modify generated API files.
- Do not change transfer eligibility or action behavior.
- Do not create a git commit.

---

### Task 1: Paginate the transfer series catalog

**Files:**

- Create: `app/features/mangaka/transfers/load-public-series-catalog.ts`
- Create: `scripts/mangaka-transfer-public-series.test.mjs`
- Modify: `app/routes/mangaka/transfers.tsx`

**Interfaces:**

- Produces: `loadPublicSeriesCatalog(loadPage?)`, resolving to `PublicSeriesListResDtoOutputItemsItem[]`.
- Consumes: Orval `publicControllerListSeries({ limit, offset })`.

- [x] **Step 1: Write the failing test**

  Test a 101-item catalog and assert that the helper returns all 101 items while the supplied page loader receives exactly `{limit: 50, offset: 0}`, `{limit: 50, offset: 50}`, and `{limit: 50, offset: 100}`.

- [x] **Step 2: Run the test and verify RED**

  Run: `node --experimental-strip-types scripts/mangaka-transfer-public-series.test.mjs`

  Expected: FAIL because the helper module does not exist.

- [x] **Step 3: Implement the minimal helper and wire the loader**

  Fetch page zero, derive remaining offsets from `response.data.total`, fetch remaining pages, flatten `response.data.items`, and replace the route's direct `limit: 100` request.

- [x] **Step 4: Run verification**

  Run the new test, scoped ESLint, scoped Prettier, and the Mangaka API coverage checker.
