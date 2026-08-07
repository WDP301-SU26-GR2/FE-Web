import { Form, useFetcher } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, Loader2, UserRound, XCircle } from 'lucide-react'
import { Pagination } from '~/shared/components'
import {
  BoardActionDialog,
  boardDialogButton,
  boardInput,
  BoardFeedback,
  BoardHeader,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'

const BOARD_LIST_PAGE_SIZE = 8
const deadlineResolveFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-bold text-foreground'
const deadlineResolveFieldLabelClass = 'flex min-h-10 items-end leading-5'

export function BoardDeadlinesPage({
  requests,
  series,
  chapters,
  seriesId,
  chapterId,
  hasError
}: {
  requests: DeadlineRequestResDtoOutput[]
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  seriesId: string
  chapterId: string
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(requests.length / BOARD_LIST_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const from = requests.length === 0 ? 0 : (currentPage - 1) * BOARD_LIST_PAGE_SIZE + 1
  const to = Math.min(currentPage * BOARD_LIST_PAGE_SIZE, requests.length)
  const paginatedRequests = requests.slice(from > 0 ? from - 1 : 0, to)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('deadlines.title')}
        description={t('deadlines.description')}
        backHref='/dashboard/board/operations'
      />

      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='mb-4'>
          <h2 className='text-sm font-bold text-foreground'>{t('deadlines.queueTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('deadlines.queueHint')}</p>
        </div>
        <Form method='get' replace preventScrollReset className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <select className={boardInput} name='seriesId' defaultValue={seriesId}>
            <option value=''>{t('deadlines.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select className={boardInput} name='chapterId' defaultValue={chapterId} disabled={!seriesId}>
            <option value=''>{t('deadlines.selectChapter')}</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {t('deadlines.chapterOption', { number: item.chapterNumber, title: item.title || '' })}
              </option>
            ))}
          </select>
          <button className={`${boardDialogButton} bg-primary text-primary-foreground`}>
            {t('common.load')}
          </button>
        </Form>
      </section>

      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive'>
          {t('common.loadError')}
        </p>
      )}

      {chapterId && requests.length > 0 && (
        <div className='flex items-center justify-between gap-3'>
          <h2 className='text-sm font-bold text-foreground'>{t('deadlines.pendingTitle')}</h2>
          <span className='rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary'>
            {t('deadlines.pendingCount', { count: requests.length })}
          </span>
        </div>
      )}
      <div className='grid gap-4'>
        {paginatedRequests.map((item) => (
          <DeadlineCard key={item.id} item={item} />
        ))}
      </div>
      {requests.length > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          setPage={setPage}
          from={from}
          to={to}
          total={requests.length}
          tKeyPrefix='pagination'
          t={t}
        />
      )}
      {!chapterId && <EmptyState text={t('deadlines.selectHint')} />}
      {seriesId && chapterId && !requests.length && <EmptyState text={t('deadlines.empty')} />}
    </div>
  )
}

function DeadlineCard({ item }: { item: DeadlineRequestResDtoOutput }) {
  const { t, i18n } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const canResolve = item.status === 'BOARD_REVIEW' || item.status === 'ESCALATED'
  const isSubmitting = fetcher.state !== 'idle'

  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='text-xs font-bold text-foreground'>
            {item.series?.title ?? t('deadlines.unknownSeries')} ·{' '}
            {item.chapter
              ? t('deadlines.chapterOption', {
                  number: item.chapter.chapterNumber,
                  title: item.chapter.title || ''
                })
              : t('deadlines.unknownChapter')}
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t('deadlines.createdAt', { date: formatDate(item.createdAt, i18n.language) })}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>

      <dl className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <DeadlineDetail
          icon={Clock3}
          label={t('deadlines.currentDeadline')}
          value={formatDate(item.currentDeadline, i18n.language)}
        />
        <DeadlineDetail
          icon={CalendarRange}
          label={t('deadlines.requestedDeadline')}
          value={formatDate(item.requestedDeadline, i18n.language)}
        />
        <DeadlineDetail
          icon={UserRound}
          label={t('deadlines.requestedBy')}
          value={t(`deadlines.parties.${item.requestedBy ?? 'UNKNOWN'}`)}
        />
        <DeadlineDetail
          icon={UserRound}
          label={t('deadlines.lastProposedBy')}
          value={t(`deadlines.parties.${item.lastProposedBy ?? 'UNKNOWN'}`)}
        />
      </dl>

      <div className='mt-3 rounded-lg border border-border bg-muted/30 p-3'>
        <p className='text-xs font-bold text-foreground'>{t('deadlines.reason')}</p>
        <p className='mt-1 whitespace-pre-wrap text-xs text-muted-foreground'>{item.reason || '—'}</p>
      </div>

      <p
        className={`mt-3 flex items-center gap-2 rounded-lg border p-3 text-xs font-medium ${
          item.affectsSlot ? 'border-warning/30 bg-warning/10 text-warning' : 'border-info/30 bg-info/10 text-info'
        }`}
      >
        <AlertTriangle className='size-4 shrink-0' aria-hidden='true' />
        {item.affectsSlot ? t('deadlines.affectsSlot') : t('deadlines.escalatedWithoutSlot')}
      </p>

      {canResolve && (
        <div className='mt-4 flex justify-end'>
          <BoardActionDialog title={t('deadlines.resolve')}>
            <p className='mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning'>
              {t('deadlines.resolveWarning')}
            </p>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='requestId' value={item.id} />
              <label className={deadlineResolveFieldClass}>
                <span className={deadlineResolveFieldLabelClass}>{t('deadlines.note')}</span>
                <textarea
                  className='min-h-24 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground'
                  name='note'
                  maxLength={1000}
                  placeholder={t('deadlines.notePlaceholder')}
                />
              </label>
              <div className='grid gap-2 sm:grid-cols-2'>
                <button
                  name='intent'
                  value='approve'
                  disabled={isSubmitting}
                  className={`${boardDialogButton} bg-success text-success-foreground hover:opacity-90 disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                  ) : (
                    <CheckCircle2 className='size-4' aria-hidden='true' />
                  )}
                  {t('deadlines.approve')}
                </button>
                <button
                  name='intent'
                  value='reject'
                  disabled={isSubmitting}
                  className={`${boardDialogButton} border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50`}
                >
                  {isSubmitting ? (
                    <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                  ) : (
                    <XCircle className='size-4' aria-hidden='true' />
                  )}
                  {t('deadlines.reject')}
                </button>
              </div>
              <BoardFeedback data={fetcher.data} />
            </fetcher.Form>
          </BoardActionDialog>
        </div>
      )}
    </article>
  )
}

function DeadlineDetail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border p-3'>
      <dt className='flex items-center gap-2 text-xs text-muted-foreground'>
        <Icon className='size-3.5' aria-hidden='true' />
        {label}
      </dt>
      <dd className='mt-1 text-xs font-bold text-foreground'>{value}</dd>
    </div>
  )
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale)
}
