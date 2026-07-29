# Mangaka Studio Detail Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Mangaka Studio “assigned task types” disclosure inside each assignment card and make the same control reliably open and close its API-backed details.

**Architecture:** `StudioAssignmentCard` owns the detail request state and supplies both data and toggle state to the existing presentational `AssignmentCard`. `AssignmentCard` renders the disclosure control in its own footer beside the assignment actions, eliminating the external sibling button that currently appears between the card and pagination.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Orval-generated API client, node:test.

## Global Constraints

- Use generated `studioControllerGetAssignment` and read the envelope payload through `res.data`.
- Keep a single request per expanded card, with `AbortController` cleanup on unmount.
- Use semantic theme tokens and the `mangaka` locale namespace.
- Do not edit generated Orval files.
- Preserve the existing terminate, review, and assign-task actions.

---

### Task 1: Write a structural regression test for the in-card disclosure

**Files:**

- Modify: `scripts/check-studio-detail-layout.mjs`

**Consumes:** `AssignmentCard` and `StudioAssignmentCard` source files.

**Produces:** A node:test check that fails if the detail toggle is rendered as a sibling outside `AssignmentCard`.

- [x] **Step 1: Add a failing source-structure test**

```js
const assignmentCardSource = await readFile('app/features/mangaka/assistants/components/assignment-card.tsx', 'utf8')
const studioCardSource = await readFile('app/features/mangaka/studio/components/studio-assignment-card.tsx', 'utf8')

test('Mangaka Studio keeps its assignment detail control inside the card footer', () => {
  assert.match(assignmentCardSource, /onDetailsClick\?: \(\) => void/)
  assert.match(assignmentCardSource, /aria-expanded=\{isDetailsOpen\}/)
  assert.match(studioCardSource, /onDetailsClick=\{\(\) => setIsExpanded/)
  assert.doesNotMatch(studioCardSource, /<\/AssignmentCard>\s*<button/s)
})
```

- [x] **Step 2: Run the test and verify the expected failure**

Run: `node --test scripts/check-studio-detail-layout.mjs`

Expected: `Mangaka Studio keeps its assignment detail control inside the card footer` fails because `AssignmentCard` lacks `onDetailsClick` and `StudioAssignmentCard` contains a sibling `<button>`.

### Task 2: Render the detail disclosure in `AssignmentCard`

**Files:**

- Modify: `app/features/mangaka/assistants/components/assignment-card.tsx`

**Consumes:** Existing `taskTypes`, `onAssignClick`, `onTerminateClick`, and `onReviewClick` props.

**Produces:** Optional props `onDetailsClick`, `isDetailsOpen`, `isDetailsLoading`, and `detailError`, with the disclosure button rendered inside the footer.

- [x] **Step 1: Extend the props interface**

```ts
onDetailsClick?: () => void
isDetailsOpen?: boolean
isDetailsLoading?: boolean
detailError?: string | null
```

- [x] **Step 2: Add one footer button before destructive lifecycle actions**

```tsx
{
  onDetailsClick && (
    <button type='button' onClick={onDetailsClick} aria-expanded={isDetailsOpen}>
      {isDetailsLoading ? (
        <Loader2 className='animate-spin' />
      ) : (
        <ChevronDown className={cn(isDetailsOpen && 'rotate-180')} />
      )}
      {t(isDetailsOpen ? 'myStudio.details.hide' : 'myStudio.details.show')}
    </button>
  )
}
```

- [x] **Step 3: Render the API error inside the card directly below task types**

```tsx
{
  detailError && <p className='text-xs text-destructive'>{detailError}</p>
}
```

### Task 3: Keep fetching state in `StudioAssignmentCard`

**Files:**

- Modify: `app/features/mangaka/studio/components/studio-assignment-card.tsx`

**Consumes:** `useMangakaAssignmentDetail(assignment.id, isExpanded)`.

**Produces:** A wrapper that passes task types and disclosure state into `AssignmentCard`; it renders no standalone button.

- [x] **Step 1: Replace the sibling button/error block with props on `AssignmentCard`**

```tsx
<AssignmentCard
  assignment={assignment}
  taskTypes={detail.assignment?.assignedTaskTypes}
  onDetailsClick={() => setIsExpanded((value) => !value)}
  isDetailsOpen={isExpanded}
  isDetailsLoading={detail.isLoading}
  detailError={isExpanded ? detail.error : null}
  onAssignClick={onAssignClick}
  onTerminateClick={onTerminateClick}
  onReviewClick={onReviewClick}
/>
```

- [x] **Step 2: Run the regression test and verify it passes**

Run: `node --test scripts/check-studio-detail-layout.mjs`

Expected: all tests pass, including the in-card disclosure test.

### Task 4: Verify the focused fix

**Files:**

- Verify: `app/features/mangaka/assistants/components/assignment-card.tsx`
- Verify: `app/features/mangaka/studio/components/studio-assignment-card.tsx`
- Verify: `scripts/check-studio-detail-layout.mjs`

- [x] **Step 1: Run targeted formatting verification**

Run: `node_modules\\.bin\\prettier.cmd --check app/features/mangaka/assistants/components/assignment-card.tsx app/features/mangaka/studio/components/studio-assignment-card.tsx scripts/check-studio-detail-layout.mjs`

Expected: `All matched files use Prettier code style!`

- [x] **Step 2: Run project checks**

Run: `npm.cmd run typecheck`

Expected: `react-router typegen && tsc` exits with code 0.

Run: `npm.cmd run lint`

Expected: `eslint .` exits with code 0.
