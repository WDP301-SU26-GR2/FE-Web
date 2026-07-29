import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import { Button, Dialog } from '~/shared/ui'
import { useTaskComposerData } from '../use-task-composer-data'

export interface TaskReassignDialogProps {
  task: TaskListResDtoOutputItemsItem | null
  open: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (taskId: string, assistantId: string) => Promise<{ success: boolean; error?: string }>
}

const REASSIGNABLE_STATUSES = new Set(['ASSIGNED', 'IN_PROGRESS', 'REVISION_REQUESTED', 'ON_HOLD'])

/**
 * Lets a Mangaka select only active Studio assignments that advertise the
 * task's specialization. The backend remains the authority for page/series
 * ownership and stage state, which are not present in a compact task row.
 */
export function TaskReassignDialog({ open, ...props }: TaskReassignDialogProps) {
  if (!open) return null
  return <TaskReassignDialogBody key={props.task?.id ?? 'task-reassign'} {...props} />
}

type TaskReassignDialogBodyProps = Omit<TaskReassignDialogProps, 'open'>

function TaskReassignDialogBody({ task, isSubmitting, onClose, onSubmit }: TaskReassignDialogBodyProps) {
  const { t } = useTranslation('mangaka')
  const composer = useTaskComposerData()
  const [assistantId, setAssistantId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const taskType = task?.taskType
    if (!taskType) return []
    return composer.data.assignments.filter(
      (assignment) =>
        assignment.activeNow &&
        (task.status === 'ON_HOLD' || assignment.assistantId !== task.assistantId) &&
        assignment.assignedTaskTypes.includes(taskType)
    )
  }, [composer.data.assignments, task])

  const canReassign = Boolean(task && REASSIGNABLE_STATUSES.has(task.status))
  const canSubmit = canReassign && Boolean(assistantId) && confirmed && !isSubmitting

  const handleClose = () => {
    setAssistantId('')
    setConfirmed(false)
    setError(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (!task || !canSubmit) return
    setError(null)
    const result = await onSubmit(task.id, assistantId)
    if (result.success) handleClose()
    else setError(result.error ?? t('tasks.errors.reassignFailed'))
  }

  return (
    <Dialog
      open
      onClose={handleClose}
      titleId='task-reassign-title'
      title={t('studio.tasks.reassign.title')}
      description={t('studio.tasks.reassign.description')}
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={handleClose} disabled={isSubmitting}>
            {t('studio.tasks.reassign.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {isSubmitting ? t('studio.tasks.reassign.submitting') : t('studio.tasks.reassign.submit')}
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
        {!canReassign ? (
          <p className='rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning'>
            {t('studio.tasks.reassign.notEligible')}
          </p>
        ) : (
          <>
            <div className='space-y-1.5'>
              <label className='text-sm font-medium text-foreground' htmlFor='task-reassign-assistant'>
                {t('studio.tasks.reassign.assistantLabel')}
              </label>
              <select
                id='task-reassign-assistant'
                value={assistantId}
                onChange={(event) => setAssistantId(event.target.value)}
                disabled={composer.data.loading.assignments || isSubmitting || candidates.length === 0}
                className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
              >
                <option value=''>{t('studio.tasks.reassign.assistantPlaceholder')}</option>
                {candidates.map((assignment) => (
                  <option key={assignment.id} value={assignment.assistantId}>
                    {assignment.assistant?.displayName ?? t('studio.tasks.reassign.unnamedAssistant')}
                  </option>
                ))}
              </select>
              {!composer.data.loading.assignments && candidates.length === 0 && (
                <p className='text-xs text-muted-foreground'>{t('studio.tasks.reassign.noEligibleAssistant')}</p>
              )}
            </div>
            <label className='flex cursor-pointer items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground'>
              <input
                type='checkbox'
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={isSubmitting}
                className='mt-0.5 h-4 w-4 accent-primary'
              />
              <span>{t('studio.tasks.reassign.confirmation')}</span>
            </label>
          </>
        )}
      </div>
    </Dialog>
  )
}
