import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { BoardRankingListResDtoOutputItemsItem, SurveyPeriodResDtoOutput } from '~/api/model/survey'
import { useTranslation } from 'react-i18next'
import { OperationsLayout, operationInput } from './components/operations-shared'

export function EditorInsightsPage({
  series,
  periods,
  seriesId,
  surveyPeriodId,
  assistants,
  revisions,
  trend,
  boardRanking,
  payments,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  periods: SurveyPeriodResDtoOutput[]
  seriesId: string
  surveyPeriodId: string
  assistants: AssistantDirectoryListResDtoOutputItemsItem[]
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  trend: BoardRankingListResDtoOutputItemsItem[]
  boardRanking: BoardRankingListResDtoOutputItemsItem[]
  payments: PaymentRecordListResDtoOutputDataItem[]
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  return (
    <OperationsLayout
      titleKey='operations.insights'
      descriptionKey='operations.descriptions.insights'
      hasError={hasError}
    >
      <form method='get' className='grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-[1fr_1fr_auto]'>
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
              {t(`operations.surveyStatuses.${period.status}`, { defaultValue: period.status.replaceAll('_', ' ') })}
            </option>
          ))}
        </select>
        <button className='rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
          {t('actions.load')}
        </button>
      </form>
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
            defaultValue: item.paymentType.replaceAll('_', ' ')
          })} · ${new Intl.NumberFormat(i18n.language).format(item.amount)}`,
          detail: `${t(`contractDetail.payments.statuses.${item.status}`, {
            defaultValue: item.status.replaceAll('_', ' ')
          })}${item.period ? ` · ${item.period}` : ''}`
        }))}
      />
      <DataPanel
        title={t('operations.revisionHistory')}
        empty={t('operations.noInsightsData')}
        items={revisions.map((item) => ({
          id: item.id,
          title: `${t(`operations.revisionTypes.${item.targetType}`, {
            defaultValue: item.targetType.replaceAll('_', ' ')
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
              .map((value) => t(`operations.specializations.${value}`, { defaultValue: value.replaceAll('_', ' ') }))
              .join(', ') || t('operations.noSpecialization')
          } · ${
            item.availabilityStatus
              ? t(`operations.availabilityStatuses.${item.availabilityStatus}`, {
                  defaultValue: item.availabilityStatus.replaceAll('_', ' ')
                })
              : t('operations.unknown')
          }`
        }))}
      />
    </OperationsLayout>
  )
}

function DataPanel({
  title,
  items,
  empty
}: {
  title: string
  items: Array<{ id: string; title: string; detail: string }>
  empty: string
}) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='font-bold text-foreground'>{title}</h2>
      <div className='mt-3 grid gap-2'>
        {items.map((item) => (
          <article key={item.id} className='rounded-md bg-muted p-3 text-xs'>
            <strong className='text-foreground'>{item.title}</strong>
            <p className='mt-1 text-xs text-muted-foreground'>{item.detail}</p>
          </article>
        ))}
        {!items.length && <p className='text-xs text-muted-foreground'>{empty}</p>}
      </div>
    </section>
  )
}
