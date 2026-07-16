import { RefreshCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import {
  OperationAction,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorLifecyclePage({
  series,
  defense,
  focusSeriesId,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  defense: DefenseDashboardResDtoOutput | null
  focusSeriesId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const latest = defense?.rankingTrend.at(-1)
  return (
    <OperationsLayout
      titleKey='operations.lifecycle'
      descriptionKey='operations.descriptions.lifecycle'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto]'>
          <SeriesSelect series={series} defaultValue={focusSeriesId} required={false} />
          <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>
        {defense && (
          <div className='mt-4 grid gap-3 sm:grid-cols-4'>
            <Metric label={t('operations.publishedChapters')} value={defense.serialization.chaptersPublished} />
            <Metric label={t('operations.totalUnitsSold')} value={defense.tankobon.totalUnitsSold} />
            <Metric label={t('operations.latestRank')} value={latest?.rankPosition ?? '—'} />
            <Metric label={t('operations.riskLevel')} value={latest?.riskLevel ?? '—'} />
          </div>
        )}
      </section>
      <OperationPanel icon={RefreshCcw} title={t('operations.lifecycle')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SeriesSelect series={series} />
          <input name='reason' className={operationInput} placeholder={t('operations.reason')} />
          <input
            name='proposedEndingChapters'
            type='number'
            min={1}
            className={operationInput}
            placeholder={t('operations.endingChapters')}
          />
          <div className='grid grid-cols-2 gap-2'>
            <OperationAction intent='hiatus' label={t('actions.hiatus')} />
            <OperationAction intent='resumeSeries' label={t('actions.resumeSeries')} />
            <OperationAction intent='proposeCompletion' label={t('actions.proposeCompletion')} />
            <OperationAction intent='finalizeEnding' label={t('actions.finalizeEnding')} />
            <OperationAction intent='forceCancel' label={t('actions.forceCancel')} destructive />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationPanel>
    </OperationsLayout>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='rounded-lg bg-muted p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}
