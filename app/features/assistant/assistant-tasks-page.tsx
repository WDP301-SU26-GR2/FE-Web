import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, Filter, RefreshCw } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import { useAssistantTasks } from './hooks/use-assistant-tasks'
import { TaskCard } from './components/task-card'

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
  const {
    items,
    total,
    page,
    perPage,
    isLoading,
    error,
    status,
    setStatus,
    setPage,
    refresh,
    startTask,
    submitTask,
    isMutating
  } = useAssistantTasks()

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <ClipboardList className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('tasks.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('tasks.subtitle')}</p>
        </div>
        <a
          href='/dashboard/assistant'
          className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          {t('tasks.back')}
        </a>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('tasks.filters.status')}</span>
        </div>
        <FilterChip active={status === undefined} onClick={() => setStatus(undefined)} label={t('tasks.filters.all')} />
        {STATUS_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={status === value}
            onClick={() => setStatus(status === value ? undefined : value)}
            label={t(`tasks.filters.statuses.${value}`)}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('tasks.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('tasks.error.retry')}
          </button>
        </div>
      )}

      {/* Card grid */}
      <div className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: perPage }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStart={(id) => void startTask(id)}
                  onSubmit={(id, file) => void submitTask(id, file)}
                  isMutating={isMutating}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={total}
              tKey='tasks'
            />
          </>
        )}
      </div>
    </div>
  )
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}

function Pagination({
  page,
  totalPages,
  setPage,
  from,
  to,
  total,
  tKey
}: {
  page: number
  totalPages: number
  setPage: (p: number) => void
  from: number
  to: number
  total: number
  tKey: 'tasks' | 'studio' | 'invites'
}) {
  const { t } = useTranslation('assistant')
  return (
    <div className='mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row'>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
          aria-label={t(`${tKey}.pagination.previousPage`)}
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type='button'
            onClick={() => setPage(num)}
            className={cn(
              'flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors cursor-pointer',
              page === num
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {num}
          </button>
        ))}
        <button
          type='button'
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
          aria-label={t(`${tKey}.pagination.nextPage`)}
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
      <span className='text-xs text-muted-foreground'>{t(`${tKey}.pagination.showingRange`, { from, to, total })}</span>
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
