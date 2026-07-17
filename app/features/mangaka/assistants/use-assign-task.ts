import { useCallback, useState } from 'react'
import { taskControllerCreateTask } from '~/api/operations/task/task'
import type { CreateTaskBodyDto } from '~/api/model/task'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssignTaskResult {
  assignTask: (input: CreateTaskBodyDto) => Promise<{ success: boolean; error?: string }>
  isSubmitting: boolean
}

export function useAssignTask(): UseAssignTaskResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assignTask = useCallback(
    async (input: CreateTaskBodyDto): Promise<{ success: boolean; error?: string }> => {
      if (isSubmitting) return { success: false, error: 'Already submitting' }
      setIsSubmitting(true)
      try {
        await taskControllerCreateTask(input)
        return { success: true }
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
