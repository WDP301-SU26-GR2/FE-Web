import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye
} from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'

type SeriesStatus = 'ONGOING' | 'PUBLISHED' | 'HIATUS' | 'CANCELLED' | 'PROPOSAL'

interface SeriesRow {
  id: string
  seriesName: string
  title: string
  status: SeriesStatus
  chapters: number
  createdAt: string
  gradient: string
  initials: string
}

// Mock data matching the design image layout
const MOCK_SERIES: SeriesRow[] = [
  {
    id: '1',
    seriesName: 'Neon Genesis: Rebirth',
    title: 'Neon Genesis: Rebirth',
    status: 'ONGOING',
    chapters: 42,
    createdAt: 'Mar 15, 2026',
    gradient: 'from-blue-600 to-indigo-700',
    initials: 'NG'
  },
  {
    id: '2',
    seriesName: 'The Silent Weaver',
    title: 'The Silent Weaver',
    status: 'ONGOING',
    chapters: 18,
    createdAt: 'Jan 10, 2026',
    gradient: 'from-purple-600 to-pink-700',
    initials: 'SW'
  },
  {
    id: '3',
    seriesName: 'Shadow Protocol',
    title: 'Shadow Protocol',
    status: 'PUBLISHED',
    chapters: 3,
    createdAt: 'Nov 5, 2025',
    gradient: 'from-neutral-700 to-slate-900',
    initials: 'SP'
  },
  {
    id: '4',
    seriesName: 'Eternal Eclipse',
    title: 'Eternal Eclipse',
    status: 'HIATUS',
    chapters: 24,
    createdAt: 'Aug 22, 2025',
    gradient: 'from-amber-600 to-orange-800',
    initials: 'EE'
  }
]

const STATUS_STYLES: Record<SeriesStatus, string> = {
  ONGOING: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  PUBLISHED: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  HIATUS: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  PROPOSAL: 'bg-primary/10 text-primary border-primary/20'
}

const STATUS_LABELS: Record<SeriesStatus, string> = {
  ONGOING: 'ONGOING',
  PUBLISHED: 'PUBLISHED',
  HIATUS: 'HIATUS',
  CANCELLED: 'CANCELLED',
  PROPOSAL: 'PROPOSAL'
}

interface PaginationInfo {
  total: number
  page: number
  perPage: number
  totalPages: number
}

export function MySeriesPage() {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const pagination: PaginationInfo = {
    total: MOCK_SERIES.length,
    page: currentPage,
    perPage: 5,
    totalPages: Math.ceil(MOCK_SERIES.length / 5)
  }

  const handleMenuToggle = (id: string) => {
    setActiveMenu(activeMenu === id ? null : id)
  }

  const pageNumbers = Array.from({ length: pagination.totalPages }, (_, i) => i + 1)

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

      {/* Stats Cards Row */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.activeSeries')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>2</span>
          <span className='text-xs text-muted-foreground'>Neon Genesis, The Silent Weaver</span>
        </div>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.published')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>3</span>
          <span className='text-xs text-muted-foreground'>Shadow Protocol + 2 more</span>
        </div>
        <div className='flex flex-col gap-1 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.hiatus')}
          </span>
          <span className='text-3xl font-extrabold tracking-tight text-foreground'>1</span>
          <span className='text-xs text-muted-foreground'>Eternal Eclipse</span>
        </div>
      </div>

      {/* Series Table */}
      <div className='rounded-xl border border-border bg-card shadow-sm'>
        {/* Table Header */}
        <div className='grid grid-cols-12 gap-4 border-b border-border px-5 py-3'>
          <div className='col-span-4 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.series')}
          </div>
          <div className='col-span-2 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.status')}
          </div>
          <div className='col-span-1 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.chapters')}
          </div>
          <div className='col-span-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.createdAt')}
          </div>
          <div className='col-span-2 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('mySeries.action')}
          </div>
        </div>

        {/* Table Rows */}
        <div className='divide-y divide-border'>
          {MOCK_SERIES.map((series) => (
            <div
              key={series.id}
              className='group grid grid-cols-12 items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40'
            >
              {/* Series Name + Cover */}
              <div className='col-span-4 flex items-center gap-3'>
                <div
                  className={cn(
                    'flex h-10 w-8 shrink-0 items-center justify-center rounded bg-gradient-to-br font-extrabold text-[10px] text-white shadow-sm',
                    series.gradient
                  )}
                >
                  {series.initials}
                </div>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-semibold'>{series.seriesName}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className='col-span-2'>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    STATUS_STYLES[series.status]
                  )}
                >
                  {STATUS_LABELS[series.status]}
                </span>
              </div>

              {/* Chapters */}
              <div className='col-span-1'>
                <span className='text-sm font-semibold'>{series.chapters}</span>
              </div>

              {/* Created At */}
              <div className='col-span-3'>
                <span className='text-sm text-muted-foreground'>{series.createdAt}</span>
              </div>

              {/* Action Menu */}
              <div className='col-span-2 flex justify-end'>
                <div className='relative'>
                  <button
                    onClick={() => handleMenuToggle(series.id)}
                    className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer'
                    aria-label='Series actions'
                  >
                    <MoreHorizontal className='h-4 w-4' />
                  </button>

                  {activeMenu === series.id && (
                    <>
                      <div
                        className='fixed inset-0 z-10'
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className='absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-border bg-card shadow-lg'>
                        <div className='p-1'>
                          <button className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer'>
                            <Eye className='h-4 w-4 text-muted-foreground' />
                            <span>{t('mySeries.view')}</span>
                          </button>
                          <button className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer'>
                            <Pencil className='h-4 w-4 text-muted-foreground' />
                            <span>{t('mySeries.edit')}</span>
                          </button>
                          <button className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/5 cursor-pointer'>
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
          ))}
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between border-t border-border px-5 py-4'>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
              aria-label='Previous page'
            >
              <ChevronLeft className='h-4 w-4' />
            </button>

            {pageNumbers.map((num) => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={cn(
                  'flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors cursor-pointer',
                  currentPage === num
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
              className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
              aria-label='Next page'
            >
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>

          <span className='text-xs text-muted-foreground'>
            {t('mySeries.showing')} {MOCK_SERIES.length} {t('mySeries.of')} {MOCK_SERIES.length} {t('mySeries.series')}
          </span>
        </div>
      </div>
    </div>
  )
}
