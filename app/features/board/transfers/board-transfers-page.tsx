import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardSessionResDtoOutput } from '~/api/model/board'
import type { TransferRequestListResDtoOutputDataItem } from '~/api/model/transfer'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardTransfersPage({
  requests,
  sessions,
  hasError
}: {
  requests: TransferRequestListResDtoOutputDataItem[]
  sessions: BoardSessionResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  const sign = useFetcher<BoardActionResult>()
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('transfers.title')} description={t('transfers.description')} />
      <BoardPanel title={t('transfers.sign')}>
        <sign.Form method='post' className='grid gap-3 sm:grid-cols-3'>
          <input type='hidden' name='intent' value='sign' />
          <input className={boardInput} name='contractId' placeholder={t('transfers.contractId')} required />
          <input
            className={boardInput}
            name='otpCode'
            minLength={6}
            maxLength={6}
            placeholder={t('contracts.otp')}
            required
          />
          <button className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'>
            {t('transfers.sign')}
          </button>
        </sign.Form>
        <BoardFeedback data={sign.data} />
      </BoardPanel>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {requests.map((item) => (
          <TransferCard key={item.id} item={item} sessions={sessions} />
        ))}
      </div>
      {!requests.length && <EmptyState text={t('transfers.empty')} />}
    </div>
  )
}

function TransferCard({
  item,
  sessions
}: {
  item: TransferRequestListResDtoOutputDataItem
  sessions: BoardSessionResDtoOutput[]
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <article className='rounded-xl border border-border bg-card p-5'>
      <div className='flex justify-between gap-3'>
        <div>
          <strong>{item.seriesId}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {item.proposedType ?? '—'} · {item.requestingMangakaId}
          </p>
        </div>
        <StatusBadge value={item.status} />
      </div>
      <p className='mt-3 text-sm text-muted-foreground'>{item.planDescription}</p>
      {item.status === 'SUBMITTED' && (
        <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-2'>
          <input type='hidden' name='requestId' value={item.id} />
          <select className={boardInput} name='sessionId' required defaultValue=''>
            <option value='' disabled>
              {t('transfers.session')}
            </option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
          <input className={boardInput} name='details' placeholder={t('transfers.details')} />
          <button
            name='intent'
            value='approve'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('transfers.approve')}
          </button>
          <button
            name='intent'
            value='reject'
            className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'
          >
            {t('transfers.reject')}
          </button>
        </fetcher.Form>
      )}{' '}
      {item.status === 'UNDER_REVIEW' && item.originalContractType === 'FULL_BUYOUT' && (
        <fetcher.Form method='post' className='mt-4 grid gap-2 sm:grid-cols-2'>
          <input type='hidden' name='requestId' value={item.id} />
          <select className={boardInput} name='sessionId' required defaultValue=''>
            <option value='' disabled>
              {t('transfers.session')}
            </option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.title}
              </option>
            ))}
          </select>
          <input
            className={boardInput}
            name='valuationAmount'
            type='number'
            min={1}
            placeholder={t('contracts.valuation')}
            required
          />
          <select className={boardInput} name='conditionType' defaultValue='CHAPTER_MILESTONE'>
            <option value='CHAPTER_MILESTONE'>CHAPTER_MILESTONE</option>
            <option value='RECURRING_CHAPTER'>RECURRING_CHAPTER</option>
            <option value='RANKING_MILESTONE'>RANKING_MILESTONE</option>
            <option value='TIME_BOUND'>TIME_BOUND</option>
          </select>
          <input
            className={boardInput}
            name='conditionValue'
            type='number'
            min={1}
            placeholder={t('transfers.conditionValue')}
            required
          />
          <input
            className={boardInput}
            name='conditionDescription'
            placeholder={t('transfers.conditionDescription')}
            required
          />
          <button
            name='intent'
            value='fullBuyout'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('transfers.fullBuyout')}
          </button>
        </fetcher.Form>
      )}
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
