import { useTranslation } from 'react-i18next'
import { Calendar, ClipboardList, Layers3, ScanLine, Tag } from 'lucide-react'

import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'
import { cn } from '~/shared/lib/cn'

export interface TaskCardProps {
  task: TaskListResDtoOutputItemsItem
  onOpen: (taskId: string) => void
}

const STATUS_CLASS: Record<TaskListResDtoOutputItemsItem['status'], string> = {
  ASSIGNED: 'border-primary/30 bg-primary/10 text-primary',
  IN_PROGRESS: 'border-primary/30 bg-primary/10 text-primary',
  SUBMITTED: 'border-border bg-muted text-muted-foreground',
  UNDER_REVIEW: 'border-border bg-muted text-muted-foreground',
  APPROVED: 'border-primary/30 bg-primary/10 text-primary',
  REVISION_REQUESTED: 'border-primary/30 bg-primary/10 text-primary',
  ON_HOLD: 'border-border bg-muted text-muted-foreground',
  CANCELLED: 'border-destructive/30 bg-destructive/10 text-destructive'
}

function formatDeadline(iso: string | null, locale: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** A compact list card. The full task must be loaded before showing workspace-only data. */
export function TaskCard({ task, onOpen }: TaskCardProps) {
  const { t, i18n } = useTranslation('assistant')
  const regionCount = Array.isArray(task.regions)
    ? task.regions.length
    : Array.isArray(task.regionIds)
      ? task.regionIds.length
      : 0

  return (
    <button
      type='button'
      data-task-id={task.id}
      onClick={() => onOpen(task.id)}
      className='flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 space-y-2'>
          <span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            <ClipboardList className='h-3 w-3' />
            {task.taskType ? t(`tasks.taskType.${task.taskType}`) : t('tasks.card.taskTypeNone')}
          </span>
          {task.groupTitle && <p className='truncate text-sm font-bold text-foreground'>{task.groupTitle}</p>}
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            STATUS_CLASS[task.status]
          )}
        >
          {t(`tasks.filters.statuses.${task.status}`)}
        </span>
      </div>

      <dl className='grid grid-cols-2 gap-3 text-xs text-muted-foreground'>
        <div className='flex items-center gap-1.5'>
          <Tag className='h-3.5 w-3.5 text-primary' />
          <span>
            {t('tasks.card.priority')}: {task.priority}
          </span>
        </div>
        <div className='flex items-center gap-1.5'>
          <Calendar className='h-3.5 w-3.5 text-primary' />
          <span>{task.deadline ? formatDeadline(task.deadline, i18n.language) : t('tasks.card.deadlineNone')}</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <ScanLine className='h-3.5 w-3.5 text-primary' />
          <span>{regionCount ? t('tasks.card.regionCount', { count: regionCount }) : t('tasks.card.fullPage')}</span>
        </div>
        {task.groupId && (
          <div className='flex items-center gap-1.5'>
            <Layers3 className='h-3.5 w-3.5 text-primary' />
            <span>{t('tasks.card.groupTask')}</span>
          </div>
        )}
      </dl>

      <span className='mt-auto border-t border-border pt-3 text-xs font-semibold text-primary'>
        {t('tasks.actions.openWorkspace')}
      </span>
    </button>
  )
}
