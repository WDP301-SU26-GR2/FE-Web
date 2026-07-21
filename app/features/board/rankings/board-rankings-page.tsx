import { Form } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardRankingListResDtoOutputItemsItem } from '~/api/model/survey'
import type { SurveyPeriodResDtoOutput } from '~/api/model/survey'
import { boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardRankingsPage({
  rankings,
  periods,
  seriesTitles,
  surveyPeriodId,
  hasError
}: {
  rankings: BoardRankingListResDtoOutputItemsItem[]
  periods: SurveyPeriodResDtoOutput[]
  seriesTitles: Record<string, string>
  surveyPeriodId: string
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('rankings.title')} description={t('rankings.description')} />
      <Form method='get' className='flex gap-2'>
        <select className={boardInput} name='surveyPeriodId' defaultValue={surveyPeriodId} required>
          <option value='' disabled>
            {t('rankings.selectPeriod')}
          </option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {t('rankings.issue', { issue: period.issueNumber ?? '—' })} · {t(`rankings.statuses.${period.status}`)}
            </option>
          ))}
        </select>
        <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          {t('common.load')}
        </button>
      </Form>
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='overflow-x-auto rounded-xl border border-border bg-card'>
        <div className='grid min-w-[760px] grid-cols-[70px_1fr_90px_100px_120px_130px] gap-3 border-b border-border p-3 text-xs font-bold uppercase text-muted-foreground'>
          <span>#</span>
          <span>{t('rankings.series')}</span>
          <span>{t('rankings.votes')}</span>
          <span>{t('rankings.change')}</span>
          <span>{t('rankings.reliability')}</span>
          <span>{t('rankings.risk')}</span>
        </div>
        {rankings.map((item) => (
          <div
            key={item.seriesId}
            className='grid min-w-[760px] grid-cols-[70px_1fr_90px_100px_120px_130px] items-center gap-3 border-b border-border p-3 text-sm last:border-0'
          >
            <strong>{item.rankPosition ?? '—'}</strong>
            <span className='truncate'>{seriesTitles[item.seriesId] ?? t('rankings.unknownSeries')}</span>
            <span>{item.voteCount}</span>
            <span>{formatRankChange(item.rankChange, t('rankings.noChange'))}</span>
            <span>{item.isReliable ? t('rankings.reliable') : t('rankings.unreliable')}</span>
            <StatusBadge value={item.riskLevel} />
          </div>
        ))}
      </div>
      {surveyPeriodId && !rankings.length && <EmptyState text={t('rankings.empty')} />}
    </div>
  )
}

function formatRankChange(value: number | null, noChange: string) {
  if (!value) return noChange
  return value > 0 ? `+${value}` : String(value)
}
