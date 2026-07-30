# Remove Proposal Franchise Relationship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the franchise-relationship UI and request data from proposal creation without changing backend contracts or other franchise features.

**Architecture:** Keep `CreateProposalWizard` as the only proposal-form state owner and reduce it to the standard four proposal inputs. Delete the now-unreachable wizard field component, then remove only the translation keys it consumed from both locales.

**Tech Stack:** React 19, TypeScript, React Router 7, react-i18next, ESLint.

## Global Constraints

- Frontend-only: do not change `swagger.json`, generated `app/api/model`, generated `app/api/operations`, or backend-facing API contracts.
- Preserve all franchise/consent functionality outside proposal creation.
- Maintain matching English and Vietnamese locale keys.
- Use semantic Tailwind tokens and existing project conventions.

---

### Task 1: Remove proposal wizard franchise state and request fields

**Files:**
- Modify: `app/features/mangaka/series/components/create-proposal-wizard.tsx`
- Delete: `app/features/mangaka/series/components/wizard-steps/franchise-proposal-fields.tsx`

**Interfaces:**
- Consumes: `CreateProposalBodyDto` from `~/api/model/series`.
- Produces: `CreateProposalWizard` submits a `CreateProposalBodyDto` without `parentSeriesId` and `relationshipType`.

- [ ] **Step 1: Define the regression assertion**

The project has no component-test harness. Use a focused static regression assertion that must fail before implementation:

```powershell
rg -n 'FranchiseProposalFields|franchiseData|isDerivative|parentSeriesId|relationshipType' app/features/mangaka/series/components/create-proposal-wizard.tsx
```

Expected: matches for the existing franchise import, state, validation, render, and payload branch.

- [ ] **Step 2: Verify the assertion exposes the existing behavior**

Run the command in Step 1 and confirm it exits with code `0` and lists the franchise references in `create-proposal-wizard.tsx`.

- [ ] **Step 3: Apply the minimal implementation**

In `create-proposal-wizard.tsx`:

```tsx
// Keep the first step limited to the standard proposal fields.
<BasicInfoStep form={formData} onChange={updateForm} />

// Leave the request body with only the existing standard proposal fields.
const body: CreateProposalBodyDto = {
  title: formData.seriesTitle.trim(),
  // existing standard fields only
}
```

Remove the `FranchiseProposalFields` import, `FranchiseProposalValue` type import, default franchise form, franchise state, all franchise validation branches, the `Error.ParentSeriesNotFound` branch, the conditional request-body spread, and the franchise component render. Delete `franchise-proposal-fields.tsx`.

- [ ] **Step 4: Verify the regression assertion passes**

Run:

```powershell
rg -n 'FranchiseProposalFields|franchiseData|isDerivative|parentSeriesId|relationshipType' app/features/mangaka/series/components/create-proposal-wizard.tsx
```

Expected: exit code `1` with no output.

### Task 2: Remove wizard-only translation strings

**Files:**
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**
- Consumes: `mangaka` i18n namespace.
- Produces: Both language files omit the now-unused `wizard.franchise` object and four `wizard.errors` entries.

- [ ] **Step 1: Define the regression assertion**

Run:

```powershell
rg -n '"franchise"|parentSeriesRequired|relationshipTypeRequired|franchisePairRequired|parentSeriesNotFound' app/locales/en/mangaka.json app/locales/vi/mangaka.json
```

Expected: the output includes the wizard-local `franchise` object and four wizard error keys, alongside unrelated franchise strings that must remain.

- [ ] **Step 2: Verify the assertion exposes the existing keys**

Confirm the command from Step 1 exits with code `0` and contains matches near the `wizard` object.

- [ ] **Step 3: Apply the minimal implementation**

Delete exactly these keys from both files:

```json
"wizard": {
  "franchise": { "...": "..." },
  "errors": {
    "parentSeriesRequired": "...",
    "relationshipTypeRequired": "...",
    "franchisePairRequired": "...",
    "parentSeriesNotFound": "..."
  }
}
```

Do not alter other `franchise` or consent strings outside `wizard`.

- [ ] **Step 4: Verify locale consistency**

Run:

```powershell
node -e "for (const file of ['app/locales/en/mangaka.json','app/locales/vi/mangaka.json']) JSON.parse(require('node:fs').readFileSync(file, 'utf8'));"
```

Expected: exit code `0`, confirming valid JSON in both locale files.

### Task 3: Verify the frontend change

**Files:**
- Verify: `app/features/mangaka/series/components/create-proposal-wizard.tsx`
- Verify: `app/locales/en/mangaka.json`
- Verify: `app/locales/vi/mangaka.json`

**Interfaces:**
- Consumes: Project TypeScript and ESLint configuration.
- Produces: Verified frontend flow with no proposal-creation franchise references.

- [ ] **Step 1: Check that the deleted component has no consumer**

Run:

```powershell
rg -n 'FranchiseProposalFields|franchise-proposal-fields' app
```

Expected: exit code `1` with no output.

- [ ] **Step 2: Run the type check**

Run:

```powershell
npm run typecheck
```

Expected: exit code `0`.

- [ ] **Step 3: Run the linter**

Run:

```powershell
npm run lint
```

Expected: exit code `0`.
