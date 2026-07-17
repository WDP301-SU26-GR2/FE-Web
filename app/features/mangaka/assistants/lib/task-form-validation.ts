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

export function validateTaskForm(values: Partial<TaskFormValues>): TaskFormErrors {
  const errors: TaskFormErrors = {}

  if (!values.assistantId) {
    errors.assistantId = 'Vui lòng chọn trợ lý.'
  }

  if (!values.pageId) {
    errors.pageId = 'Vui lòng chọn trang.'
  }

  if (!values.taskType) {
    errors.taskType = 'Vui lòng chọn loại công việc.'
  }

  if (values.deadline) {
    const deadlineDate = new Date(values.deadline)
    if (Number.isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      errors.deadline = 'Deadline phải ở tương lai.'
    }
  }

  if (values.priority !== undefined && values.priority < 0) {
    errors.priority = 'Độ ưu tiên không được âm.'
  }

  return errors
}

export function hasErrors(errors: TaskFormErrors): boolean {
  return Object.values(errors).some((e) => !!e)
}
