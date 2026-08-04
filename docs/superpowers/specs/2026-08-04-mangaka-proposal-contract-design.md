# Mangaka Proposal and Contract Flow Design

## Purpose

Align the Mangaka UI with `FE-Web-Guide/03-mangaka.md` for the series-proposal lifecycle and the two-phase contract signing lifecycle. Keep backend/API enum and endpoint names unchanged; change only user-facing terminology.

## Scope

- All Mangaka-facing labels, descriptions, empty states, buttons, and feedback that describe `proposal` use **Hồ sơ seri** in Vietnamese and **Series dossier** in English.
- All Mangaka-facing labels that describe the `NAME` artefact use **Bản phác khung truyện** in Vietnamese and **Storyboard** in English.
- API models, Orval operations, URL parameters, enum literals (`PROPOSAL`, `NAME`), and persisted data remain unchanged.
- The work covers the proposal/series pages and wizard, revision feedback associated with the proposal/storyboard, the contract list/detail/version views, contract actions, and their Mangaka locale keys.
- Chapter storyboard production is not redesigned. Its existing `NAME` identifiers remain internal API identifiers while its visible terminology follows the new display wording.

## Proposal and series flow

The UI represents two backend-managed state machines rather than one flattened status:

| Domain | State machine | Mangaka action rules |
| --- | --- | --- |
| Series | `DRAFT → IN_REVIEW → READY_TO_PITCH → PITCHED → SERIALIZED`, with documented withdrawal/reopen branches | The status is displayed but never mutated directly by the UI. |
| Series dossier | `DRAFT → PROPOSAL_REVIEW ⇄ PROPOSAL_REVISION → PROPOSAL_APPROVED` | Edit only in `DRAFT` or `PROPOSAL_REVISION`; resubmit only in `PROPOSAL_REVISION`. |

Creating a dossier calls `POST /series/proposals` and renders the returned flat `SeriesRes` with the embedded `proposal`. The embedded `proposal.storyboardPages` are the sample storyboard pages; the UI must not treat them as a second proposal or call removed `/series/:id/names/*` routes.

Submitting calls `POST /series/:id/submit` only for a `DRAFT` series. Resubmission calls `POST /series/:id/proposal/resubmit` only for `PROPOSAL_REVISION`. Draft deletion is only available to the owner while the series is `DRAFT`; withdrawal follows the documented series transitions; reopen is available only for `ABANDONED` and `WITHDRAWN` and returns the series to `DRAFT`.

The client does not invent additional transition gates. It renders known eligibility, submits through route actions, and presents the backend envelope/error code as a translated, safe message. A successful action refreshes route data so the visible series and dossier states are current.

## Contract flow

Contract signing is the guide's two-phase flow:

1. Editor and Board complete Phase 1.
2. Only when `ContractStatus === AWAITING_MANGAKA` can the Mangaka read the detail, request/reuse an OTP, accept and sign via `POST /contracts/:id/sign-mangaka`, or reject with a required reason via `POST /contracts/:id/reject`.
3. Signing results in `FULLY_EXECUTED`, except a replacement full-buyout transfer contract can move to `ACTIVATION_PENDING`. Rejecting results in terminal `REJECTED_BY_MANGAKA`; it is not a negotiation loop and the Editor must redraft a new contract.

The list/detail views show current status, ownership/value/term data, representative signing progress, saved versions, payment conditions, and amendments according to their read-only/action rules. A PDF is offered only for documented exportable executed statuses. Payment conditions are informative for Mangaka and must not block OTP delivery or signing.

Amendments stay separate from the base-contract decision: Mangaka can sign or reject a `PENDING_SIGNATURES` amendment only for a `REVENUE_SHARE` contract. A `FULL_BUYOUT` amendment never exposes Mangaka signing controls. Successful contract or amendment actions revalidate the route data and close/reset transient forms where applicable.

## Architecture and boundaries

- Route entries remain thin. They load data and own mutations through React Router `clientLoader`/`clientAction` using generated operations from `~/api/operations/...`.
- View components render data and submit forms via `useFetcher`; they do not call proposal/contract operations during rendering or event handlers.
- Move the proposal-create mutation currently located in the wizard component into its Mangaka route action. File uploads remain the existing shared R2 upload flow; the route action receives only already-uploaded object keys and calls the generated series operation.
- Place any display/action eligibility predicates in focused, testable Mangaka slice-local helpers. Do not import between roles or make `shared/` depend on a feature.
- Add locale keys together in `app/locales/en/mangaka.json` and `app/locales/vi/mangaka.json`. Use semantic theme tokens and existing UI primitives.

## Error handling and refresh behavior

- Map `Error.PascalCase` errors to human-readable Mangaka locale messages; never expose raw backend codes.
- Preserve field-level errors and OTP expiry/invalid-code feedback from the response envelope.
- Do not assume that status passed from a previously loaded page is still valid. The backend remains authoritative and a failed 403/404/409/410/422 response is shown as an actionable error.
- Revalidate the affected route after a successful mutation to prevent stale controls, stale status badges, and repeat submissions.

## Verification

- Add focused tests for terminology/state translation and the proposal/contract action-eligibility predicates, including `AWAITING_MANGAKA`, `REJECTED_BY_MANGAKA`, `PROPOSAL_REVISION`, and terminal/non-actionable cases.
- Verify route actions with the existing project test approach where practical, then run `npm run typecheck`, `npm run lint`, and `npm run prettier` before completion.

## Out of scope

- Changing OpenAPI-generated code, backend enum values, backend endpoints, or data migrations.
- Reworking editor, board, assistant, transfer, or payment workflows beyond the Mangaka screens that display these shared concepts.
