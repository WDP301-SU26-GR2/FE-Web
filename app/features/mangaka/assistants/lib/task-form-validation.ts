import type { CreateTaskBodyDto } from '~/api/model/task'

export interface TaskFormValues {
  assistantId: string
  pageId: string
  regionId?: string
  taskType: CreateTaskBodyDto['taskType']
  deadline?: string
  priority?: number
  assetIds?: string[]
}

export interface TaskFormErrors {
  assistantId?: string
  pageId?: string
  regionId?: string
  taskType?: string
  deadline?: string
  priority?: string
  assets?: string
}

export type TaskFormTranslator = (key: string) => string

/**
 * Keeps validation reusable outside React while requiring a translator for
 * every user-visible validation result.
 */
export function validateTaskForm(values: Partial<TaskFormValues>, t: TaskFormTranslator): TaskFormErrors {
  const errors: TaskFormErrors = {}

  if (!values.assistantId) errors.assistantId = t('studio.tasks.composer.validation.assistantRequired')
  if (!values.pageId) errors.pageId = t('studio.tasks.composer.validation.pageRequired')
  if (!values.taskType) errors.taskType = t('studio.tasks.composer.validation.taskTypeRequired')

  if (values.deadline) {
    const deadlineDate = new Date(values.deadline)
    if (Number.isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      errors.deadline = t('studio.tasks.composer.validation.deadlineFuture')
    }
  }

  if (values.priority !== undefined && values.priority < 0) {
    errors.priority = t('studio.tasks.composer.validation.priorityNonNegative')
  }

  return errors
}

export function hasErrors(errors: TaskFormErrors): boolean {
  return Object.values(errors).some((error) => !!error)
}
