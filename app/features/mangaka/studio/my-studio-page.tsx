import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, Filter, Users, Briefcase } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import { AssignmentCard } from '~/features/mangaka/assistants/components/assignment-card'
import { useMyStudioAssignments } from './use-my-studio-assignments'

const STATUS_FILTERS: ReadonlyArray<StudioControllerListAssignmentsStatus> = ['ACTIVE', 'COMPLETED', 'TERMINATED']

/**
 * Studio page — Mangaka-facing list of studio assignments (their hires).
 *
 * Composition (top → bottom):
 *  1. Header (title + subtitle + CTA "Open assistant directory")
 *  2. Status filter chips (All / ACTIVE / COMPLETED / TERMINATED)
 *  3. Card grid (responsive: 1/2/3 columns)
 *  4. Pagination footer (1-based page numbers + showing-range)
 *  5. Empty / error states inline
 *
 * Each card is hydrated with the assistant profile from a parallel
 * `GET /assistants` pool (handled inside `useMyStudioAssignments`) so we
 * can show displayName/avatar/specializations without n+1 round trips.
 */
export function MyStudioPage() {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()

  const { items, total, page, perPage, isLoading, error, status, setStatus, setPage, refresh } = useMyStudioAssignments()

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Briefcase className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('myStudio.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('myStudio.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/dashboard/mangaka/assistants')}
          className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted cursor-pointer'
        >
          <Users className='h-3.5 w-3.5' />
          <span>{t('myStudio.empty.goToDirectory')}</span>
        </button>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('myStudio.filters.status')}</span>
        </div>
        <button
          type='button'
          onClick={() => setStatus(undefined)}
          aria-pressed={status === undefined}
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            status === undefined
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
        >
          {t('myStudio.filters.all')}
        </button>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => setStatus(status === value ? undefined : value)}
            aria-pressed={status === value}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
              status === value
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {t(`myStudio.status.${value}`)}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('myStudio.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            {t('myStudio.error.retry')}
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
          <EmptyState onBrowse={() => navigate('/dashboard/mangaka/assistants')} />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {items.map(({ assignment, assistant }) => (
                <AssignmentCard key={assignment.id} assignment={assignment} assistant={assistant} />
              ))}
            </div>

            {/* Pagination */}
            <div className='mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('myStudio.pagination.previousPage')}
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type='button'
                    onClick={() => setPage(num)}
                    disabled={isLoading}
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
                  disabled={page === totalPages || isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('myStudio.pagination.nextPage')}
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
              <span className='text-xs text-muted-foreground'>
                {t('myStudio.pagination.showingRange', { from, to, total })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className='flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='h-12 w-12 animate-pulse rounded-full bg-muted' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-2/3 animate-pulse rounded bg-muted' />
          <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
        </div>
      </div>
      <div className='flex gap-2'>
        <div className='h-5 w-16 animate-pulse rounded-full bg-muted' />
        <div className='h-5 w-20 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='flex gap-1.5'>
        <div className='h-4 w-16 animate-pulse rounded-full bg-muted' />
        <div className='h-4 w-12 animate-pulse rounded-full bg-muted' />
        <div className='h-4 w-20 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='mt-auto flex items-center justify-between border-t border-border pt-3'>
        <div className='h-2.5 w-24 animate-pulse rounded bg-muted' />
        <div className='h-3 w-16 animate-pulse rounded bg-muted' />
      </div>
    </div>
  )
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Briefcase className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('myStudio.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('myStudio.empty.description')}</p>
      <button
        type='button'
        onClick={onBrowse}
        className='mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
      >
        <Users className='h-4 w-4' />
        <span>{t('myStudio.empty.goToDirectory')}</span>
      </button>
    </div>
  )
}