import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookPlus, Calendar, ChevronDown, ChevronRight, ImageIcon, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'

export type PublicationSectionProps = {
  isOwner: boolean
  isLoading: boolean
  error: string | null
  chapters: ChapterListResDtoOutputItemsItem[]
  /** Series the chapters belong to — used to build the workbench URL. */
  seriesId: string
  onRefresh: () => void
  /** Total chapters count label (number of approved names etc). */
  nextChapterNumber: number
  onCreateClick: () => void
}

const CHAPTER_STATUS_META: Record<string, { className: string; labelKey: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border', labelKey: 'DRAFT' },
  IN_PRODUCTION: {
    className: 'bg-warning/10 text-warning border-warning/20',
    labelKey: 'IN_PRODUCTION'
  },
  COMPLETED: {
    className: 'bg-success/10 text-success border-success/20',
    labelKey: 'COMPLETED'
  },
  PUBLISHED: {
    className: 'bg-success/10 text-success border-success/20',
    labelKey: 'PUBLISHED'
  }
}

const MANUSCRIPT_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  IN_PRODUCTION: { className: 'bg-warning/10 text-warning border-warning/20' },
  COMPOSITE_REVIEW: { className: 'bg-info/10 text-info border-info/20' },
  EDITOR_REVIEW: { className: 'bg-info/10 text-info border-info/20' },
  EDITOR_REVISION: { className: 'bg-warning/10 text-warning border-warning/20' },
  READY_FOR_PRINT: { className: 'bg-success/10 text-success border-success/20' },
  AWAITING_CO_OWNER_APPROVAL: {
    className: 'bg-info/10 text-info border-info/20'
  },
  PUBLISHED: { className: 'bg-success/10 text-success border-success/20' }
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Publication section for a series in the production phase (SERIALIZED,
 * HIATUS, COMPLETING, COMPLETED, CANCELLING, CANCELLED).
 *
 * - Lists every chapter for the series in chapterNumber order.
 * - Shows the chapter status, optional manuscript status, deadline, and
 *   "On hold" badge when applicable.
 * - "Create chapter" is visible to the series owner. Chapter-first means
 *   POST /chapters creates the slot before its chapter-scoped Name exists.
 * - Clicking a row opens the focused publication workbench.
 */
export function PublicationSection({
  isOwner,
  isLoading,
  error,
  chapters,
  seriesId,
  onRefresh,
  onCreateClick
}: PublicationSectionProps) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language
  const [collapsed, setCollapsed] = useState(false)

  const totalLabel = useMemo(
    () => t('seriesDetail.publication.count', { count: chapters.length }),
    [chapters.length, t]
  )

  return (
    <section className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <header className='flex items-center justify-between border-b border-border px-5 py-3'>
        <button
          type='button'
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls='publication-section-body'
          className='flex flex-1 items-center gap-2 text-left cursor-pointer'
        >
          <BookPlus className='h-4 w-4 text-muted-foreground' />
          <h2 className='text-sm font-bold uppercase tracking-wider'>{t('seriesDetail.publication.title')}</h2>
          <span className='ml-1 text-xs font-normal text-muted-foreground'>{totalLabel}</span>
          <ChevronDown
            className={cn('ml-1 h-3.5 w-3.5 text-muted-foreground transition-transform', !collapsed && 'rotate-180')}
          />
        </button>
        {isOwner && (
          <button
            type='button'
            onClick={onCreateClick}
            className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
          >
            <BookPlus className='h-3.5 w-3.5' />
            <span>{t('seriesDetail.publication.createButton')}</span>
          </button>
        )}
      </header>

      {!collapsed && (
        <div id='publication-section-body' className='space-y-3 p-5'>
          {isLoading && chapters.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-10 text-muted-foreground'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <p className='text-xs'>{t('seriesDetail.publication.loading')}</p>
            </div>
          ) : error && chapters.length === 0 ? (
            <div className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
              <p>{error}</p>
              <button
                type='button'
                onClick={onRefresh}
                className='mt-2 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-muted cursor-pointer'
              >
                {t('seriesDetail.publication.retry')}
              </button>
            </div>
          ) : chapters.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-10 text-center text-muted-foreground'>
              <ImageIcon className='h-8 w-8 text-muted-foreground/40' />
              <p className='text-sm'>{t('seriesDetail.publication.empty')}</p>
              {isOwner && <p className='text-xs text-muted-foreground/80'>{t('seriesDetail.publication.emptyHint')}</p>}
            </div>
          ) : (
            <ul className='divide-y divide-border overflow-hidden rounded-lg border border-border'>
              {chapters.map((chapter) => (
                <ChapterRow key={chapter.id} chapter={chapter} seriesId={seriesId} locale={locale} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

type ChapterRowProps = {
  chapter: ChapterListResDtoOutputItemsItem
  seriesId: string
  locale: string
}

function ChapterRow({ chapter, seriesId, locale }: ChapterRowProps) {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()
  const workbenchHref = `/publish/${seriesId}/${chapter.id}`

  // Status enums are short literal unions — narrow via string union to keep
  // the lookup maps strict without leaking `as const` keyof types here.
  const statusKey = chapter.status as 'DRAFT' | 'IN_PRODUCTION' | 'COMPLETED' | 'PUBLISHED'
  const statusMeta = CHAPTER_STATUS_META[statusKey] ?? CHAPTER_STATUS_META.DRAFT
  const manuscriptKey =
    (chapter.manuscriptStatus as
      | 'DRAFT'
      | 'IN_PRODUCTION'
      | 'COMPOSITE_REVIEW'
      | 'EDITOR_REVIEW'
      | 'EDITOR_REVISION'
      | 'READY_FOR_PRINT'
      | 'AWAITING_CO_OWNER_APPROVAL'
      | 'PUBLISHED'
      | null) ?? null
  const manuscriptMeta = manuscriptKey ? MANUSCRIPT_STATUS_META[manuscriptKey] : null

  const deadline = chapter.schedule?.currentDeadline ?? chapter.schedule?.originalDeadline ?? null
  const isOnHold = chapter.hold !== null && chapter.hold !== undefined

  return (
    <li>
      <button
        type='button'
        onClick={() => navigate(workbenchHref)}
        className={cn(
          'flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer sm:flex-row sm:items-center sm:justify-between'
        )}
      >
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
              {t('seriesDetail.publication.chapterLabel', { n: chapter.chapterNumber })}
            </span>
            {chapter.title && <span className='truncate text-sm font-semibold text-foreground'>{chapter.title}</span>}
            {isOnHold && (
              <span className='inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning'>
                {t('seriesDetail.publication.onHold')}
              </span>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
            {deadline && (
              <span className='inline-flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                {formatDate(deadline, locale)}
              </span>
            )}
            {chapter.publishedAt && (
              <span className='inline-flex items-center gap-1'>
                {t('seriesDetail.publication.publishedAt', { date: formatDate(chapter.publishedAt, locale) })}
              </span>
            )}
            {typeof chapter.totalPages === 'number' && (
              <span>{t('seriesDetail.publication.pages', { count: chapter.totalPages })}</span>
            )}
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-1.5'>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              statusMeta.className
            )}
          >
            {t(`seriesDetail.publication.chapterStatus.${statusKey}`, statusKey)}
          </span>
          {manuscriptMeta && manuscriptKey && (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                manuscriptMeta.className
              )}
              title={t('seriesDetail.publication.manuscriptStatusTitle')}
            >
              {t(`seriesDetail.publication.manuscriptStatus.${manuscriptKey}`, manuscriptKey)}
            </span>
          )}
          <ChevronRight className='h-3.5 w-3.5 text-muted-foreground' />
        </div>
      </button>
    </li>
  )
}
