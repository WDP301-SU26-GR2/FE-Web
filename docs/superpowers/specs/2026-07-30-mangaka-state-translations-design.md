# Mangaka State Translation Design

## Goal

Prevent raw backend enum values from appearing in the Mangaka dashboard and
series UI. Every supported enum is shown through the active `mangaka` locale;
an unrecognised value is shown as a localised generic unknown-state label.

## Scope

Included UI surfaces:

- `features/mangaka/dashboard/mangaka-dashboard.tsx`: the studio-card
  `manuscriptStatus` label.
- `features/mangaka/series/my-series-page.tsx`: the list `SeriesStatus` badge.
- `features/mangaka/series/my-series-detail-page.tsx`: the series,
  proposal, and Name status labels.

The authoritative enum sources are the generated Swagger models and the role
guide:

- `SeriesStatus`: `DRAFT`, `IN_REVIEW`, `READY_TO_PITCH`, `PITCHED`,
  `SERIALIZED`, `HIATUS`, `COMPLETING`, `CANCELLING`, `COMPLETED`,
  `CANCELLED`, `REJECTED`, `ABANDONED`, `WITHDRAWN`.
- `ProposalStatus`: `DRAFT`, `PROPOSAL_REVIEW`, `PROPOSAL_REVISION`,
  `PROPOSAL_APPROVED`, `PITCHED`, `APPROVED`, `REJECTED`, `WITHDRAWN`.
- `NameStatus`: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `REVISION`, `APPROVED`.
- Dashboard `ManuscriptStatus`: `DRAFT`, `IN_PRODUCTION`, `EDITOR_REVIEW`,
  `EDITOR_REVISION`, `READY_FOR_PRINT`, `AWAITING_CO_OWNER_APPROVAL`,
  `PUBLISHED`.

No Assistant or other Mangaka pages are changed in this task.

## Design

Each affected feature owns a focused helper under its `lib/` directory:

- `features/mangaka/dashboard/lib/translate-manuscript-status.ts`
  translates dashboard `ManuscriptStatus` values.
- `features/mangaka/series/lib/translate-series-state.ts` exports separate
  translators for series, proposal, and Name statuses.

Each helper accepts the API value plus the i18next `t` function and maps only
documented enum members to existing `mangaka.json` keys. It must never return
the raw backend value. Missing, null, or future enum values return the shared
`state.unknown` key in the active locale.

The components retain their present status-colour metadata; only label
resolution moves to the helpers. This avoids changing lifecycle controls,
filtering, or visual status semantics.

## Localisation

Add the same root-level `state.unknown` key to both locale files:

- English: `Unknown status`
- Vietnamese: `Trạng thái chưa xác định`

Existing status keys stay where they are. The helpers reuse these keys rather
than duplicating status copy.

## Verification

Add a lightweight TypeScript test command using `node:test` with the `tsx`
runtime, then test each helper against a recognised enum and an unknown value.
The tests must demonstrate that recognised values use their expected i18n key
and that unknown/null values use `state.unknown`. Run the helper tests, then
run `npm run typecheck` and `npm run lint` before completion.

## Non-goals

- No generated API files are edited.
- No raw API values outside the three named UI surfaces are changed.
- Existing uncommitted publication-version removals and production-stage work
  remain untouched.
