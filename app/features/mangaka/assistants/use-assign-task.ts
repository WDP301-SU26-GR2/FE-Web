import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  BatchCreateTaskBodyDto,
  CreateTaskBodyDto,
  CreateTaskGroupBodyDto,
  TaskResDtoOutput
} from '~/api/model/task'
import {
  taskControllerCreateTask,
  taskControllerCreateTaskBatch,
  taskControllerCreateTaskGroup
} from '~/api/operations/task/task'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface UseAssignTaskResult {
  /** Fire `POST /tasks`. Returns the created task on success. */
  assignTask: (input: CreateTaskBodyDto) => Promise<{ success: boolean; data?: TaskResDtoOutput; error?: string }>
  /** Fire `POST /tasks/group` for one shared task across multiple whole pages. */
  assignTaskGroup: (input: CreateTaskGroupBodyDto) => Promise<{ success: boolean; error?: string }>
  /** Fire `POST /tasks/batch` atomically, one task per selected region. */
  assignTaskBatch: (input: BatchCreateTaskBodyDto) => Promise<{ success: boolean; error?: string }>
  isSubmitting: boolean
}

function readableError(error: unknown, fallback: string): string {
  const message = extractApiErrorMessage(error, fallback)
  return message.startsWith('Error.') ? fallback : message
}

/** Wrap the Mangaka task and task-group creation endpoints. */
export function useAssignTask(): UseAssignTaskResult {
  const { t } = useTranslation('mangaka')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assignTask = useCallback(
    async (input: CreateTaskBodyDto): Promise<{ success: boolean; data?: TaskResDtoOutput; error?: string }> => {
      if (isSubmitting) return { success: false, error: t('studio.tasks.composer.errors.assigning') }

      setIsSubmitting(true)
      try {
        const res = await taskControllerCreateTask(input)
        return { success: true, data: res.data as TaskResDtoOutput | undefined }
      } catch (error) {
        return { success: false, error: readableError(error, t('studio.tasks.composer.errors.assignFailed')) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, t]
  )

  const assignTaskGroup = useCallback(
    async (input: CreateTaskGroupBodyDto): Promise<{ success: boolean; error?: string }> => {
      if (isSubmitting) return { success: false, error: t('studio.tasks.composer.errors.assigning') }

      setIsSubmitting(true)
      try {
        await taskControllerCreateTaskGroup(input)
        return { success: true }
      } catch (error) {
        return { success: false, error: readableError(error, t('studio.tasks.composer.errors.assignGroupFailed')) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, t]
  )

  const assignTaskBatch = useCallback(
    async (input: BatchCreateTaskBodyDto): Promise<{ success: boolean; error?: string }> => {
      if (isSubmitting) return { success: false, error: t('studio.tasks.composer.errors.assigning') }

      setIsSubmitting(true)
      try {
        await taskControllerCreateTaskBatch(input)
        return { success: true }
      } catch (error) {
        return { success: false, error: readableError(error, t('studio.tasks.composer.errors.assignBatchFailed')) }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, t]
  )

  return { assignTask, assignTaskGroup, assignTaskBatch, isSubmitting }
}
