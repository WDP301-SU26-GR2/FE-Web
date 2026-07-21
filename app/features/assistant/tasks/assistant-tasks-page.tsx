import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ClipboardList, Filter, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { cn } from '~/shared/lib/cn'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import { useAssistantTasksQuery } from './use-assistant-tasks-query'
import { useAssistantTaskActions } from './use-assistant-task-actions'
import { TaskCard } from './components/task-card'
import { TaskImageDialog } from './components/task-image-dialog'

const STATUS_FILTERS: ReadonlyArray<TaskControllerListTasksStatus> = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'ON_HOLD',
  'CANCELLED'
]

export function AssistantTasksPage() {
  const { t } = useTranslation('assistant')
  const [status, setStatus] = useState<TaskControllerListTasksStatus | undefined>(undefined)
  const tasks = useAssistantTasksQuery({ status })
  const actions = useAssistantTaskActions()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const openTask = tasks.items.find((task) => task.id === openTaskId) ?? null

  const totalPages = Math.max(1, Math.ceil(tasks.total / tasks.perPage))
  const from = tasks.total === 0 ? 0 : (tasks.page - 1) * tasks.perPage + 1
  const to = Math.min(tasks.page * tasks.perPage, tasks.total)

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <ClipboardList className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('tasks.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('tasks.subtitle')}</p>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('tasks.filters.status')}</span>
        </div>
        <button
          type='button'
          onClick={() => {
            setStatus(undefined)
            tasks.setPage(1)
          }}
          aria-pressed={status === undefined}
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            status === undefined
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
        >
          {t('tasks.filters.all')}
        </button>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => {
              setStatus(status === value ? undefined : value)
              tasks.setPage(1)
            }}
            aria-pressed={status === value}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
              status === value
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {t(`tasks.filters.statuses.${value}`)}
          </button>
        ))}
      </div>

      {tasks.error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: tasks.error }, t('tasks.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={tasks.refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('tasks.error.retry')}
          </button>
        </div>
      )}

      <div className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {tasks.isLoading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: tasks.perPage }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : tasks.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {tasks.items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStart={(id) => {
                    void actions.start(id).then((ok) => {
                      if (ok) {
                        toast.success(
                          t(task.status === 'REVISION_REQUESTED' ? 'tasks.success.revisionStarted' : 'tasks.success.started')
                        )
                        tasks.refresh()
                      }
                    })
                  }}
                  onSubmit={async (id, file) => {
                    const ok = await actions.submit(id, file)
                    if (ok) tasks.refresh()
                    return ok
                  }}
                  onOpen={() => setOpenTaskId(task.id)}
                  isMutating={actions.isMutating}
                />
              ))}
            </div>

            <div className='mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => tasks.setPage(Math.max(1, tasks.page - 1))}
                  disabled={tasks.page === 1 || tasks.isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('tasks.pagination.previousPage')}
                >
                  <ArrowLeft className='h-4 w-4' />
                </button>
                <span className='text-xs text-muted-foreground'>
                  {t('tasks.pagination.showingRange', { from, to, total: tasks.total })}
                </span>
                <button
                  type='button'
                  onClick={() => tasks.setPage(tasks.page + 1)}
                  disabled={tasks.page === totalPages || tasks.isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('tasks.pagination.nextPage')}
                >
                  <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <TaskImageDialog
        open={openTaskId !== null}
        task={openTask}
        onOpenChange={(next) => {
          if (!next) setOpenTaskId(null)
        }}
      />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className='flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-center gap-2'>
        <div className='h-4 w-20 animate-pulse rounded-md bg-muted' />
        <div className='h-4 w-16 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='flex gap-2'>
        <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='h-2.5 w-3/4 animate-pulse rounded bg-muted' />
        <div className='h-2.5 w-2/3 animate-pulse rounded bg-muted' />
        <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
        <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
      </div>
      <div className='mt-auto h-8 w-full animate-pulse rounded-md bg-muted' />
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation('assistant')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <ClipboardList className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('tasks.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('tasks.empty.description')}</p>
    </div>
  )
}
