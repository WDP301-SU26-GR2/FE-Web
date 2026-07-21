import { useCallback, useState } from 'react'
import { taskControllerCreateTask } from '~/api/operations/task/task'
import type { CreateTaskBodyDto, TaskResDtoOutput } from '~/api/model/task'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssignTaskResult {
  /** Fire `POST /tasks`. Returns the created task on success. */
  assignTask: (input: CreateTaskBodyDto) => Promise<{ success: boolean; data?: TaskResDtoOutput; error?: string }>
  isSubmitting: boolean
}

/**
 * Hook for `POST /tasks` (Mangaka assigns a task to an Assistant).
 *
 * Per FE-API-Guide-v3.md §6 the BE enforces BR-ASSIST-01:
 *  - `assistantId` must reference a User with an ACTIVE StudioAssignment
 *    covering the page's series and the current time. Otherwise the BE
 *    returns 409 `Error.AssistantNotHired`.
 *  - `taskType` must be in the assignment's `assignedTaskTypes[]`.
 *
 * The hook only wraps the network call + error extraction; validation of the
 * taskType whitelist is done by the caller (see `useAssignTaskForm`).
 */
export function useAssignTask(): UseAssignTaskResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assignTask = useCallback(
    async (input: CreateTaskBodyDto): Promise<{ success: boolean; data?: TaskResDtoOutput; error?: string }> => {
      if (isSubmitting) return { success: false, error: 'Đang giao task, vui lòng đợi.' }
      setIsSubmitting(true)
      try {
        const res = await taskControllerCreateTask(input)
        return { success: true, data: res.data as TaskResDtoOutput | undefined }
      } catch (err) {
        const message = extractApiErrorMessage(err, 'Không thể giao task. Vui lòng thử lại.')
        return { success: false, error: message }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting]
  )

  return { assignTask, isSubmitting }
}
