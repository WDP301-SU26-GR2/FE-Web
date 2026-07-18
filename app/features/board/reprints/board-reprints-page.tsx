import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardReprintsPage({
  requests,
  hasError
}: {
  requests: ReprintRequestResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  const create = useFetcher<BoardActionResult>()
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('reprints.title')} description={t('reprints.description')} />
      <BoardPanel title={t('reprints.create')}>
        <create.Form method='post' className='grid gap-3 md:grid-cols-2'>
          <input type='hidden' name='intent' value='create' />
          <input className={boardInput} name='seriesId' placeholder={t('reprints.seriesId')} required />
          <select className={boardInput} name='revisionMode' defaultValue='AS_IS'>
            <option value='AS_IS'>AS_IS</option>
            <option value='WITH_REVISION'>WITH_REVISION</option>
          </select>
          <input
            className={boardInput}
            name='chapterRangeStart'
            type='number'
            min={1}
            placeholder={t('reprints.from')}
            required
          />
          <input
            className={boardInput}
            name='chapterRangeEnd'
            type='number'
            min={1}
            placeholder={t('reprints.to')}
            required
          />
          <textarea
            className={`${boardInput} min-h-24 py-2 md:col-span-2`}
            name='reason'
            placeholder={t('reprints.reason')}
            required
          />
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground md:col-span-2'>
            {t('reprints.create')}
          </button>
        </create.Form>
        <BoardFeedback data={create.data} />
      </BoardPanel>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {requests.map((item) => (
          <ReprintCard key={item.id} item={item} />
        ))}
      </div>
      {!requests.length && <EmptyState text={t('reprints.empty')} />}
    </div>
  )
}

function ReprintCard({ item }: { item: ReprintRequestResDtoOutput }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  const canReview = ['PENDING', 'MANGAKA_APPROVED'].includes(item.status)
  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <div>
          <strong>{item.seriesId}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.revisionMode} · {item.chapterRangeStart}-{item.chapterRangeEnd}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.reason}</p>
      {canReview && (
        <fetcher.Form method='post' className='mt-4 flex flex-wrap gap-2'>
          <input type='hidden' name='requestId' value={item.id} />
          <input className={`${boardInput} max-w-sm`} name='reason' placeholder={t('reprints.reviewReason')} />
          <button
            name='intent'
            value='approve'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('reprints.approve')}
          </button>
          <button
            name='intent'
            value='reject'
            className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'
          >
            {t('reprints.reject')}
          </button>
        </fetcher.Form>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
