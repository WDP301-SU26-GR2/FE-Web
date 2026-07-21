import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { taskControllerStartTask, taskControllerSubmitTask } from '~/api/operations/task/task'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssistantTaskActionsResult {
  isMutating: boolean
  start: (taskId: string) => Promise<boolean>
  /**
   * Two-step: upload file → R2, then submit `{file: key}` to BE.
   * Returns `true` only if both legs succeed.
   */
  submit: (taskId: string, file: File) => Promise<boolean>
}

/**
 * Mutation methods for the assistant task list. Kept separate from the query
 * hook so callers can compose them on any container component without
 * re-firing the list fetch on each `start`/`submit`.
 *
 * Endpoint:
 *  - `POST /tasks/{id}/start`     (ASSIGNED → IN_PROGRESS)
 *  - `POST /tasks/{id}/submit`    (IN_PROGRESS → SUBMITTED, body `{ file: <key> }`)
 */
export function useAssistantTaskActions(): UseAssistantTaskActionsResult {
  const { t } = useTranslation('assistant')
  const [isMutating, setIsMutating] = useState(false)

  const start = useCallback(
    async (taskId: string) => {
      setIsMutating(true)
      try {
        await taskControllerStartTask({ id: taskId })
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('tasks.error.startFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  const submit = useCallback(
    async (taskId: string, file: File) => {
      if (!file) {
        toast.error(t('tasks.error.noFileToSubmit'))
        return false
      }
      setIsMutating(true)
      try {
        const key = await uploadToR2(file)
        await taskControllerSubmitTask({ id: taskId }, { file: key })
        toast.success(t('tasks.error.submitSuccess'))
        return true
      } catch (err) {
        toast.error(extractApiErrorMessage(err, t('tasks.error.submitFailed')))
        return false
      } finally {
        setIsMutating(false)
      }
    },
    [t]
  )

  return { isMutating, start, submit }
}
