# Mangaka Production, Task, and Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audited Mangaka production, task, and studio API gaps while removing unused Assistant annotation support.

**Architecture:** Extend the existing Mangaka publication, studio, assistants, and invites slices. Keep data mutations co-located with their owning flow, revalidate affected lists after every successful mutation, and do not implement task batch or any new Assistant flow.

**Tech Stack:** React 19, React Router 7, TypeScript strict, Orval-generated API operations, Tailwind v4 semantic tokens, i18next.

## Global Constraints

- Do not modify Assistant task, invite, assignment, profile, dashboard, notification, or chapter-page flows except removal of annotation support.
- Do not call or expose `taskControllerCreateTaskBatch`.
- Do not call or expose any annotation operation.
- Use `~/api/operations/<tag>/<tag>`, read `res.data`, map errors through the shared extractor, and add both EN and VI strings.
- Do not add dependencies or commit changes without explicit user approval.

---

### Task 1: Remove unused annotation support from the Assistant task workspace

**Files:**

- Modify: `app/features/assistant/tasks/use-assistant-task-workspace.ts`
- Modify: `app/features/assistant/tasks/components/task-workspace-dialog.tsx`

**Interfaces:**

- Produces `AssistantTaskWorkspace` without an `annotations` field.
- Retains `task`, `revisions`, `isLoading`, `error`, and `refresh` behavior.

- [x] Remove the `annotationControllerList` import, annotation DTO import, annotation state, and both annotation requests from `useAssistantTaskWorkspace`.
- [x] Make the workspace load only `taskControllerGetTask` and `revisionControllerList({ targetType: 'TASK', targetId: taskId, limit: 100 })`; retain abort handling and normalized task arrays.
- [x] Remove the annotations section, `MessageSquareText` import, and `workspace.annotations` access from `TaskWorkspaceDialog`.
- [x] Verify `rg -n "annotationController|workspace\.annotations" app/features/assistant` returns no matches.
- [x] Run `npm run typecheck` and `npm run lint`; resolve every error introduced by this task.

### Task 2: Add custom production-stage management and AI-job history

**Files:**

- Create: `app/features/mangaka/publication/hooks/use-production-stage-management.ts`
- Create: `app/features/mangaka/publication/components/production-stage-management-dialog.tsx`
- Modify: `app/features/mangaka/publication/components/production-stage-panel.tsx`
- Modify: `app/features/mangaka/studio/hooks/use-page-segment.ts`
- Modify: `app/features/mangaka/studio/components/page-region-popup.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useProductionStageManagement(chapterId, onChanged)` exposes `add`, `update`, `remove`, `isMutating`.
- It calls `productionStageControllerAdd`, `productionStageControllerPatch`, and `productionStageControllerRemove` only with the chapter and stage IDs supplied by the selected stage.
- `usePageSegment(pageId)` exposes the page's `AiJobListResDtoOutputItemsItem[]` in addition to segment/apply/poll state.

- [x] Implement `useProductionStageManagement` with `createStageBodyDto`, `updateProductionStageBodyDto`, toast-backed mapped errors, and a single `onChanged()` call after success.
- [x] Add an accessible dialog that validates a non-empty stage name before create/update and requires an explicit confirmation before removing a locked custom stage.
- [x] Wire the dialog into `ProductionStagePanel`; only expose create, edit, and delete actions when the API state allows the documented operation.
- [x] Extend `usePageSegment` to call `aiControllerListJobs({ id: pageId }, { type: 'SEGMENT' })`, refresh history when a job is queued/applied, and preserve existing polling for a selected job.
- [x] Render AI-job history in `PageRegionPopup`: status, created time, error for `FAILED`, and an Apply action only for successful unapplied jobs.
- [x] Add matching EN and VI keys for stage management and AI history; use semantic color classes only.
- [x] Run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 3: Complete non-batch Mangaka task operations

**Files:**

- Create: `app/features/mangaka/assistants/components/task-edit-dialog.tsx`
- Create: `app/features/mangaka/assistants/components/task-reassign-dialog.tsx`
- Modify: `app/features/mangaka/assistants/use-mangaka-tasks.ts`
- Modify: `app/features/mangaka/assistants/components/task-board.tsx`
- Modify: `app/features/mangaka/studio/components/studio-tasks-tab.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useMangakaTasks` adds `updateTask(id, { assetIds?, description?, deadline?, priority? })`, `reassignTask(id, assistantId)`, and `approveTaskGroup(groupId)`.
- The implementation calls `taskControllerUpdateTask`, `taskControllerReassignTask`, and `taskControllerApproveTaskGroup`; it never imports or calls the batch operation.

- [x] Add mapped-error mutation methods to `useMangakaTasks` and return a discriminated result `{ success: true } | { success: false; error: string }` for UI dialogs.
- [x] Add a task-edit dialog that preserves omitted fields, permits description editing only while status is `ASSIGNED`, and sends `assetIds: []` only after the user explicitly removes every attachment.
- [x] Add a reassign dialog limited to active assignments compatible with the task's stage/task type; require confirmation because the prior assignee loses access.
- [x] Add group approval only when `groupId` is present; show the API result's approved count and skipped IDs rather than reporting every item as approved.
- [x] Revalidate the board and studio-task list after update, reassign, or group approval.
- [x] Add both-language labels, validation text, confirmation copy, and error fallbacks.
- [x] Run `npm run typecheck`, `npm run lint`, and `npm run prettier`.

### Task 4: Complete studio invitation controls

**Files:**

- Create: `app/features/mangaka/invites/use-mangaka-invites.ts`
- Create: `app/features/mangaka/invites/components/pending-invites-panel.tsx`
- Modify: `app/features/mangaka/assistants/assistant-directory-page.tsx`
- Modify: `app/locales/en/mangaka.json`
- Modify: `app/locales/vi/mangaka.json`

**Interfaces:**

- `useMangakaInvites` lists pending outgoing invites and exposes `cancelInvite(id)` through `studioControllerCancelInvite`.
- The panel refreshes after cancellation and never changes Assistant-side invite behavior.

- [x] Implement paginated pending-invite loading with `studioControllerListInvites({ status: 'PENDING', limit: 20, offset })`.
- [x] Render the panel from the Assistant directory with loading, empty, error/retry, and cancel-confirmation states.
- [x] Cancel only after confirmation; on success remove/reload the affected invite and preserve the directory search/filter state.
- [x] Add EN and VI messages and run `npm run typecheck`, `npm run lint`, and `npm run prettier`.
