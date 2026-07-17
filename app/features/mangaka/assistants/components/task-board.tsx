import { useTranslation } from 'react-i18next'
import { Calendar, Hash, Clock, Filter, AlertCircle } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { StatusBadge } from '~/shared/ui'
import { getTaskStatusTone } from '../lib/task-status-meta'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'

export interface TaskBoardProps {
  tasks: TaskListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onApprove: (taskId: string) => void
  onRequestRevision: (taskId: string) => void
  onCancel: (taskId: string) => void
  filters: {
    assistantId?: string
    status?: string
  }
  onFiltersChange: (filters: { assistantId?: string; status?: string }) => void
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

function formatDeadline(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function TaskBoard({
  tasks,
  isLoading,
  error,
  onRefresh,
  onApprove,
  onRequestRevision,
  onCancel,
  filters,
  onFiltersChange,
  page,
  totalPages,
  onPageChange
}: TaskBoardProps) {
  const { t } = useTranslation('mangaka')

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <div className='flex items-center gap-3'>
        <Filter className='h-4 w-4 text-muted-foreground' />
        <select
          value={filters.status ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
          className='rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
        >
          <option value=''>{t('tasks.filters.allStatuses')}</option>
          <option value='ASSIGNED'>{t('tasks.status.ASSIGNED')}</option>
          <option value='IN_PROGRESS'>{t('tasks.status.IN_PROGRESS')}</option>
          <option value='SUBMITTED'>{t('tasks.status.SUBMITTED')}</option>
          <option value='UNDER_REVIEW'>{t('tasks.status.UNDER_REVIEW')}</option>
          <option value='APPROVED'>{t('tasks.status.APPROVED')}</option>
          <option value='REVISION_REQUESTED'>{t('tasks.status.REVISION_REQUESTED')}</option>
          <option value='ON_HOLD'>{t('tasks.status.ON_HOLD')}</option>
          <option value='CANCELLED'>{t('tasks.status.CANCELLED')}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive'
        >
          <div className='flex items-center gap-2'>
            <AlertCircle className='h-4 w-4' />
            <span>{error}</span>
          </div>
          <button type='button' onClick={onRefresh} className='text-xs font-semibold hover:underline'>
            {t('tasks.board.refresh')}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className='grid grid-cols-1 gap-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='h-24 animate-pulse rounded-lg border border-border bg-muted' />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && tasks.length === 0 && !error && (
        <div className='flex flex-col items-center gap-2 py-12 text-center'>
          <p className='text-sm font-semibold text-muted-foreground'>{t('tasks.board.empty')}</p>
        </div>
      )}

      {/* Task list */}
      {!isLoading && tasks.length > 0 && (
        <div className='space-y-3'>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onApprove={onApprove}
              onRequestRevision={onRequestRevision}
              onCancel={onCancel}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-center gap-2 pt-4'>
              <button
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
                className='rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer'
              >
                {t('tasks.pagination.prev')}
              </button>
              <span className='text-sm text-muted-foreground'>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
                className='rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 cursor-pointer'
              >
                {t('tasks.pagination.next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TaskRowProps {
  task: TaskListResDtoOutputItemsItem
  onApprove: (taskId: string) => void
  onRequestRevision: (taskId: string) => void
  onCancel: (taskId: string) => void
}

function TaskRow({ task, onApprove, onRequestRevision, onCancel }: TaskRowProps) {
  const { t, i18n } = useTranslation('mangaka')
  const tone = getTaskStatusTone(task.status)
  const overdue = isOverdue(task.deadline)
  const statusLabel = t(`tasks.status.${task.status}`, { defaultValue: task.status })
  const taskTypeLabel = task.taskType
    ? t(`tasks.composer.taskTypeEnum.${task.taskType}`, { defaultValue: task.taskType })
    : '—'

  return (
    <div className='flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30'>
      {/* Task type badge */}
      <div className='shrink-0'>
        <StatusBadge tone={tone}>{statusLabel}</StatusBadge>
      </div>

      {/* Info */}
      <div className='min-w-0 flex-1 space-y-1'>
        <div className='flex items-center gap-2 text-sm'>
          <Hash className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          <span className='font-mono text-xs text-muted-foreground'>{task.id.slice(0, 8)}</span>
          <span className='font-medium'>{taskTypeLabel}</span>
        </div>

        {task.deadline && (
          <div
            className={cn('flex items-center gap-1.5 text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}
          >
            <Clock className='h-3 w-3' />
            <span>
              {overdue ? t('tasks.board.overdue') : t('tasks.board.deadline')}:{' '}
              {formatDeadline(task.deadline, i18n.language)}
            </span>
          </div>
        )}

        {task.priority !== undefined && task.priority > 0 && (
          <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
            <Calendar className='h-3 w-3' />
            <span>
              {t('tasks.board.priority')}: {task.priority}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className='flex shrink-0 items-center gap-2'>
        {task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' ? (
          <>
            <button
              type='button'
              onClick={() => onApprove(task.id)}
              className='rounded-md bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/20 cursor-pointer'
            >
              {t('tasks.board.approve')}
            </button>
            <button
              type='button'
              onClick={() => onRequestRevision(task.id)}
              className='rounded-md bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/20 cursor-pointer'
            >
              {t('tasks.board.revision')}
            </button>
          </>
        ) : task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUESTED' ? (
          <button
            type='button'
            onClick={() => onCancel(task.id)}
            className='rounded-md bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 cursor-pointer'
          >
            {t('tasks.board.cancel')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
