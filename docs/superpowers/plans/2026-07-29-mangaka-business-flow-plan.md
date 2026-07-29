# Mangaka Business Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete audited Mangaka business flows for deadlines, publication versions, rankings, earnings/payments, contract artifacts, and reprint detail.

**Architecture:** Add focused Mangaka business slices and thin registered routes where a flow needs a discoverable destination. Reuse current contract, ranking, and reprint pages instead of duplicating their existing operations.

**Tech Stack:** React 19, React Router 7, TypeScript strict, Orval-generated API operations, Tailwind v4 semantic tokens, i18next.

## Global Constraints

- Implement only Mangaka-accessible API operations documented in the guide.
- Do not add Assistant features, annotations, task batch, dependencies, or commits.
- Read `res.data`, use shared API error mapping, use semantic tokens, and add both EN and VI keys.

---

### Task 1: Add deadline negotiation

**Files:**

- Create: `app/features/mangaka/deadlines/mangaka-deadlines-page.tsx`
- Create: `app/features/mangaka/deadlines/use-deadline-requests.ts`
- Create: `app/features/mangaka/deadlines/components/deadline-request-dialog.tsx`
- Create: `app/routes/mangaka/deadlines.tsx`
- Modify: `app/features/mangaka/index.ts`
- Modify: `app/routes.ts`
- Modify: `app/shared/components/dashboard-nav-config.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useDeadlineRequests(chapterId)` calls `deadlineControllerList`, `deadlineControllerGetOne`, `deadlineControllerCreate`, `deadlineControllerCounter`, `deadlineControllerAgree`, `deadlineControllerReject`, and `deadlineControllerWithdraw`.
- The page receives/selects a Mangaka-owned chapter and refreshes after every successful action.

- [x] Implement chapter selection from the existing series/chapter list and load only the selected chapter's deadline requests.
- [x] Implement create, counter, agree, reject, and withdraw actions with future-date and non-empty-reason validation where the API requires them.
- [x] Gate action buttons by `requestedBy`, `lastProposedBy`, and `DeadlineRequestStatus`; use confirmations for reject and withdraw.
- [x] Register `/dashboard/mangaka/deadlines`, add navigation and complete EN/VI copy.
- [x] Run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 2: Surface publication versions, board rankings, earnings, and payment records

**Files:**

- Create: `app/features/mangaka/publication-versions/publication-versions-panel.tsx`
- Create: `app/features/mangaka/earnings/earnings-panel.tsx`
- Create: `app/features/mangaka/earnings/use-mangaka-earnings.ts`
- Create: `app/features/mangaka/contracts/components/payment-records-panel.tsx`
- Modify: `app/features/mangaka/rankings/use-mangaka-rankings.ts`
- Modify: `app/features/mangaka/rankings/mangaka-rankings-page.tsx`
- Modify: `app/features/mangaka/dashboard/mangaka-dashboard.tsx`
- Modify: `app/features/mangaka/series/my-series-detail-page.tsx`
- Modify: `app/features/mangaka/contracts/mangaka-contract-pages.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- Publication panel uses `publicationControllerList({ seriesId })` and `publicationControllerGetOne({ id })`.
- Earnings panel uses `mangakaDashboardControllerEarnings()`.
- Payment panel uses `paymentControllerGetPaymentsByContract`, `paymentControllerGetPaymentsBySeries`, `paymentControllerGetPaymentsByUser`, and `paymentControllerGetPaymentById` only as read operations.
- Rankings adds `surveyControllerGetBoardRanking({ surveyPeriodId })` beside the existing series trend request.

- [x] Add a read-only publication-version panel on series detail with list, selected-detail, loading, empty, and retry states.
- [x] Add an earnings panel to the Mangaka dashboard using the API's zero-filled status/type aggregates and recent payments without inventing Assistant compensation.
- [x] Add payment-record list/detail views to the existing contract context, preserving the response's `data` list shape.
- [x] Add board-ranking selection and table states to the ranking page without replacing the existing per-series trend view.
- [x] Add EN/VI copy and run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 3: Complete contract artifacts and reprint child detail operations

**Files:**

- Modify: `app/features/mangaka/contracts/mangaka-contract-pages.tsx`
- Modify: `app/routes/mangaka/contract-detail.tsx`
- Modify: `app/routes/mangaka/reprints.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- Contract detail adds `contractControllerExportPdf`, `contractControllerGetContractVersions`, and `contractControllerGetContractVersionById` as read/download operations.
- Reprint detail adds `reprintRequestControllerGetChapters` and `reprintRequestControllerGetChapterById` before using the existing manuscript update action.

- [x] Add an accessible contract PDF download control that uses the API-provided signed URL and reports a mapped error if it cannot be generated.
- [x] Add version-history selection to contract detail and load the selected version lazily; distinguish no history from loading failure.
- [x] Add reprint chapter list/detail loading so manuscript revision is initiated from a verified `originalChapterId`, not an inferred embedded object.
- [x] Preserve existing Mangaka review and manuscript-update behavior, add EN/VI labels/errors, and run `npm run typecheck`, `npm run lint`, and `npm run prettier`.
