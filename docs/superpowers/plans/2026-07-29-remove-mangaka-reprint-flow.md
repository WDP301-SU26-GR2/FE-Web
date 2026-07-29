# Remove Mangaka Reprint Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unsupported reprint workflow from the Mangaka frontend without changing generated APIs or reprint behavior for other roles.

**Architecture:** Delete the two Mangaka route entry points and their feature component, then remove every Mangaka-only discovery path. Keep backend contracts and other-role consumers intact, and encode the product decision as an explicit exclusion in the Mangaka API audit.

**Tech Stack:** React Router 7, React 19, TypeScript 5.9, i18next, Node.js assertion scripts, ESLint, Prettier.

## Global Constraints

- Remove only the Mangaka reprint frontend flow.
- Do not edit Orval-generated files under `app/api/model` or `app/api/operations`.
- Do not modify Editor, Board, or Admin reprint routes, pages, deep-links, or locales.
- Preserve `finance.source.REPRINT` and shared notification/audit labels because historical payments and other roles still consume them.
- Add or update both EN and VI locale files together.
- Preserve unrelated changes in the dirty shared workspace.

---

### Task 1: Lock the removal contract with a failing regression check

**Files:**
- Create: `scripts/check-mangaka-reprint-removal.mjs`

**Interfaces:**
- Consumes: the route, navigation, notification routing, locale, and filesystem artifacts that form the Mangaka reprint public surface.
- Produces: a zero-exit regression command after the flow is removed while proving Editor and Board reprint routes remain.

- [x] **Step 1: Write the failing regression check**

Create a Node assertion script that reads `app/routes.ts`, `app/shared/components/dashboard-nav-config.tsx`, `app/shared/components/role-notifications-page.tsx`, `app/shared/config/document-titles.ts`, and both Mangaka locale JSON files. It must assert:

```js
assert.doesNotMatch(routes, /route\('reprints', 'routes\/mangaka\/reprints\.tsx'\)/)
assert.doesNotMatch(routes, /routes\/mangaka\/reprint-chapter-detail\.tsx/)
assert.doesNotMatch(nav, /\/dashboard\/mangaka\/reprints/)
assert.doesNotMatch(notifications, /return `\/dashboard\/mangaka\/reprints/)
assert.equal('reprints' in JSON.parse(en), false)
assert.equal('reprints' in JSON.parse(vi), false)
assert.equal(await exists('../app/routes/mangaka/reprints.tsx'), false)
assert.equal(await exists('../app/routes/mangaka/reprint-chapter-detail.tsx'), false)
assert.equal(await exists('../app/features/mangaka/reprints'), false)
assert.match(routes, /route\('operations\/reprints', 'routes\/editor\/operations-reprints\.tsx'\)/)
assert.match(routes, /route\('reprints', 'routes\/board\/reprints\.tsx'\)/)
```

- [x] **Step 2: Run the check and verify RED**

Run: `node scripts/check-mangaka-reprint-removal.mjs`

Expected: FAIL because the Mangaka route and public artifacts still exist.

### Task 2: Remove the Mangaka reprint public surface

**Files:**
- Delete: `app/routes/mangaka/reprints.tsx`
- Delete: `app/routes/mangaka/reprint-chapter-detail.tsx`
- Delete: `app/features/mangaka/reprints/index.ts`
- Delete: `app/features/mangaka/reprints/reprint-chapter-detail-page.tsx`
- Modify: `app/routes.ts`
- Modify: `app/features/mangaka/index.ts`
- Modify: `app/shared/components/dashboard-nav-config.tsx`
- Modify: `app/shared/components/role-notifications-page.tsx`
- Modify: `app/shared/config/document-titles.ts`

**Interfaces:**
- Consumes: the removal contract from Task 1.
- Produces: no registered or discoverable Mangaka reprint destination; Editor and Board paths remain intact.

- [x] **Step 1: Delete the two Mangaka routes and feature slice**

Delete only the four files listed above. Do not delete generated reprint API/model files or other-role reprint components.

- [x] **Step 2: Remove route registration and barrel export**

Remove these two Mangaka route entries:

```ts
route('reprints', 'routes/mangaka/reprints.tsx')
route('reprints/:id/chapters/:chapterId', 'routes/mangaka/reprint-chapter-detail.tsx')
```

Remove `ReprintChapterDetailPage` from `app/features/mangaka/index.ts`.

- [x] **Step 3: Remove discovery and deep-link paths**

Remove the Mangaka sidebar item, its now-unused `Printer` import if no other occurrence requires it, the Mangaka document-title matcher, and only this Mangaka notification branch:

```ts
if (prefix === 'REPRINT') return `/dashboard/mangaka/reprints?requestId=${id}`
```

Keep the Editor, Board, and Admin branches unchanged.

- [x] **Step 4: Run the regression check**

Run: `node scripts/check-mangaka-reprint-removal.mjs`

Expected: it may still fail on locale assertions until Task 3, but route/file/nav/deep-link assertions must pass.

### Task 3: Remove dedicated Mangaka translations and update audit policy

**Files:**
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`
- Modify: `app/locales/en/common.json`
- Modify: `app/locales/vi/common.json`
- Modify: `scripts/audit-mangaka-api-coverage.mjs`
- Modify: `scripts/check-mangaka-read-parity.mjs`

**Interfaces:**
- Consumes: removed Mangaka reprint surface from Task 2.
- Produces: valid locale parity and coverage/read-parity checks that encode the unsupported flow.

- [x] **Step 1: Remove dedicated locale keys**

Delete the top-level `reprints` object from both Mangaka locale files. Remove `common.nav.reprints` from EN and VI because no remaining navigation uses it. Keep `mangaka.finance.source.REPRINT` and the shared `common.contractShared.decision.types.REPRINT` label used by other-role decision UI. `REPRINT` is a `referenceType` prefix, not a `notificationsPage.type` enum value, so it has no notification-type locale key.

- [x] **Step 2: Encode explicit API exclusions**

Add all six reprint routes from the approved design to the `excluded` set in `scripts/audit-mangaka-api-coverage.mjs`.

- [x] **Step 3: Remove obsolete read-parity assertions**

Remove reads and assertions for deleted reprint route files and `locale.reprints`. Keep the payment endpoint and finance locale assertions unchanged.

- [x] **Step 4: Verify GREEN**

Run:

```powershell
node scripts/check-mangaka-reprint-removal.mjs
node scripts/check-mangaka-read-parity.mjs
node scripts/audit-mangaka-api-coverage.mjs
node scripts/check-i18n.cjs
```

Expected: all four commands exit `0`.

### Task 4: Review and project verification

**Files:**
- Review: all files changed by Tasks 1–3

**Interfaces:**
- Consumes: completed removal.
- Produces: review evidence and a precise verification report.

- [x] **Step 1: Review scope boundaries**

Confirm with `rg` that no `/dashboard/mangaka/reprints`, Mangaka reprint route import, `mangaka.reprints` key, or `app/features/mangaka/reprints` reference remains. Confirm Editor/Board reprint route and deep-link strings still exist.

- [x] **Step 2: Run formatting and lint checks**

Run:

```powershell
npx prettier --check app/routes.ts app/features/mangaka/index.ts app/shared/components/dashboard-nav-config.tsx app/shared/components/role-notifications-page.tsx app/shared/config/document-titles.ts app/locales/en/mangaka.json app/locales/vi/mangaka.json app/locales/en/common.json app/locales/vi/common.json scripts/audit-mangaka-api-coverage.mjs scripts/check-mangaka-read-parity.mjs scripts/check-mangaka-reprint-removal.mjs
npx eslint app/routes.ts app/features/mangaka/index.ts app/shared/components/dashboard-nav-config.tsx app/shared/components/role-notifications-page.tsx app/shared/config/document-titles.ts scripts/audit-mangaka-api-coverage.mjs scripts/check-mangaka-read-parity.mjs scripts/check-mangaka-reprint-removal.mjs
npm run lint
npm run typecheck
```

Expected: scoped checks and removal regressions pass. If whole-project lint or typecheck fails because of pre-existing unrelated files in the dirty workspace, report exact failing files and confirm whether any are in the changed scope.

- [x] **Step 3: Independent review**

Have a fresh reviewer verify spec compliance, role isolation, dead imports, i18n parity, and audit exclusions. Fix every Critical or Important finding and rerun the relevant commands.
