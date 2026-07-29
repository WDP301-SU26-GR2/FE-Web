# Studio Assignment Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the Assistant invite detail layout and expose Mangaka assignment task types from the detail API.

**Architecture:** Keep list endpoints as the initial lightweight view. Fetch detail data only after a card disclosure is opened; render it in a full-width second row so it cannot participate in the compact summary row.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, React Router 7, Orval API client, node:test.

## Global Constraints

- Use semantic Tailwind theme tokens only.
- Use generated functions from `~/api/operations/*` and read `res.data`.
- Keep EN and VI locale keys in sync.
- Do not modify generated API files.

---

### Task 1: Guard invite detail layout structure

**Files:**

- Create: `scripts/check-studio-detail-layout.mjs`
- Modify: `app/features/assistant/invites/assistant-invites-page.tsx`

- [x] Add a node:test assertion that the invite article remains column-oriented and the details panel is rendered below its summary row.
- [x] Run `node --test scripts/check-studio-detail-layout.mjs` and confirm it fails on the current `sm:flex-row` layout.
- [x] Wrap the invite summary in its own responsive row and render the detail panel after that row.
- [x] Re-run the node test and confirm it passes.

### Task 2: Hydrate Mangaka assignment detail on disclosure

**Files:**

- Create: `app/features/mangaka/studio/use-assignment-detail.ts`
- Create: `app/features/mangaka/studio/components/studio-assignment-card.tsx`
- Modify: `app/features/mangaka/assistants/components/assignment-card.tsx`
- Modify: `app/features/mangaka/studio/my-studio-page.tsx`
- Modify: `app/locales/{en,vi}/mangaka.json`

- [x] Add a node:test assertion that the Studio detail card invokes `studioControllerGetAssignment` only when expanded and passes `assignedTaskTypes` to the presentational card.
- [x] Run the test and confirm it fails before the wrapper exists.
- [x] Implement an abortable detail hook and a wrapper card that handles loading/error/empty states.
- [x] Accept detail task types as an explicit `AssignmentCard` prop rather than reading absent fields from the list DTO.
- [x] Re-run the test and confirm it passes.

### Task 3: Verify

- [x] Run `node --test scripts/check-studio-detail-layout.mjs`.
- [x] Run `npm.cmd run typecheck`.
- [x] Run `npm.cmd run lint`.
