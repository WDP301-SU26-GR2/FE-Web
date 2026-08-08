# Remove Mangaka Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Mangaka ranking user experience while preserving ranking functionality for other roles and shared generated API contracts.

**Architecture:** Keep the generated survey/dashboard API layer intact, but remove Mangaka-only composition points: route registration, feature exports/files, navigation, dashboard presentation/state, and notification deep-links. Remove only translation keys that become unused after those boundaries are removed.

**Tech Stack:** React Router 7 route config, React/TypeScript, i18next JSON resources, Node built-in test runner, React Router type generation.

## Global Constraints

- Every color remains token-driven; this change adds no styling.
- `shared/` must not import `features/`.
- Generated `app/api/model/` and `app/api/operations/` files are not edited.
- English and Vietnamese locale files remain mirrored.
- Do not commit changes unless explicitly requested by the user.

---

### Task 1: Protect the route boundary with a failing test

**Files:**

- Create: `app/features/mangaka/mangaka-ranking-removal.test.mjs`
- Modify: `package.json` test script to include the new test

**Interfaces:**

- Consumes the route tree exported by `app/routes.ts`.
- Produces a regression check that the Mangaka route list excludes `dashboard/mangaka/rankings` while the Board route remains available.

- [ ] **Step 1: Write the failing test**

Create a recursive route-tree flattener in the test and assert these literal paths:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import routes from '../../routes.ts'

function flattenRoutes(nodes, parentPath = '') {
  return nodes.flatMap((node) => {
    const path = [parentPath, node.path].filter(Boolean).join('/')
    const current = node.path ? [path] : []
    return [...current, ...(node.children ? flattenRoutes(node.children, path) : [])]
  })
}

test('Mangaka no longer exposes rankings while Board still does', () => {
  const paths = flattenRoutes(routes)

  assert.equal(paths.includes('dashboard/mangaka/rankings'), false)
  assert.equal(paths.includes('dashboard/board/rankings'), true)
})
```

- [ ] **Step 2: Run the focused test and verify it fails for the intended reason**

Run: `node --experimental-strip-types --test app/features/mangaka/mangaka-ranking-removal.test.mjs`

Expected: FAIL because the current route tree still contains `dashboard/mangaka/rankings`; the Board assertion must not be the failing assertion.

### Task 2: Remove Mangaka ranking composition and dead links

**Files:**

- Delete: `app/routes/mangaka/rankings.tsx`
- Delete: `app/features/mangaka/rankings/index.ts`
- Delete: `app/features/mangaka/rankings/use-mangaka-rankings.ts`
- Delete: `app/features/mangaka/rankings/mangaka-rankings-page.tsx`
- Delete: `app/features/mangaka/rankings/components/series-trend-chart.tsx`
- Delete: `app/features/mangaka/rankings/components/ranking-table.tsx`
- Delete: `app/features/mangaka/rankings/components/board-ranking-table.tsx`
- Modify: `app/routes.ts` to remove only the Mangaka `rankings` route
- Modify: `app/features/mangaka/index.ts` to remove ranking exports
- Modify: `app/shared/components/dashboard-nav-config.tsx` to remove the Mangaka ranking nav item and unused icon import
- Modify: `app/features/mangaka/dashboard/mangaka-dashboard.tsx` to remove the ranking card and ranking-only imports/helper
- Modify: `app/features/mangaka/dashboard/use-mangaka-dashboard.ts` to stop exposing dashboard rankings
- Modify: `app/features/mangaka/notifications/mangaka-notifications-page.tsx` to stop returning a removed ranking URL
- Modify: `app/shared/components/notification-bell.tsx` to stop returning a removed Mangaka ranking URL
- Modify: `app/locales/en/mangaka.json` and `app/locales/vi/mangaka.json` to remove only unused Mangaka ranking/navigation strings
- Modify: `app/locales/en/common.json` and `app/locales/vi/common.json` to remove the now-unused `nav.ranking` label while keeping Finance payment-condition ranking text

**Interfaces:**

- The Mangaka dashboard continues to expose studio, unread notification, and revision-request data.
- Other role routes and generated API contracts remain unchanged.

- [ ] **Step 1: Remove the Mangaka route and public feature exports**

Delete the route entry file and ranking feature files, remove the Mangaka route registration, and remove the three ranking exports/types from the Mangaka barrel. Leave the Board route registration untouched.

- [ ] **Step 2: Remove navigation, dashboard UI/state, and notification deep-linking**

Remove `TrendingUp` and the Mangaka nav item. Remove the dashboard ranking helper/card and `rankings` field from `MangakaDashboardData`; keep the API response model untouched. Make `SURVEY_*` and `RANKING_*` notifications fall through to the existing non-navigable result instead of returning a removed URL in both notification surfaces.

- [ ] **Step 3: Remove only now-unused locale keys in both languages**

Remove `routeMeta.rankings`, `dashboard.weeklyRankings`, `dashboard.viewAnalyticsReport`, `dashboard.noRankings`, `notifications.item.openRanking`, and `nav.ranking`. Delete the top-level `rankings` object in `mangaka.json`. Retain `finance.type.RANKING_MILESTONE` and `finance.typeDescription.RANKING_MILESTONE`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test app/features/mangaka/mangaka-ranking-removal.test.mjs`

Expected: PASS, with no Mangaka rankings route and the Board rankings route still present.

### Task 3: Verify the complete change

**Files:**

- Modify: `package.json` only if the test script was not updated in Task 1

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

Expected: PASS with no missing route/feature export or locale-related TypeScript errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS with no unused imports or references to removed files.

- [ ] **Step 4: Check the final Mangaka references**

Run: `rg -n "dashboard/mangaka/rankings|features/mangaka/rankings|routeMeta\.rankings|nav\.ranking|openRanking|weeklyRankings|noRankings|viewAnalyticsReport" app --glob '!api/**' --glob '!*.test.mjs'`

Expected: no output. Board/Public/Editor ranking references may remain elsewhere and are outside this check.
