import { memo, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { AlertCircle, BookCheck, CalendarClock, CheckCircle2, Clock3, Eye, FileCheck2, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorPublicationData } from '../types'
import { cn } from '~/shared/lib/cn'
import { getPublicationGroupForStatus, groupPublicationItemsBySeries } from './publication-grouping'

const REVIEW_STATUSES = new Set(['EDITOR_REVIEW'])
const APPROVED_STATUSES = new Set(['READY_FOR_PRINT', 'AWAITING_CO_OWNER_APPROVAL'])

const STATUS_META: Record<string, { className: string; dotClassName: string }> = {
  DRAFT: { className: 'border-border bg-muted text-muted-foreground', dotClassName: 'bg-muted-foreground' },
  IN_PRODUCTION: {
    className: 'border-warning/30 bg-warning/10 text-warning',
    dotClassName: 'bg-warning'
  },
  EDITOR_REVIEW: {
    className: 'border-primary/30 bg-primary/10 text-primary',
    dotClassName: 'bg-primary'
  },
  EDITOR_REVISION: {
    className: 'border-warning/30 bg-warning/10 text-warning',
    dotClassName: 'bg-warning'
  },
  READY_FOR_PRINT: {
    className: 'border-success/30 bg-success/10 text-success',
    dotClassName: 'bg-success'
  },
  AWAITING_CO_OWNER_APPROVAL: {
    className: 'border-info/30 bg-info/10 text-info',
    dotClassName: 'bg-info'
  },
  PUBLISHED: {
    className: 'border-success/30 bg-success/10 text-success',
    dotClassName: 'bg-success'
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
  const [search, setSearch] = useState('')
  const [activeGroup, setActiveGroup] = useState<'review' | 'approved' | 'progress' | 'history'>(() => 'progress')
  const {
    awaitingReview,
    approved,
    inProgress,
    published,
    reviewGroups,
    approvedGroups,
    progressGroups,
    historyGroups
  } = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const chapters = (data?.chapters ?? []).filter(
      ({ series, chapter }) =>
        !normalizedSearch ||
        `${series.title} ${chapter.title ?? ''} ${chapter.chapterNumber}`.toLowerCase().includes(normalizedSearch)
    )
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
    return {
      awaitingReview,
      approved,
      inProgress,
      published,
      reviewGroups: groupPublicationItemsBySeries(awaitingReview),
      approvedGroups: groupPublicationItemsBySeries(approved),
      progressGroups: groupPublicationItemsBySeries(inProgress),
      historyGroups: groupPublicationItemsBySeries(published)
    }
  }, [data?.chapters, focusReferenceId, search])

  useEffect(() => {
    if (!focusReferenceId) return
    // Align the visible tab with a deep-linked chapter after loader data changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveGroup(groupForReference(data?.chapters ?? [], focusReferenceId))
  }, [data?.chapters, focusReferenceId])

  useEffect(() => {
    if (!focusReferenceId) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`publication-chapter-${focusReferenceId}`)?.scrollIntoView({ block: 'center' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [focusReferenceId])

  return (
    <div className='space-y-6 pb-12'>
      <header>
        <div className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <Printer className='size-4' />
          {t('publication.eyebrow')}
        </div>
        <h1 className='mt-2 text-xl font-bold text-foreground md:text-2xl'>{t('publication.title')}</h1>
        <p className='mt-2 max-w-3xl text-xs leading-6 text-muted-foreground'>{t('publication.subtitle')}</p>
      </header>
      {hasError && (
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>
          {t('errors.loadDescription')}
        </div>
      )}
      <input
        className='h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('filters.searchPublication')}
      />
      {!hasError && (
        <section className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4' aria-label={t('publicationUx.summary')}>
          <SummaryCard
            icon={<Clock3 className='size-5' />}
            label={t('publicationUx.inProgress')}
            value={inProgress.length}
            className='border-warning/25 bg-warning/5 text-warning'
            active={activeGroup === 'progress'}
            onClick={() => setActiveGroup('progress')}
          />
          <SummaryCard
            icon={<AlertCircle className='size-5' />}
            label={t('publicationUx.needsAction')}
            value={awaitingReview.length}
            className='border-primary/25 bg-primary/5 text-primary'
            active={activeGroup === 'review'}
            onClick={() => setActiveGroup('review')}
          />
          <SummaryCard
            icon={<FileCheck2 className='size-5' />}
            label={t('publicationUx.approved')}
            value={approved.length}
            className='border-success/25 bg-success/5 text-success'
            active={activeGroup === 'approved'}
            onClick={() => setActiveGroup('approved')}
          />
          <SummaryCard
            icon={<CheckCircle2 className='size-5' />}
            label={t('publication.history')}
            value={published.length}
            className='border-success/25 bg-success/5 text-success'
            active={activeGroup === 'history'}
            onClick={() => setActiveGroup('history')}
          />
        </section>
      )}
      {activeGroup === 'review' && (
        <ChapterSection
          title={t('publicationUx.needsAction')}
          description={t('publicationUx.needsActionDescription')}
          items={reviewGroups}
          empty={t('publication.emptyAwaiting')}
          focusReferenceId={focusReferenceId}
        />
      )}
      {activeGroup === 'approved' && (
        <ChapterSection
          title={t('publicationUx.approved')}
          description={t('publicationUx.approvedDescription')}
          items={approvedGroups}
          empty={t('publicationUx.emptyApproved')}
          focusReferenceId={focusReferenceId}
        />
      )}
      {activeGroup === 'progress' && (
        <ChapterSection
          title={t('publicationUx.inProgress')}
          description={t('publicationUx.inProgressDescription')}
          items={progressGroups}
          empty={t('publicationUx.emptyInProgress')}
          focusReferenceId={focusReferenceId}
        />
      )}
      {activeGroup === 'history' && (
        <ChapterSection
          title={t('publication.history')}
          description={t('publicationUx.historyDescription')}
          items={historyGroups}
          empty={t('publication.emptyHistory')}
          focusReferenceId={focusReferenceId}
        />
      )}
    </div>
  )
}

function groupForReference(
  items: EditorPublicationData['chapters'],
  focusReferenceId: string | null
): 'review' | 'approved' | 'progress' | 'history' {
  const focused = items.find(({ chapter }) => chapter.id === focusReferenceId)?.chapter
  if (!focused) return 'review'
  return getPublicationGroupForStatus(focused.manuscriptStatus)
}

function prioritizeFocused(items: EditorPublicationData['chapters'], focusReferenceId: string | null) {
  return [...items].sort(({ chapter: left }, { chapter: right }) => {
    if (left.id === focusReferenceId) return -1
    if (right.id === focusReferenceId) return 1
    return 0
  })
}

const ChapterSection = memo(function ChapterSection({
  title,
  description,
  items,
  empty,
  focusReferenceId
}: {
  title: string
  description: string
  items: ReturnType<typeof groupPublicationItemsBySeries>
  empty: string
  focusReferenceId: string | null
}) {
  const { t, i18n } = useTranslation('editor')
  const itemCount = items.reduce((total, group) => total + group.chapters.length, 0)

  return (
    <section className='space-y-3'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h2 className='text-base font-bold text-foreground'>{title}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
        </div>
        <span className='rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground'>{itemCount}</span>
      </div>
      {itemCount === 0 ? (
        <div className='rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground'>
          {empty}
        </div>
      ) : (
        <div className='space-y-4'>
          {items.map(({ series, chapters }) => (
            <div key={series.id} className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
              <div className='border-b border-border bg-muted/30 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('publication.series')}</p>
                    <h3 className='mt-1 text-sm font-bold text-foreground'>{series.title}</h3>
                  </div>
                  <span className='rounded-full bg-background px-3 py-1 text-xs font-bold text-muted-foreground'>
                    {chapters.length} {t('publication.chapterCount')}
                  </span>
                </div>
              </div>
              <div className='divide-y divide-border'>
                {chapters.map(({ chapter }) => (
                  <article
                    key={chapter.id}
                    id={`publication-chapter-${chapter.id}`}
                    className={cn(
                      'flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center md:justify-between',
                      chapter.id === focusReferenceId && 'bg-primary/10 ring-2 ring-inset ring-primary'
                    )}
                  >
                    <div className='flex min-w-0 items-start gap-3'>
                      <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <BookCheck className='size-5' />
                      </div>
                      <div className='min-w-0'>
                        <h4 className='font-bold text-foreground'>
                          {t('publication.chapter', { number: chapter.chapterNumber })}
                          {chapter.title ? ` · ${chapter.title}` : ''}
                        </h4>
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
                      className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 md:w-auto'
                    >
                      <Eye className='size-4' />
                      {t('actions.review')}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
})

const SummaryCard = memo(function SummaryCard({
  icon,
  label,
  value,
  className,
  active,
  onClick
}: {
  icon: ReactNode
  label: string
  value: number
  className: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
        className,
        active && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-background/70'>{icon}</div>
      <div className='min-w-0'>
        <p className='text-xl font-black leading-none'>{value}</p>
        <p className='mt-1 text-xs font-bold uppercase tracking-wider'>{label}</p>
      </div>
    </button>
  )
})

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
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
})
