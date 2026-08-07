import { Form } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  SurveyControllerGetInternalRankingAggregateLevel,
  SurveyControllerGetInternalRankingAggregatePublicationType,
  type BoardRankingListResDtoOutputItemsItem,
  type InternalRankingAggregateResDtoOutput,
  type SurveyPeriodResDtoOutput
} from '~/api/model/survey'
import { boardDialogButton, boardInput, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'

export function BoardRankingsPage({
  rankings,
  periods,
  seriesTitles,
  surveyPeriodId,
  aggregate,
  aggregateQuery,
  aggregateOptions,
  hasError
}: {
  rankings: BoardRankingListResDtoOutputItemsItem[]
  periods: SurveyPeriodResDtoOutput[]
  seriesTitles: Record<string, string>
  surveyPeriodId: string
  aggregate: InternalRankingAggregateResDtoOutput | null
  aggregateQuery: {
    magazine: string
    publicationType: keyof typeof SurveyControllerGetInternalRankingAggregatePublicationType
    level: keyof typeof SurveyControllerGetInternalRankingAggregateLevel
    year: number
    month: number
  }
  aggregateOptions: Array<{ magazine: string; publicationType: string }>
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('rankings.title')}
        description={t('rankings.description')}
        backHref='/dashboard/board/operations'
      />
      <Form method='get' replace preventScrollReset className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
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
        <button className={`${boardDialogButton} bg-primary text-primary-foreground`}>
          {t('common.load')}
        </button>
      </Form>
      {hasError && <p className='text-xs text-destructive'>{t('common.loadError')}</p>}
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
            className='grid min-w-[760px] grid-cols-[70px_1fr_90px_100px_120px_130px] items-center gap-3 border-b border-border p-3 text-xs last:border-0'
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
      <section className='space-y-4 border-t border-border pt-6'>
        <div>
          <h2 className='text-lg font-bold text-foreground'>{t('rankings.aggregateTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('rankings.aggregateDescription')}</p>
        </div>
        <Form
          method='get'
          replace
          preventScrollReset
          className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]'
        >
          <input type='hidden' name='surveyPeriodId' value={surveyPeriodId} />
          <select className={boardInput} name='magazine' defaultValue={aggregateQuery.magazine} required>
            <option value=''>{t('rankings.selectMagazine')}</option>
            {aggregateOptions.map((option) => (
              <option key={`${option.magazine}:${option.publicationType}`} value={option.magazine}>
                {option.magazine}
              </option>
            ))}
          </select>
          <select className={boardInput} name='publicationType' defaultValue={aggregateQuery.publicationType} required>
            {Object.values(SurveyControllerGetInternalRankingAggregatePublicationType).map((value) => (
              <option key={value} value={value}>
                {t(`rankings.publicationTypes.${value}`)}
              </option>
            ))}
          </select>
          <select className={boardInput} name='level' defaultValue={aggregateQuery.level} required>
            {Object.values(SurveyControllerGetInternalRankingAggregateLevel).map((value) => (
              <option key={value} value={value}>
                {t(`rankings.levels.${value}`)}
              </option>
            ))}
          </select>
          <input
            className={boardInput}
            name='year'
            type='number'
            min={1970}
            max={9999}
            defaultValue={aggregateQuery.year}
            required
          />
          <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto]'>
            <input
              className={boardInput}
              name='month'
              type='number'
              min={1}
              max={12}
              defaultValue={aggregateQuery.month}
              disabled={aggregateQuery.level === SurveyControllerGetInternalRankingAggregateLevel.YEAR}
              aria-label={t('rankings.month')}
            />
            <button className={`${boardDialogButton} bg-primary text-primary-foreground`}>
              {t('common.load')}
            </button>
          </div>
        </Form>
        {aggregate ? (
          <div className='overflow-x-auto rounded-xl border border-border bg-card'>
            <div className='grid min-w-[820px] grid-cols-[70px_1fr_110px_110px_120px_110px] gap-3 border-b border-border p-3 text-xs font-bold uppercase text-muted-foreground'>
              <span>#</span>
              <span>{t('rankings.series')}</span>
              <span>{t('rankings.averageScore')}</span>
              <span>{t('rankings.participation')}</span>
              <span>{t('rankings.reliability')}</span>
              <span>{t('rankings.risk')}</span>
            </div>
            {aggregate.items.map((item) => (
              <div
                key={item.seriesId}
                className='grid min-w-[820px] grid-cols-[70px_1fr_110px_110px_120px_110px] items-center gap-3 border-b border-border p-3 text-xs last:border-0'
              >
                <strong>{item.rankPosition}</strong>
                <span className='truncate'>
                  {item.seriesTitle ?? seriesTitles[item.seriesId] ?? t('rankings.unknownSeries')}
                </span>
                <span>
                  {new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 }).format(
                    item.averageNormalizedScore
                  )}
                </span>
                <span>
                  {new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 0 }).format(
                    item.participationCoverage
                  )}
                </span>
                <span>
                  {item.isProvisional
                    ? t('rankings.provisional')
                    : item.isReliable
                      ? t('rankings.reliable')
                      : t('rankings.unreliable')}
                </span>
                <StatusBadge value={item.riskLevel} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text={t('rankings.aggregateEmpty')} />
        )}
      </section>
    </div>
  )
}

function formatRankChange(value: number | null, noChange: string) {
  if (!value) return noChange
  return value > 0 ? `+${value}` : String(value)
}
