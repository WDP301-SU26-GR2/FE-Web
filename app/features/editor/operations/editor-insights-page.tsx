import type {
  AssistantDirectoryListResDtoOutputItemsItem,
  MangakaDirectoryListResDtoOutputItemsItem
} from '~/api/model/users'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type {
  BoardRankingListResDtoOutputItemsItem,
  InternalRankingAggregateResDtoOutput,
  SurveyPeriodListResDtoOutputItemsItem
} from '~/api/model/survey'
import { useTranslation } from 'react-i18next'
import { OperationsLayout, operationDialogButton, operationInput } from './components/operations-shared'

export function EditorInsightsPage({
  series,
  periods,
  seriesId,
  surveyPeriodId,
  revisionId,
  assistants,
  mangakas,
  revisions,
  trend,
  boardRanking,
  payments,
  aggregate,
  aggregateLevel,
  aggregateYear,
  aggregateMonth,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  periods: SurveyPeriodListResDtoOutputItemsItem[]
  seriesId: string
  surveyPeriodId: string
  revisionId: string
  assistants: AssistantDirectoryListResDtoOutputItemsItem[]
  mangakas: MangakaDirectoryListResDtoOutputItemsItem[]
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  trend: BoardRankingListResDtoOutputItemsItem[]
  boardRanking: BoardRankingListResDtoOutputItemsItem[]
  payments: PaymentRecordListResDtoOutputDataItem[]
  aggregate: InternalRankingAggregateResDtoOutput | null
  aggregateLevel: 'MONTH' | 'YEAR'
  aggregateYear: number
  aggregateMonth: number
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  return (
    <OperationsLayout
      titleKey='operations.insights'
      descriptionKey='operations.descriptions.insights'
      hasError={hasError}
    >
      <form
        method='get'
        className='grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]'
      >
        <select name='seriesId' defaultValue={seriesId} className={operationInput}>
          <option value=''>{t('operations.selectSeries')}</option>
          {series.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <select name='surveyPeriodId' defaultValue={surveyPeriodId} className={operationInput}>
          <option value=''>{t('operations.selectSurveyPeriod')}</option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {t('operations.surveyIssue', { issue: period.issueNumber ?? '—' })} ·{' '}
              {t(`operations.surveyStatuses.${period.status}`, { defaultValue: t('common.notAvailable') })}
            </option>
          ))}
        </select>
        <select name='aggregateLevel' defaultValue={aggregateLevel} className={operationInput}>
          <option value='MONTH'>{t('operations.aggregateLevels.MONTH')}</option>
          <option value='YEAR'>{t('operations.aggregateLevels.YEAR')}</option>
        </select>
        <input
          name='aggregateYear'
          type='number'
          min={1970}
          max={9999}
          defaultValue={aggregateYear}
          aria-label={t('operations.aggregateYear')}
          className={operationInput}
        />
        <input
          name='aggregateMonth'
          type='number'
          min={1}
          max={12}
          defaultValue={aggregateMonth}
          aria-label={t('operations.aggregateMonth')}
          className={operationInput}
        />
        <button className={`${operationDialogButton} bg-primary text-primary-foreground`}>
          {t('actions.load')}
        </button>
      </form>
      <DataPanel
        title={t('operations.internalAggregateRanking')}
        empty={t('operations.noInsightsData')}
        items={(aggregate?.items ?? []).map((item) => ({
          id: item.seriesId,
          title: `#${item.rankPosition} · ${item.seriesTitle ?? t('operations.unknownSeries')}`,
          detail: `${t('operations.aggregateCoverage', {
            coverage: new Intl.NumberFormat(i18n.language, { style: 'percent' }).format(item.participationCoverage)
          })} · ${t(`operations.riskLevels.${item.riskLevel}`, { defaultValue: t('common.notAvailable') })} · ${
            item.isReliable ? t('operations.reliable') : t('operations.provisional')
          }`
        }))}
      />
      <DataPanel
        title={t('operations.seriesRankingTrend')}
        empty={t('operations.noInsightsData')}
        items={trend.map((item) => ({
          id: `${item.seriesId}-${item.surveyPeriodId}`,
          title: series.find((entry) => entry.id === item.seriesId)?.title ?? t('operations.unknownSeries'),
          detail: `#${item.rankPosition ?? '—'} · ${t('operations.voteCount', { count: item.voteCount })} · ${t(
            `operations.riskLevels.${item.riskLevel}`,
            { defaultValue: t('common.notAvailable') }
          )}`
        }))}
      />
      <DataPanel
        title={t('operations.boardRanking')}
        empty={t('operations.noInsightsData')}
        items={boardRanking.map((item) => ({
          id: `${item.seriesId}-${item.surveyPeriodId}`,
          title: series.find((entry) => entry.id === item.seriesId)?.title ?? t('operations.unknownSeries'),
          detail: `#${item.rankPosition ?? '—'} · ${t('operations.voteCount', { count: item.voteCount })} · ${t(
            `operations.riskLevels.${item.riskLevel}`,
            { defaultValue: t('common.notAvailable') }
          )}`
        }))}
      />
      <DataPanel
        title={t('operations.paymentsBySeries')}
        empty={t('operations.noInsightsData')}
        items={payments.map((item) => ({
          id: item.id,
          title: `${t(`contractDetail.payments.types.${item.paymentType}`, {
            defaultValue: t('common.notAvailable')
          })} · ${new Intl.NumberFormat(i18n.language).format(item.amount)}`,
          detail: `${t(`contractDetail.payments.statuses.${item.status}`, {
            defaultValue: t('common.notAvailable')
          })}${item.period ? ` · ${item.period}` : ''}`
        }))}
      />
      <DataPanel
        title={t('operations.revisionHistory')}
        empty={t('operations.noInsightsData')}
        focusId={revisionId}
        items={[...revisions]
          .sort((a, b) => Number(b.id === revisionId) - Number(a.id === revisionId))
          .map((item) => ({
            id: item.id,
            title: `${t(`operations.revisionTypes.${item.targetType}`, {
              defaultValue: t('common.notAvailable')
            })} · ${t('operations.revisionRound', { round: item.round })}`,
            detail: `${t(item.isResolved ? 'operations.resolved' : 'operations.openRevision')} · ${item.reason}`
          }))}
      />
      <DataPanel
        title={t('operations.assistantDirectory')}
        empty={t('operations.noInsightsData')}
        items={assistants.map((item) => ({
          id: item.userId,
          title: item.displayName ?? t('operations.unknownAssistant'),
          detail: `${
            item.specializations
              .map((value) => t(`operations.specializations.${value}`, { defaultValue: t('common.notAvailable') }))
              .join(', ') || t('operations.noSpecialization')
          } · ${
            item.availabilityStatus
              ? t(`operations.availabilityStatuses.${item.availabilityStatus}`, {
                  defaultValue: t('common.notAvailable')
                })
              : t('operations.unknown')
          }`
        }))}
      />
      <DataPanel
        title={t('operations.mangakaDirectory')}
        empty={t('operations.noInsightsData')}
        items={mangakas.map((item) => ({
          id: item.userId,
          title: item.penName || item.displayName || t('operations.unknownMangaka'),
          detail: `${
            item.genres
              .map((value) => t(`common:businessData.values.${value}`, { defaultValue: t('common.notAvailable') }))
              .join(', ') || t('operations.noGenre')
          } · ${new Intl.NumberFormat(i18n.language).format(item.reputationScore)}`
        }))}
      />
    </OperationsLayout>
  )
}

function DataPanel({
  title,
  items,
  empty,
  focusId
}: {
  title: string
  items: Array<{ id: string; title: string; detail: string }>
  empty: string
  focusId?: string
}) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='font-bold text-foreground'>{title}</h2>
      <div className='mt-3 grid gap-2'>
        {items.map((item) => (
          <article
            key={item.id}
            className={`rounded-md border p-3 text-xs ${
              item.id === focusId ? 'border-primary bg-primary/5 ring-2 ring-primary/15' : 'border-transparent bg-muted'
            }`}
          >
            <strong className='block min-w-0 text-pretty text-foreground'>{item.title}</strong>
            <p className='mt-1 text-xs text-muted-foreground'>{item.detail}</p>
          </article>
        ))}
        {!items.length && <p className='text-xs text-muted-foreground'>{empty}</p>}
      </div>
    </section>
  )
}
