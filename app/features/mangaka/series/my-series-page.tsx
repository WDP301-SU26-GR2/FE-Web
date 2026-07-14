import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, MoreHorizontal, Pencil, Trash2, Eye, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { SeriesListResDtoOutputItemsItemStatus } from '~/api/model/series'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { useSeriesList } from './use-series-list'

// ─── Status metadata ──────────────────────────────────────────────────────────

type SeriesStatus = (typeof SeriesListResDtoOutputItemsItemStatus)[keyof typeof SeriesListResDtoOutputItemsItemStatus]

type StatusMeta = {
  className: string
}

const STATUS_META: Record<SeriesStatus, StatusMeta> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  IN_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  READY_TO_PITCH: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  PITCHED: { className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  SERIALIZED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  HIATUS: { className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  COMPLETING: { className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  CANCELLING: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  COMPLETED: { className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  CANCELLED: { className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  REJECTED: { className: 'bg-rose-600/10 text-rose-600 border-rose-600/20' },
  ABANDONED: { className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
  WITHDRAWN: { className: 'bg-stone-500/10 text-stone-500 border-stone-500/20' }
}

// ─── Cover placeholder palette ─────────────────────────────────────────────────

const COVER_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-neutral-700 to-slate-900',
  'from-amber-600 to-orange-800',
  'from-emerald-600 to-teal-800',
  'from-sky-600 to-cyan-800'
] as const

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]
}

function getInitials(title: string): string {
  const cleaned = title.trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatCreatedAt(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MySeriesPage() {
  const { t, i18n } = useTranslation('mangaka')
  const navigate = useNavigate()
  const { items, total, page, perPage, isLoading, error, setPage, refresh } = useSeriesList()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  // Stats derived from the current page (API list does not return aggregate counts).
  // Per the FE-API-Guide and the user's choice, only the page is in memory.
  const activeCount = items.filter((i) => ['DRAFT', 'IN_REVIEW', 'READY_TO_PITCH'].includes(i.status)).length
  const publishedCount = items.filter((i) => ['PITCHED', 'SERIALIZED', 'COMPLETED'].includes(i.status)).length
  const hiatusCount = items.filter((i) => i.status === 'HIATUS').length

  const activeTitles = items
    .filter((i) => ['DRAFT', 'IN_REVIEW', 'READY_TO_PITCH'].includes(i.status))
    .slice(0, 2)
    .map((i) => i.title)
  const publishedTitles = items
    .filter((i) => ['PITCHED', 'SERIALIZED', 'COMPLETED'].includes(i.status))
    .slice(0, 3)
    .map((i) => i.title)
  const hiatusTitles = items
    .filter((i) => i.status === 'HIATUS')
    .slice(0, 2)
    .map((i) => i.title)

  const handleMenuToggle = (id: string) => {
    setActiveMenu(activeMenu === id ? null : id)
  }

  const handleView = (id: string) => {
    setActiveMenu(null)
    // TODO: wire to real series detail route once it exists.
    navigate(`/dashboard/series/${id}`)
  }

  const statusLabel = (status: SeriesStatus): string => {
    const key = `mySeries.statuses.${status}`
    const translated = i18n.exists(key) ? t(key) : null
    return translated ?? status
  }

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>{t('mySeries.title')}</h1>
          <p className='mt-1 text-sm text-muted-foreground'>{t('mySeries.subtitle')}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            onClick={() => navigate('/dashboard/series/propose')}
            className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
          >
            <Pencil className='h-4 w-4' />
            <span>{t('mySeries.proposeNewSeries')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row — derived from items on current page only */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.activeSeries')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>{activeCount}</span>
          <span className='truncate text-xs text-muted-foreground'>
            {activeTitles.length > 0 ? activeTitles.join(', ') : '—'}
          </span>
        </div>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.published')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>{publishedCount}</span>
          <span className='truncate text-xs text-muted-foreground'>
            {publishedTitles.length > 0 ? publishedTitles.join(', ') : '—'}
          </span>
        </div>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.hiatus')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>{hiatusCount}</span>
          <span className='truncate text-xs text-muted-foreground'>
            {hiatusTitles.length > 0 ? hiatusTitles.join(', ') : '—'}
          </span>
        </div>
      </div>
      <p className='-mt-3 text-[11px] italic text-muted-foreground'>{t('mySeries.stats.scopeNote')}</p>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('mySeries.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            {t('mySeries.error.retry')}
          </button>
        </div>
      )}

      {/* Series Table */}
      <div className='rounded-xl border border-border bg-card shadow-sm'>
        {/* Table Header */}
        <div className='grid grid-cols-12 gap-4 border-b border-border px-5 py-3'>
          <div className='col-span-6 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.series')}
          </div>
          <div className='col-span-2 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.status')}
          </div>
          <div className='col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.createdAt')}
          </div>
          <div className='col-span-1 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.action')}
          </div>
        </div>

        {/* Table Body */}
        <div className='divide-y divide-border'>
          {isLoading ? (
            <SkeletonRows count={perPage} />
          ) : items.length === 0 ? (
            <EmptyState
              onPropose={() => navigate('/dashboard/series/propose')}
              proposeLabel={t('mySeries.proposeNewSeries')}
            />
          ) : (
            items.map((series) => {
              const meta = STATUS_META[series.status] ?? STATUS_META.DRAFT
              return (
                <div
                  key={series.id}
                  className='group grid grid-cols-12 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40'
                >
                  {/* Series Name + Cover */}
                  <div className='col-span-6 flex items-center gap-3'>
                    <div
                      className={cn(
                        'flex h-10 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br font-extrabold text-[10px] text-white shadow-sm',
                        pickGradient(series.id)
                      )}
                    >
                      {getInitials(series.title)}
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>{series.title}</p>
                      {series.genres.length > 0 && (
                        <p className='truncate text-xs text-muted-foreground'>{series.genres.join(' · ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className='col-span-2'>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                        meta.className
                      )}
                    >
                      {statusLabel(series.status)}
                    </span>
                  </div>

                  {/* Created At */}
                  <div className='col-span-3'>
                    <span className='text-sm text-muted-foreground'>
                      {formatCreatedAt(series.createdAt, i18n.language)}
                    </span>
                  </div>

                  {/* Action Menu */}
                  <div className='col-span-1 flex justify-end'>
                    <div className='relative'>
                      <button
                        onClick={() => handleMenuToggle(series.id)}
                        className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer'
                        aria-label={t('mySeries.actionsMenu')}
                      >
                        <MoreHorizontal className='h-4 w-4' />
                      </button>

                      {activeMenu === series.id && (
                        <>
                          <div className='fixed inset-0 z-10' onClick={() => setActiveMenu(null)} />
                          <div className='absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg'>
                            <div className='p-1'>
                              <button
                                onClick={() => handleView(series.id)}
                                className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer'
                              >
                                <Eye className='h-4 w-4 text-muted-foreground' />
                                <span>{t('mySeries.view')}</span>
                              </button>
                              <button
                                disabled
                                title={t('mySeries.editNotImplemented')}
                                className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-60'
                              >
                                <Pencil className='h-4 w-4' />
                                <span>{t('mySeries.edit')}</span>
                              </button>
                              <button
                                disabled
                                title={t('mySeries.deleteNotImplemented')}
                                className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-60'
                              >
                                <Trash2 className='h-4 w-4' />
                                <span>{t('mySeries.delete')}</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between border-t border-border px-5 py-4'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1 || isLoading}
              className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
              aria-label={t('mySeries.previousPage')}
            >
              <ChevronLeft className='h-4 w-4' />
            </button>

            {pageNumbers.map((num) => (
              <button
                key={num}
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
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages || isLoading}
              className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
              aria-label={t('mySeries.nextPage')}
            >
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>

          <span className='text-xs text-muted-foreground'>
            {t('mySeries.pagination.showingRange', { from, to, total })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className='grid grid-cols-12 items-center gap-4 px-5 py-3.5'>
          <div className='col-span-6 flex items-center gap-3'>
            <div className='h-10 w-8 shrink-0 animate-pulse rounded bg-muted' />
            <div className='flex-1 space-y-1.5'>
              <div className='h-3 w-1/2 animate-pulse rounded bg-muted' />
              <div className='h-2.5 w-1/3 animate-pulse rounded bg-muted' />
            </div>
          </div>
          <div className='col-span-2'>
            <div className='h-5 w-20 animate-pulse rounded-full bg-muted' />
          </div>
          <div className='col-span-3'>
            <div className='h-3 w-24 animate-pulse rounded bg-muted' />
          </div>
          <div className='col-span-1 flex justify-end'>
            <div className='h-8 w-8 animate-pulse rounded-md bg-muted' />
          </div>
        </div>
      ))}
    </>
  )
}

function EmptyState({ onPropose, proposeLabel }: { onPropose: () => void; proposeLabel: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 px-5 py-12 text-center'>
      <Loader2 className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('mySeries.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('mySeries.empty.description')}</p>
      <button
        onClick={onPropose}
        className='mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer'
      >
        <Pencil className='h-4 w-4' />
        <span>{proposeLabel}</span>
      </button>
    </div>
  )
}
