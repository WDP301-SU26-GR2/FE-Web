# Remove Proposal Franchise Relationship Design

## Goal

Remove the franchise-relationship branch from the Mangaka proposal-creation flow on the frontend.

## Scope

- The first wizard step renders only the basic proposal fields.
- The wizard holds no franchise state and applies no franchise-specific validation.
- The create-proposal request never includes `parentSeriesId` or `relationshipType`.
- Delete the wizard-only franchise field component and its unused proposal-creation locale keys in both English and Vietnamese.

## Non-goals

- Do not modify generated API models, API operations, Swagger, mocks, or backend behavior.
- Do not remove franchise information from existing-series detail views, consent flows, notifications, or other existing-series features.

## Design

`CreateProposalWizard` remains the owner of the four-step proposal form. It will remove the `FranchiseProposalFields` import, associated default/state, first-step render, validation branches, franchise-only API-error mapping, and conditional request-body spread. Its request body will contain only the standard proposal fields already collected by the wizard.

The deleted `FranchiseProposalFields` component has no remaining consumer. The `wizard.franchise` locale object and the four franchise-only errors under `wizard.errors` will be removed from both language files; all other franchise translations remain because they serve existing-series and consent flows.

## Verification

- Run `npm run typecheck`.
- Run `npm run lint`.
- Search the proposal wizard and wizard-step folder to confirm no import, state, validation, or payload construction references `FranchiseProposalFields`, `parentSeriesId`, `relationshipType`, or `isDerivative`.
