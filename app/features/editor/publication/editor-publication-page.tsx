import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertCircle, BookCheck, CalendarClock, CheckCircle2, Clock3, Eye, FileCheck2, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorPublicationData } from '../types'
import { cn } from '~/shared/lib/cn'

const REVIEW_STATUSES = new Set(['EDITOR_REVIEW'])
const APPROVED_STATUSES = new Set(['READY_FOR_PRINT', 'AWAITING_CO_OWNER_APPROVAL'])

const STATUS_META: Record<string, { className: string; dotClassName: string }> = {
  DRAFT: { className: 'border-border bg-muted text-muted-foreground', dotClassName: 'bg-muted-foreground' },
  IN_PRODUCTION: {
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    dotClassName: 'bg-amber-500'
  },
  EDITOR_REVIEW: {
    className: 'border-primary/30 bg-primary/10 text-primary',
    dotClassName: 'bg-primary'
  },
  EDITOR_REVISION: {
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700',
    dotClassName: 'bg-orange-500'
  },
  READY_FOR_PRINT: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    dotClassName: 'bg-emerald-500'
  },
  AWAITING_CO_OWNER_APPROVAL: {
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-700',
    dotClassName: 'bg-violet-500'
  },
  PUBLISHED: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    dotClassName: 'bg-emerald-500'
  }
}

export function EditorPublicationPage({
  data,
  focusReferenceId,
  hasError
}: {
  data: EditorPublicationData | null
  focusReferenceId: string | null
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const chapters = data?.chapters ?? []
  const awaitingReview = prioritizeFocused(
    chapters.filter(({ chapter }) => REVIEW_STATUSES.has(chapter.manuscriptStatus ?? '')),
    focusReferenceId
  )
  const approved = prioritizeFocused(
    chapters.filter(({ chapter }) => APPROVED_STATUSES.has(chapter.manuscriptStatus ?? '')),
    focusReferenceId
  )
  const inProgress = chapters.filter(
    ({ chapter }) =>
      chapter.manuscriptStatus !== 'PUBLISHED' &&
      !REVIEW_STATUSES.has(chapter.manuscriptStatus ?? '') &&
      !APPROVED_STATUSES.has(chapter.manuscriptStatus ?? '')
  )
  const published = chapters.filter(({ chapter }) => chapter.manuscriptStatus === 'PUBLISHED')

  useEffect(() => {
    if (!focusReferenceId) return
    document.getElementById(`publication-chapter-${focusReferenceId}`)?.scrollIntoView({ block: 'center' })
  }, [focusReferenceId])

  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Printer className='size-4' />
          {t('publication.eyebrow')}
        </div>
        <h1 className='mt-2 text-2xl font-bold text-foreground md:text-3xl'>{t('publication.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>{t('publication.subtitle')}</p>
      </header>
      {hasError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
          {t('errors.loadDescription')}
        </div>
      )}
      {!hasError && (
        <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4' aria-label={t('publicationUx.summary')}>
          <SummaryCard
            icon={<AlertCircle className='size-5' />}
            label={t('publicationUx.needsAction')}
            value={awaitingReview.length}
            className='border-primary/25 bg-primary/5 text-primary'
          />
          <SummaryCard
            icon={<FileCheck2 className='size-5' />}
            label={t('publicationUx.approved')}
            value={approved.length}
            className='border-emerald-500/25 bg-emerald-500/5 text-emerald-700'
          />
          <SummaryCard
            icon={<Clock3 className='size-5' />}
            label={t('publicationUx.inProgress')}
            value={inProgress.length}
            className='border-amber-500/25 bg-amber-500/5 text-amber-700'
          />
          <SummaryCard
            icon={<CheckCircle2 className='size-5' />}
            label={t('publication.history')}
            value={published.length}
            className='border-emerald-500/25 bg-emerald-500/5 text-emerald-700'
          />
        </section>
      )}
      <ChapterSection
        title={t('publicationUx.needsAction')}
        description={t('publicationUx.needsActionDescription')}
        items={awaitingReview}
        empty={t('publication.emptyAwaiting')}
        focusReferenceId={focusReferenceId}
      />
      <ChapterSection
        title={t('publicationUx.approved')}
        description={t('publicationUx.approvedDescription')}
        items={approved}
        empty={t('publicationUx.emptyApproved')}
        focusReferenceId={focusReferenceId}
      />
      <ChapterSection
        title={t('publicationUx.inProgress')}
        description={t('publicationUx.inProgressDescription')}
        items={inProgress}
        empty={t('publicationUx.emptyInProgress')}
        focusReferenceId={focusReferenceId}
      />
      <ChapterSection
        title={t('publication.history')}
        description={t('publicationUx.historyDescription')}
        items={published}
        empty={t('publication.emptyHistory')}
        focusReferenceId={focusReferenceId}
      />
    </div>
  )
}

function prioritizeFocused(items: EditorPublicationData['chapters'], focusReferenceId: string | null) {
  return [...items].sort(({ chapter: left }, { chapter: right }) => {
    if (left.id === focusReferenceId) return -1
    if (right.id === focusReferenceId) return 1
    return 0
  })
}

function ChapterSection({
  title,
  description,
  items,
  empty,
  focusReferenceId
}: {
  title: string
  description: string
  items: EditorPublicationData['chapters']
  empty: string
  focusReferenceId: string | null
}) {
  const { t, i18n } = useTranslation('editor')
  return (
    <section className='space-y-3'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-lg font-bold text-foreground'>{title}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>{description}</p>
        </div>
        <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground'>
          {empty}
        </div>
      ) : (
        <div className='divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
          {items.map(({ series, chapter }) => (
            <article
              key={chapter.id}
              id={`publication-chapter-${chapter.id}`}
              className={cn(
                'flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between',
                chapter.id === focusReferenceId && 'bg-primary/10 ring-2 ring-inset ring-primary'
              )}
            >
              <div className='flex items-start gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                  <BookCheck className='size-5' />
                </div>
                <div>
                  <p className='text-xs font-bold text-primary'>{series.title}</p>
                  <h3 className='mt-1 font-bold text-foreground'>
                    {t('publication.chapter', { number: chapter.chapterNumber })}
                    {chapter.title ? ` · ${chapter.title}` : ''}
                  </h3>
                  <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                    <StatusBadge status={chapter.manuscriptStatus ?? chapter.status} />
                    {chapter.schedule?.currentDeadline && (
                      <span className='inline-flex items-center gap-1'>
                        <CalendarClock className='size-3.5' />
                        {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(
                          new Date(chapter.schedule.currentDeadline)
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Link
                to={`/dashboard/editor/publication/${series.id}/${chapter.id}`}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              >
                <Eye className='size-4' />
                {t('actions.review')}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  className
}: {
  icon: ReactNode
  label: string
  value: number
  className: string
}) {
  return (
    <article className={cn('flex items-center gap-3 rounded-xl border p-4', className)}>
      <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/70'>{icon}</div>
      <div>
        <p className='text-2xl font-black leading-none'>{value}</p>
        <p className='mt-1 text-xs font-bold uppercase tracking-wider'>{label}</p>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('editor')
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold',
        meta.className
      )}
    >
      <span className={cn('size-1.5 rounded-full', meta.dotClassName)} />
      {t(`publicationReviewUx.workflow.${status}`)}
    </span>
  )
}
