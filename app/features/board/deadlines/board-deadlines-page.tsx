import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { BoardActionDialog, boardInput, BoardFeedback, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardDeadlinesPage({
  requests,
  series,
  chapters,
  seriesId,
  chapterId,
  hasError
}: {
  requests: DeadlineRequestListResDtoOutputItemsItem[]
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  seriesId: string
  chapterId: string
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('deadlines.title')} description={t('deadlines.description')} />
      <Form method='get' className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
        <select className={boardInput} name='seriesId' defaultValue={seriesId}>
          <option value=''>{t('deadlines.selectSeries')}</option>
          {series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <select className={boardInput} name='chapterId' defaultValue={chapterId} disabled={!seriesId}>
          <option value=''>{t('deadlines.selectChapter')}</option>
          {chapters.map((item) => (
            <option key={item.id} value={item.id}>{t('deadlines.chapterOption', { number: item.chapterNumber, title: item.title || '' })}</option>
          ))}
        </select>
        <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          {t('common.load')}
        </button>
      </Form>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {requests.map((item) => (
          <DeadlineCard key={item.id} item={item} />
        ))}
      </div>
      {seriesId && chapterId && !requests.length && <EmptyState text={t('deadlines.empty')} />}
    </div>
  )
}

function DeadlineCard({ item }: { item: DeadlineRequestListResDtoOutputItemsItem }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const canResolve = item.status === 'BOARD_REVIEW' || item.status === 'ESCALATED'
  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <strong>{t('deadlines.request')}</strong>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.reason}</p>
      <p className='mt-2 text-xs'>
        {item.currentDeadline ?? '—'} → {item.requestedDeadline ?? '—'}
      </p>
      {canResolve && (
        <div className='mt-4'>
        <BoardActionDialog title={t('deadlines.resolve')}>
        <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]'>
          <input type='hidden' name='requestId' value={item.id} />
          <input className={boardInput} name='note' placeholder={t('deadlines.note')} />
          <button
            name='intent'
            value='approve'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('deadlines.approve')}
          </button>
          <button
            name='intent'
            value='reject'
            className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'
          >
            {t('deadlines.reject')}
          </button>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data} />
        </BoardActionDialog>
        </div>
      )}
    </article>
  )
}
