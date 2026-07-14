import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'

type FilterChipProps = {
  active: boolean
  onClick: () => void
  label: string
  className?: string
}

/**
 * Pill-shaped toggle button used in filter rows (status tabs, role filters…).
 * Pure presentational — the parent owns the "active" state.
 */
export function FilterChip({ active, onClick, label, className }: FilterChipProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:bg-muted',
        className
      )}
    >
      {label}
    </button>
  )
}

type PaginationProps = {
  /** Current 1-based page. */
  page: number
  /** Total number of pages (≥ 1). Caller computes from total + pageSize. */
  totalPages: number
  /** Called with the new 1-based page. Caller owns clamping if it wants. */
  setPage: (page: number) => void
  /** First visible row (1-based) for the "Showing X–Y of Z" text. */
  from: number
  /** Last visible row (1-based). */
  to: number
  /** Total number of rows across all pages. */
  total: number
  /**
   * i18n key prefix for the three strings rendered by Pagination.
   * The component reads `${prefix}.previousPage`, `${prefix}.nextPage` and
   * `${prefix}.showingRange`. Convention: each slice exposes its own
   * `pagination` block under its own namespace (e.g. `tasks.pagination`,
   * `studio.pagination`, `invites.pagination`).
   */
  tKeyPrefix: string
}

/**
 * Generic paginator with prev/next + numbered buttons + "Showing X–Y of Z".
 *
 * Expects the caller to provide translations at `tKeyPrefix.{previousPage,nextPage,showingRange}`.
 * Use `useTranslation` at the parent so the component stays decoupled from a
 * specific namespace.
 */
export function Pagination({ page, totalPages, setPage, from, to, total, tKeyPrefix }: PaginationProps) {
  const { t } = useTranslation()
  const prevLabel = t(`${tKeyPrefix}.previousPage`)
  const nextLabel = t(`${tKeyPrefix}.nextPage`)

  return (
    <div className='mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row'>
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          aria-label={prevLabel}
          className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
          <button
            key={num}
            type='button'
            onClick={() => setPage(num)}
            aria-current={page === num ? 'page' : undefined}
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
          aria-label={nextLabel}
          className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
        >
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
      <span className='text-xs text-muted-foreground'>
        {t(`${tKeyPrefix}.showingRange`, { from, to, total })}
      </span>
    </div>
  )
}