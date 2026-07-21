import { useCallback, useMemo, useState } from 'react'

import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { CreateTaskBodyDto, CreateTaskBodyDtoTaskType, CreateTaskGroupBodyDto } from '~/api/model/task'
import type { UseTaskComposerDataOptions } from './use-task-composer-data'
import { useAssignTask } from './use-assign-task'
import type { UseAssignTaskResult } from './use-assign-task'

export type ComposerStep = 'context' | 'work' | 'confirm'

/**
 * State for the 3-step "Assign task" composer.
 *
 * Important BE contract (FE-API-Guide-v3.md §6):
 *  - `assistantId` MUST be the **userId** of the Assistant (ObjectId of `User`),
 *    NOT the id of `StudioAssignment`. The two ids are different.
 *  - `assignmentId` is the id of the active `StudioAssignment` — kept here only
 *    to look up the `assignedTaskTypes[]` whitelist and to validate that the
 *    chosen assistant is currently hired for the page's series.
 */
export interface AssignTaskFormState {
  step: ComposerStep
  /** Assignment id (StudioAssignment.id). */
  assignmentId?: string
  /** Assistant userId — this is what we send to `POST /tasks`. */
  assistantId?: string
  seriesId?: string
  chapterId?: string
  pageId?: string
  /** Selected whole pages. More than one uses `POST /tasks/group`. */
  pageIds: string[]
  regionIds: string[]
  taskType?: CreateTaskBodyDtoTaskType
  /** Local datetime string (YYYY-MM-DDTHH:mm) before ISO conversion. */
  deadline?: string
  priority?: number
  assetIds?: string[]
}

export interface UseAssignTaskFormOptions {
  preset?: UseTaskComposerDataOptions
  /** All known active assignments (so we can resolve `assignmentId → assistantId`). */
  assignments?: AssignmentListResDtoOutputItemsItem[]
}

export interface UseAssignTaskFormResult {
  state: AssignTaskFormState
  /** Resolved `StudioAssignment` for the currently selected assignmentId. */
  selectedAssignment: AssignmentListResDtoOutputItemsItem | undefined
  /** Whitelist of task types allowed for the selected assignment. */
  allowedTaskTypes: CreateTaskBodyDtoTaskType[]
  /** True when context (assistantId + at least one page) is set so user can advance to "work". */
  canGoNextFromContext: boolean
  /** True when work (taskType) is set so user can advance to "confirm". */
  canGoNextFromWork: boolean
  setStep: (step: ComposerStep) => void
  goNext: () => void
  goBack: () => void
  /** Update context fields (assistant/series/chapter/page/region). Pass assistantId as userId. */
  setContext: (
    ctx: Partial<
      Pick<
        AssignTaskFormState,
        'assignmentId' | 'assistantId' | 'seriesId' | 'chapterId' | 'pageId' | 'pageIds' | 'regionIds'
      >
    >
  ) => void
  setWork: (work: Partial<Pick<AssignTaskFormState, 'taskType' | 'deadline' | 'priority' | 'assetIds'>>) => void
  /** Submit the form. Returns `{success:true, data}` on success. */
  submit: () => Promise<{ success: boolean; data?: CreateTaskBodyDto | CreateTaskGroupBodyDto; error?: string }>
  reset: () => void
  isSubmitting: UseAssignTaskResult['isSubmitting']
}

const STEP_ORDER: ComposerStep[] = ['context', 'work', 'confirm']

/**
 * State + behavior for the Mangaka "Assign task" composer.
 *
 * Why this exists:
 *  - Centralises the `assignmentId ↔ assistantId` resolution that the dialog
 *    used to do incorrectly (see git history). The dialog just renders the UI;
 *    the hook guarantees the payload sent to `POST /tasks` has the correct
 *    **Assistant userId**.
 *  - Decouples cascading UI state from the submit call.
 */
export function useAssignTaskForm(options: UseAssignTaskFormOptions = {}): UseAssignTaskFormResult {
  const { preset, assignments = [] } = options
  const { assignTask, assignTaskGroup, isSubmitting } = useAssignTask()

  const initial: AssignTaskFormState = useMemo(
    () => ({
      step: 'context',
      // CRITICAL: do NOT pre-populate `assistantId` from `presetAssignmentId`
      // — that's the *StudioAssignment* id. We resolve it via `assignments`
      // once they're available; until then, user picks via the picker.
      assignmentId: preset?.presetAssignmentId,
      assistantId: undefined,
      seriesId: preset?.presetSeriesId,
      chapterId: preset?.presetChapterId,
      pageId: preset?.presetPageId,
      pageIds: preset?.presetPageId ? [preset.presetPageId] : [],
      regionIds: preset?.presetRegionId ? [preset.presetRegionId] : []
    }),
    [
      preset?.presetAssignmentId,
      preset?.presetChapterId,
      preset?.presetPageId,
      preset?.presetRegionId,
      preset?.presetSeriesId
    ]
  )

  const [state, setState] = useState<AssignTaskFormState>(initial)

  const selectedAssignment = useMemo(
    () => (state.assignmentId ? assignments.find((a) => a.id === state.assignmentId) : undefined),
    [assignments, state.assignmentId]
  )

  const allowedTaskTypes = useMemo<CreateTaskBodyDtoTaskType[]>(
    () => (selectedAssignment ? (selectedAssignment.assignedTaskTypes as CreateTaskBodyDtoTaskType[]) : []),
    [selectedAssignment]
  )

  const resolvedAssistantId = state.assistantId ?? selectedAssignment?.assistantId

  const canGoNextFromContext = !!resolvedAssistantId && state.pageIds.length > 0
  const canGoNextFromWork = !!state.taskType

  const setStep = useCallback((step: ComposerStep) => {
    setState((prev) => ({ ...prev, step }))
  }, [])

  const goNext = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step)
      const next = STEP_ORDER[idx + 1]
      return next ? { ...prev, step: next } : prev
    })
  }, [])

  const goBack = useCallback(() => {
    setState((prev) => {
      const idx = STEP_ORDER.indexOf(prev.step)
      const prevStep = STEP_ORDER[idx - 1]
      return prevStep ? { ...prev, step: prevStep } : prev
    })
  }, [])

  const setContext = useCallback(
    (
      ctx: Partial<
        Pick<
          AssignTaskFormState,
          'assignmentId' | 'assistantId' | 'seriesId' | 'chapterId' | 'pageId' | 'pageIds' | 'regionIds'
        >
      >
    ) => {
      setState((prev) => {
        const next = { ...prev, ...ctx }
        // Whenever assignmentId is set/cleared, derive the actual assistant userId
        // so the submit payload uses the correct ObjectId.
        if ('assignmentId' in ctx) {
          const matched = ctx.assignmentId ? assignments.find((a) => a.id === ctx.assignmentId) : undefined
          next.assistantId = matched?.assistantId
        }
        return next
      })
    },
    [assignments]
  )

  const setWork = useCallback(
    (work: Partial<Pick<AssignTaskFormState, 'taskType' | 'deadline' | 'priority' | 'assetIds'>>) => {
      setState((prev) => ({ ...prev, ...work }))
    },
    []
  )

  const reset = useCallback(() => {
    setState(initial)
    // Force a re-derivation of the initial assistantId from preset (if any).
    if (initial.assignmentId) {
      const matched = assignments.find((a) => a.id === initial.assignmentId)
      if (matched) {
        setState((prev) => ({ ...prev, assistantId: matched.assistantId }))
      }
    }
  }, [assignments, initial])

  const submit = useCallback(async (): Promise<{
    success: boolean
    data?: CreateTaskBodyDto | CreateTaskGroupBodyDto
    error?: string
  }> => {
    if (!resolvedAssistantId || state.pageIds.length === 0 || !state.taskType) {
      return { success: false, error: 'Vui lòng điền đầy đủ thông tin.' }
    }
    if (allowedTaskTypes.length > 0 && !allowedTaskTypes.includes(state.taskType)) {
      return { success: false, error: 'Loại công việc không nằm trong thoả thuận thuê của trợ lý.' }
    }
    if (state.pageIds.length > 1) {
      const payload: CreateTaskGroupBodyDto = {
        assistantId: resolvedAssistantId,
        pageIds: state.pageIds,
        taskType: state.taskType,
        ...(state.deadline ? { deadline: new Date(state.deadline).toISOString() } : {}),
        ...(state.priority !== undefined ? { priority: state.priority } : {}),
        ...(state.assetIds && state.assetIds.length > 0 ? { assetIds: state.assetIds } : {})
      }
      const result = await assignTaskGroup(payload)
      return result.success
        ? { success: true, data: payload }
        : { success: false, error: result.error ?? 'Không thể giao nhóm task.' }
    }
    const payload: CreateTaskBodyDto = {
      assistantId: resolvedAssistantId,
      pageId: state.pageIds[0],
      ...(state.regionIds.length > 0 ? { regionIds: state.regionIds } : {}),
      taskType: state.taskType,
      ...(state.deadline ? { deadline: new Date(state.deadline).toISOString() } : {}),
      ...(state.priority !== undefined ? { priority: state.priority } : {}),
      ...(state.assetIds && state.assetIds.length > 0 ? { assetIds: state.assetIds } : {})
    }
    const result = await assignTask(payload)
    if (result.success) {
      return { success: true, data: payload }
    }
    return { success: false, error: result.error ?? 'Không thể giao task.' }
  }, [state, resolvedAssistantId, allowedTaskTypes, assignTask, assignTaskGroup])

  return {
    state,
    selectedAssignment,
    allowedTaskTypes,
    canGoNextFromContext,
    canGoNextFromWork,
    setStep,
    goNext,
    goBack,
    setContext,
    setWork,
    submit,
    reset,
    isSubmitting
  }
}
