import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  ClipboardList,
  Calendar,
  FileBox,
  ScanLine,
  Tag,
  PlayCircle,
  Send,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react'

import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'
import { cn } from '~/shared/lib/cn'

export type TaskCardProps = {
  task: TaskListResDtoOutputItemsItem
  /** Called when the user clicks "Start task" (status must be ASSIGNED). */
  onStart?: (taskId: string) => void
  /** File-payload submitter: called with the selected `File` after the user
   *  picks a result file. The parent hook is responsible for uploading to R2
   *  then calling `POST /tasks/{id}/submit`. */
  onSubmit?: (taskId: string, file: File) => void | Promise<void | boolean>
  /** Disables action buttons while a mutation is in flight. */
  isMutating?: boolean
  /** Opens the page image dialog (assistant view). */
  onOpen?: () => void
}

const STATUS_META: Record<
  TaskControllerListTasksStatus,
  { className: string }
> = {
  ASSIGNED: { className: 'bg-primary/10 text-primary border-primary/20' },
  IN_PROGRESS: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  SUBMITTED: { className: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  UNDER_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  APPROVED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  REVISION_REQUESTED: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  ON_HOLD: { className: 'bg-muted text-muted-foreground border-border' },
  CANCELLED: { className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
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
 * Card itself is clickable (delegates to `onOpen()`) which surfaces the page
 * image + region overlay dialog. The full `task.id` is intentionally **not**
 * rendered in the UI; power users can read it from the `data-task-id`
 * attribute via devtools.
 */
export function TaskCard({ task, onStart, onSubmit, isMutating, onOpen }: TaskCardProps) {
  const { t, i18n } = useTranslation('assistant')
  const locale = i18n.language

  const statusMeta = STATUS_META[task.status] ?? STATUS_META.ASSIGNED
  const isActionable = task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS'

  return (
    <button
      type='button'
      data-task-id={task.id}
      onClick={onOpen}
      disabled={!onOpen}
      className={cn(
        'flex h-full w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        onOpen ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <header className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
              <ClipboardList className='h-3 w-3' />
              {task.taskType ? t(`tasks.taskType.${task.taskType}`) : t('tasks.card.taskTypeNone')}
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
        </div>
        {onOpen && <Maximize2 className='h-3.5 w-3.5 shrink-0 text-muted-foreground' aria-hidden />}
      </header>

      <dl className='grid grid-cols-2 gap-2 text-[11px]'>
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
          <Info className='mt-0.5 h-3 w-3 shrink-0' />
          <span className='truncate font-mono text-[10px]'>{t('tasks.card.pageLabel', { id: task.pageId.slice(0, 8) })}</span>
        </div>
      </dl>

      <div className='flex items-start gap-1.5 rounded-md border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground'>
        <ScanLine className='mt-0.5 h-3.5 w-3.5 shrink-0 text-primary' />
        <div className='min-w-0 flex-1'>
          <p className='font-semibold text-foreground'>{t('tasks.card.region')}</p>
          <p className='mt-0.5'>
            {task.regionId
              ? t('tasks.card.regionAssigned', { id: task.regionId.slice(0, 8) })
              : t('tasks.card.fullPage')}
          </p>
        </div>
      </div>

      {task.statusReason && (
        <div className='flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700'>
          <Sparkles className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            <span className='font-semibold'>{t('tasks.card.statusReason')}: </span>
            {task.statusReason}
          </span>
        </div>
      )}

      {isActionable && (
        <footer
          className='mt-auto flex flex-col gap-2 border-t border-border pt-3'
          onClick={(e) => e.stopPropagation()}
        >
          <TaskActions task={task} onStart={onStart} onSubmit={onSubmit} isMutating={!!isMutating} />
        </footer>
      )}
    </button>
  )
}

function TaskActions({
  task,
  onStart,
  onSubmit,
  isMutating
}: {
  task: TaskListResDtoOutputItemsItem
  onStart?: (id: string) => void
  onSubmit?: (id: string, file: File) => void | Promise<void | boolean>
  isMutating: boolean
}) {
  const { t } = useTranslation('assistant')
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const fileInputId = `task-${task.id}-file`

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPickedFile(file)
    e.target.value = ''
  }

  const handleSubmit = () => {
    if (!onSubmit || !pickedFile) return
    void onSubmit(task.id, pickedFile)
  }

  if (task.status === 'ASSIGNED') {
    return (
      <button
        type='button'
        disabled={isMutating || !onStart}
        onClick={(e) => {
          e.stopPropagation()
          onStart?.(task.id)
        }}
        className='inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
      >
        <PlayCircle className='h-3.5 w-3.5' />
        {t('tasks.actions.start')}
      </button>
    )
  }

  return (
    <div className='space-y-1.5'>
      <label htmlFor={fileInputId} className='block text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        {t('tasks.actions.resultFile')}
      </label>
      <div className='flex items-center gap-2'>
        <input
          id={fileInputId}
          type='file'
          accept='image/png,image/jpeg,image/webp,application/pdf'
          disabled={isMutating}
          onChange={(e) => {
            e.stopPropagation()
            handleFileChange(e)
          }}
          onClick={(e) => e.stopPropagation()}
          className='block w-full min-w-0 flex-1 text-xs text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/70 disabled:opacity-50'
        />
        <button
          type='button'
          disabled={isMutating || !pickedFile || !onSubmit}
          onClick={(e) => {
            e.stopPropagation()
            handleSubmit()
          }}
          className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <Send className='h-3.5 w-3.5' />
          {t('tasks.actions.submit')}
        </button>
      </div>
      {pickedFile && (
        <p className='truncate text-[11px] text-muted-foreground'>
          {t('tasks.actions.selectedFile', { name: pickedFile.name, size: formatSize(pickedFile.size) })}
        </p>
      )}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
