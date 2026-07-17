import { Form } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardRankingListResDtoOutputItemsItem } from '~/api/model/survey'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardRankingsPage({
  rankings,
  surveyPeriodId,
  hasError
}: {
  rankings: BoardRankingListResDtoOutputItemsItem[]
  surveyPeriodId: string
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('rankings.title')} description={t('rankings.description')} />
      <Form method='get' className='flex gap-2'>
        <input
          className={boardInput}
          name='surveyPeriodId'
          defaultValue={surveyPeriodId}
          placeholder={t('rankings.periodId')}
          required
        />
        <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          {t('common.load')}
        </button>
      </Form>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='overflow-hidden rounded-xl border border-border bg-card'>
        <div className='grid grid-cols-[70px_1fr_90px_110px] gap-3 border-b border-border p-3 text-xs font-bold uppercase text-muted-foreground'>
          <span>#</span>
          <span>{t('rankings.series')}</span>
          <span>{t('rankings.votes')}</span>
          <span>{t('rankings.risk')}</span>
        </div>
        {rankings.map((item) => (
          <div
            key={item.seriesId}
            className='grid grid-cols-[70px_1fr_90px_110px] items-center gap-3 border-b border-border p-3 text-sm last:border-0'
          >
            <strong>{item.rankPosition ?? '—'}</strong>
            <span className='truncate'>{item.seriesId}</span>
            <span>{item.voteCount}</span>
            <StatusBadge value={item.riskLevel} />
          </div>
        ))}
      </div>
      {surveyPeriodId && !rankings.length && <EmptyState text={t('rankings.empty')} />}
    </div>
  )
}
