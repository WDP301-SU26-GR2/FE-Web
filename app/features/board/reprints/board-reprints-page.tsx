import { Form, useFetcher } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import { BoardActionDialog, boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardReprintsPage({
  requests,
  hasError,
  seriesId
}: {
  requests: ReprintRequestResDtoOutput[]
  hasError: boolean
  seriesId: string
}) {
  const { t } = useTranslation('board')
  const [status, setStatus] = useState('')
  const statuses = [...new Set(requests.map((item) => item.status))]
  const filteredRequests = requests.filter((item) => !status || item.status === status)
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('reprints.title')} description={t('reprints.description')} />
      <BoardPanel title={t('reprints.lookup')}>
        <Form method='get' className='flex flex-col gap-3 sm:flex-row'>
          <input className={boardInput} name='seriesId' defaultValue={seriesId} placeholder={t('reprints.seriesId')} required />
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>{t('common.load')}</button>
        </Form>
      </BoardPanel>
      <select className={boardInput} value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value=''>{t('filters.allReprintStatuses')}</option>
        {statuses.map((value) => <option key={value} value={value}>{t(`filters.reprintStatuses.${value}`, { defaultValue: value })}</option>)}
      </select>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {filteredRequests.map((item) => (
          <ReprintCard key={item.id} item={item} />
        ))}
      </div>
      {!filteredRequests.length && <EmptyState text={t('reprints.empty')} />}
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
          <strong>{item.series?.title ?? item.seriesId}</strong>
          {item.requester ? <p className='mt-1 text-xs text-muted-foreground'>{item.requester.displayName}</p> : null}
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.revisionMode} · {item.chapterRangeStart}-{item.chapterRangeEnd}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.reason}</p>
      {canReview && (
        <div className='mt-4'>
        <BoardActionDialog title={t('reprints.review')}>
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
        <BoardFeedback data={fetcher.data} />
        </BoardActionDialog>
        </div>
      )}
    </article>
  )
}
