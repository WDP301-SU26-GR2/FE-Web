import { TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

export function EditorSalesPage({
  series,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout titleKey='operations.sales' descriptionKey='operations.descriptions.sales' hasError={hasError}>
      <OperationPanel icon={TrendingUp} title={t('operations.sales')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <SeriesSelect series={series} />
          <input name='period' required className={operationInput} placeholder='2026-Q2' />
          <input
            name='volumeNumber'
            type='number'
            min={1}
            required
            className={operationInput}
            placeholder={t('operations.volume')}
          />
          <input
            name='unitsSold'
            type='number'
            min={0}
            required
            className={operationInput}
            placeholder={t('operations.units')}
          />
          <div className='sm:col-span-2'>
            <OperationAction intent='tankobon' label={t('actions.addSales')} />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationPanel>
    </OperationsLayout>
  )
}
