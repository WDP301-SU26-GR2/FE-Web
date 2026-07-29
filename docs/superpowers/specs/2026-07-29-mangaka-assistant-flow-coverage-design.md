# Mangaka and Assistant flow coverage design

## Objective

Audit the current web client against `FE-Web-Guide` and complete only the missing or incomplete business flows for the Mangaka role. Preserve completed Assistant flows and follow the project feature-sliced architecture, Orval API client, semantic theme tokens, and dual-language i18n rules.

## Source of truth and audit method

`FE-Web-Guide/03-mangaka.md` and `FE-Web-Guide/04-assistant.md` are the functional source of truth. Every documented route is classified as one of:

- **End-to-end:** UI, permitted action, state-specific feedback, and refresh are present.
- **API-only:** the Orval operation exists but is not usable through the role UI.
- **Incomplete:** UI exists but misses a required mutation, permitted state, error path, or revalidation.
- **Excluded:** intentionally not part of this implementation.

The audit report drives implementation order. An operation is not implemented merely because it exists in Swagger; it must be relevant to the Mangaka role and absent or incomplete in the client.

## Scope

### Included

The implementation focuses on verified Mangaka gaps, initially expected to include:

- Production and studio operations: custom production-stage management, AI-job history, task group review, task edit/reassign, invite cancellation, and studio overview when the audit confirms no end-to-end UI exists.
- Series and chapter lifecycle: series metadata, franchise consent, completion proposal, proposal-name detail/append, and draft chapter edit/delete where missing.
- Business operations: deadline negotiation, publication-version viewing, Mangaka earnings and payment records, ranking-board view, contract document/version access, and reprint detail operations where no complete UI is present.

Each item remains subject to the route-to-UI audit before code is written. State-machine permissions from the guide control visibility and action availability.

### Explicitly excluded

- All completed Assistant flows: task workspace, invite, assignment, profile, dashboard, notification, and the Assistant chapter-page route. These are neither refactored nor extended in this work.
- `POST /tasks/batch` and its UI.
- The annotation feature group. Existing annotation API calls and UI presentation are removed from the Assistant workspace; no annotation creation, read, resolution, or deletion UI is added.
- Any feature not documented for Mangaka or not required to close an audited gap.

## Architecture

- Keep route modules thin. New initial reads use route loaders; mutations use route actions and `useFetcher` so feature components do not issue API calls during rendering.
- Place role-specific UI and state in the owning Mangaka slice. Shared primitives remain in `shared/` and never import features.
- Use only Orval-generated operations, unwrap the `data` payload, map API errors to i18n text, and revalidate after successful mutation.
- Use the R2 upload helper for uploads and signed task-file URLs only where the task flow allows them.
- Add translation keys to both `app/locales/en/mangaka.json` and `app/locales/vi/mangaka.json`; use semantic theme tokens and accessible controls.

## UX and state handling

- Render only actions allowed by the documented state machine; backend errors remain the authority for races and permissions.
- Every async panel has loading, empty, retryable error, and disabled-mutation states.
- Confirm destructive actions such as deleting a draft chapter, removing a custom stage, cancelling an invite, or withdrawing a deadline request.
- Deadline and task actions display the current state and next consequence before confirmation.
- Removing annotation support removes its feedback panel and associated loading/error work from the Assistant task workspace without altering the remaining task lifecycle.

## Delivery sequence

1. Finish the coverage matrix and lock the verified Mangaka gaps.
2. Implement production/task/studio gaps, excluding task batch and annotation.
3. Implement series/chapter lifecycle gaps.
4. Implement contracts, payments, transfers, reprints, deadlines, rankings, publication versions, and earnings gaps.
5. For every delivery slice: review by an independent subagent, run typecheck, lint, and formatting checks, then resolve findings.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run prettier`
- Manual review of loader/action routes, dual-language keys, semantic colors, destructive-action confirmations, and documented state transitions.

No test framework is currently configured, so no dependency is introduced without separate approval.
