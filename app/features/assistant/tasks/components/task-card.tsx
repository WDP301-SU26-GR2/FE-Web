import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import { useTranslation } from 'react-i18next'
import { Calendar, ClipboardList, FileBox, Hash, PlayCircle, Send, Tag, Sparkles, ScanLine } from 'lucide-react'

import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'
import { cn } from '~/shared/lib/cn'

export type TaskCardProps = {
  task: TaskListResDtoOutputItemsItem
  /** Called when the user clicks "Start task" (status must be ASSIGNED). */
  onStart?: (taskId: string) => void
  /** Called when the user clicks "Submit result" — the second arg is the
   *  `file` value the user typed in the inline input. */
  onSubmit?: (taskId: string, file: string) => void
  /** Disables action buttons while a mutation is in flight. */
  isMutating?: boolean
}

const STATUS_META: Record<
  TaskControllerListTasksStatus,
  { className: string; tone: 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'muted' }
> = {
  ASSIGNED: { className: 'bg-primary/10 text-primary border-primary/20', tone: 'primary' },
  IN_PROGRESS: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20', tone: 'info' },
  SUBMITTED: { className: 'bg-violet-500/10 text-violet-600 border-violet-500/20', tone: 'info' },
  UNDER_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', tone: 'warning' },
  APPROVED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', tone: 'success' },
  REVISION_REQUESTED: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20', tone: 'warning' },
  ON_HOLD: { className: 'bg-muted text-muted-foreground border-border', tone: 'muted' },
  CANCELLED: { className: 'bg-rose-500/10 text-rose-600 border-rose-500/20', tone: 'danger' }
}

function formatDeadline(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Card showing one task assigned to the current Assistant.
 *
 * The card renders the same data shape across all 8 task statuses, with the
 * action row gated to:
 *  - ASSIGNED          → "Start task"  (POST /tasks/{id}/start)
 *  - IN_PROGRESS       → file input + "Submit result"  (POST /tasks/{id}/submit)
 *  - everything else   → no action (status is owned by the Mangaka / BE)
 */
export function TaskCard({ task, onStart, onSubmit, isMutating }: TaskCardProps) {
  const { t, i18n } = useTranslation('assistant')
  const locale = i18n.language

  const statusMeta = STATUS_META[task.status] ?? STATUS_META.ASSIGNED
  const isActionable = task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS'

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
              <ClipboardList className='h-3 w-3' />
              {t(`tasks.taskType.${task.taskType}`)}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                statusMeta.className
              )}
            >
              {t(`tasks.filters.statuses.${task.status}`)}
            </span>
          </div>
          <p className='mt-2 truncate text-[11px] text-muted-foreground'>
            <Hash className='inline h-3 w-3 align-text-bottom' /> {task.id}
          </p>
        </div>
      </header>

      <div className='grid grid-cols-2 gap-2 text-[11px]'>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Tag className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            {t('tasks.card.priority')}: <span className='font-bold text-foreground tabular-nums'>{task.priority}</span>
          </span>
        </div>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Calendar className='mt-0.5 h-3 w-3 shrink-0' />
          <span>{task.deadline ? formatDeadline(task.deadline, locale) : t('tasks.card.deadlineNone')}</span>
        </div>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <FileBox className='mt-0.5 h-3 w-3 shrink-0' />
          <span>{t('tasks.card.versions', { count: task.versions.length })}</span>
        </div>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Hash className='mt-0.5 h-3 w-3 shrink-0' />
          <span className='truncate'>{task.pageId}</span>
        </div>
      </div>

      {task.region && (
        <div className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs'>
          <div className='flex items-center gap-2 font-bold text-foreground'>
            <ScanLine className='size-4 text-primary' />
            {t('tasks.card.regionTitle')}
          </div>
          <div className='mt-2 grid grid-cols-2 gap-2 text-muted-foreground sm:grid-cols-3'>
            <span>{t('tasks.card.regionType')}: <strong className='text-foreground'>{task.region.regionType}</strong></span>
            <span>X / Y: <strong className='text-foreground'>{task.region.coordinates.x} / {task.region.coordinates.y}</strong></span>
            <span>{t('tasks.card.regionSize')}: <strong className='text-foreground'>{task.region.coordinates.width} × {task.region.coordinates.height}px</strong></span>
          </div>
        </div>
      )}

      {task.statusReason && (
        <div className='flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700'>
          <Sparkles className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            <span className='font-semibold'>{t('tasks.card.statusReason')}: </span>
            {task.statusReason}
          </span>
        </div>
      )}

      {isActionable && <TaskActions task={task} onStart={onStart} onSubmit={onSubmit} isMutating={!!isMutating} />}
    </article>
  )
}

/**
 * Action footer: either a "Start" button (ASSIGNED) or a file input + Submit
 * button (IN_PROGRESS). Kept as a sub-component so the card body stays compact.
 */
function TaskActions({
  task,
  onStart,
  onSubmit,
  isMutating
}: {
  task: TaskListResDtoOutputItemsItem
  onStart?: (id: string) => void
  onSubmit?: (id: string, file: string) => void
  isMutating: boolean
}) {
  const { t } = useTranslation('assistant')
  // Local file input state. The BE only requires a non-empty string `file`.
  const fileInputId = `task-${task.id}-file`
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!onSubmit) return
    const formData = new FormData(e.currentTarget)
    const file = String(formData.get('file') ?? '').trim()
    if (file) onSubmit(task.id, file)
  }

  if (task.status === 'ASSIGNED') {
    return (
      <footer className='mt-auto flex items-center justify-end gap-2 border-t border-border pt-3'>
        <button
          type='button'
          disabled={isMutating || !onStart}
          onClick={() => onStart?.(task.id)}
          className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <PlayCircle className='h-3.5 w-3.5' />
          {t('tasks.actions.start')}
        </button>
      </footer>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='mt-auto flex flex-col gap-2 border-t border-border pt-3'>
      <label htmlFor={fileInputId} className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        {t('tasks.card.resultFile')}
      </label>
      <div className='flex items-center gap-2'>
        <input
          id={fileInputId}
          name='file'
          type='text'
          placeholder='result/file-key.png'
          disabled={isMutating}
          className='min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50'
        />
        <button
          type='submit'
          disabled={isMutating || !onSubmit}
          className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <Send className='h-3.5 w-3.5' />
          {t('tasks.actions.submit')}
        </button>
      </div>
    </form>
  )
}
