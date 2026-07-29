import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import type { TaskResDtoOutput } from '~/api/model/task/taskResDtoOutput'
import type { UpdateTaskBodyDto } from '~/api/model/task/updateTaskBodyDto'
import { taskControllerGetTask } from '~/api/operations/task/task'
import { Button, Dialog } from '~/shared/ui'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export interface TaskEditDialogProps {
  task: TaskListResDtoOutputItemsItem | null
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (taskId: string, update: UpdateTaskBodyDto) => Promise<{ success: boolean; error?: string }>
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 19)
}

/**
 * Updates only fields changed by the Mangaka. Existing attachment ids remain
 * omitted unless the Mangaka explicitly chooses to clear every attachment.
 */
export function TaskEditDialog({ open, task, ...props }: TaskEditDialogProps) {
  if (!open || !task) return null
  return <TaskEditDialogBody key={task.id} task={task} {...props} />
}

type TaskEditDialogBodyProps = Omit<TaskEditDialogProps, 'open' | 'task'> & {
  task: TaskListResDtoOutputItemsItem
}

function TaskEditDialogBody({ task, isSubmitting, onClose, onSubmit }: TaskEditDialogBodyProps) {
  const { t } = useTranslation('mangaka')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState(() => toDatetimeLocal(task.deadline))
  const [initialDeadlineDisplay, setInitialDeadlineDisplay] = useState(() => toDatetimeLocal(task.deadline))
  const [priority, setPriority] = useState(() => String(task.priority))
  const [attachmentCount, setAttachmentCount] = useState(() => task.assetIds.length)
  const [clearAttachments, setClearAttachments] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<TaskResDtoOutput | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    void taskControllerGetTask({ id: task.id }, { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return
        setDescription(res.data.description ?? '')
        const initialDeadline = toDatetimeLocal(res.data.deadline)
        setDeadline(initialDeadline)
        setInitialDeadlineDisplay(initialDeadline)
        setPriority(String(res.data.priority))
        setAttachmentCount(res.data.assetIds.length)
        setDetail(res.data)
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(extractApiErrorMessage(err, t('tasks.errors.loadDetailFailed')))
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [task.id, t])

  const canEditDescription = detail?.status === 'ASSIGNED'
  const parsedPriority = Number(priority)
  const priorityIsValid = Number.isInteger(parsedPriority) && parsedPriority >= 0
  const canSave = !isLoading && detail !== null && priorityIsValid && !isSubmitting

  const update = useMemo<UpdateTaskBodyDto | null>(() => {
    if (!detail || !priorityIsValid) return null
    const next: UpdateTaskBodyDto = {}
    if (deadline !== initialDeadlineDisplay) {
      const nextDeadline = deadline ? new Date(deadline).toISOString() : null
      if (nextDeadline !== detail.deadline) next.deadline = nextDeadline
    }
    if (parsedPriority !== detail.priority) next.priority = parsedPriority
    if (canEditDescription && description !== (detail.description ?? '')) next.description = description || null
    if (clearAttachments && attachmentCount > 0) next.assetIds = []
    return next
  }, [
    attachmentCount,
    canEditDescription,
    clearAttachments,
    deadline,
    detail,
    description,
    initialDeadlineDisplay,
    parsedPriority,
    priorityIsValid
  ])

  const handleSubmit = async () => {
    if (!update || !canSave) return
    if (Object.keys(update).length === 0) {
      onClose()
      return
    }
    setError(null)
    const result = await onSubmit(task.id, update)
    if (result.success) onClose()
    else setError(result.error ?? t('tasks.errors.updateFailed'))
  }

  return (
    <Dialog
      open
      onClose={onClose}
      titleId='task-edit-title'
      title={t('studio.tasks.edit.title')}
      description={t('studio.tasks.edit.description')}
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            {t('studio.tasks.edit.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSave}>
            {isSubmitting ? t('studio.tasks.edit.saving') : t('studio.tasks.edit.save')}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        {error && (
          <p
            role='alert'
            className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'
          >
            {error}
          </p>
        )}
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='task-edit-deadline'>
            {t('studio.tasks.edit.deadline')}
          </label>
          <input
            id='task-edit-deadline'
            type='datetime-local'
            step='1'
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            disabled={isLoading || isSubmitting}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
          />
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='task-edit-priority'>
            {t('studio.tasks.edit.priority')}
          </label>
          <input
            id='task-edit-priority'
            type='number'
            min='0'
            step='1'
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            disabled={isLoading || isSubmitting}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
          />
          {!priorityIsValid && <p className='text-xs text-destructive'>{t('studio.tasks.edit.priorityInvalid')}</p>}
        </div>
        <div className='space-y-1.5'>
          <label className='text-sm font-medium text-foreground' htmlFor='task-edit-description'>
            {t('studio.tasks.edit.descriptionLabel')}
          </label>
          <textarea
            id='task-edit-description'
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={!canEditDescription || isLoading || isSubmitting}
            maxLength={2000}
            rows={4}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
          {!canEditDescription && (
            <p className='text-xs text-muted-foreground'>{t('studio.tasks.edit.descriptionLocked')}</p>
          )}
        </div>
        {attachmentCount > 0 && (
          <label className='flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground'>
            <input
              type='checkbox'
              checked={clearAttachments}
              onChange={(event) => setClearAttachments(event.target.checked)}
              disabled={isLoading || isSubmitting}
              className='mt-0.5 h-4 w-4 accent-primary'
            />
            <span>{t('studio.tasks.edit.clearAttachments', { count: attachmentCount })}</span>
          </label>
        )}
      </div>
    </Dialog>
  )
}
