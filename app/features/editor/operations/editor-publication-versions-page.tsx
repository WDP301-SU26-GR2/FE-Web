import { Library } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PublicationVersionListResDtoOutputItemsItem } from '~/api/model/publication-versions'
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

export function EditorPublicationVersionsPage({
  series,
  versions,
  focusSeriesId,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  versions: PublicationVersionListResDtoOutputItemsItem[]
  focusSeriesId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  return (
    <OperationsLayout
      titleKey='operations.versions'
      descriptionKey='operations.descriptions.versions'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto]'>
          <SeriesSelect series={series} defaultValue={focusSeriesId} required={false} />
          <button className='rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>
        <div className='mt-4 space-y-2'>
          {versions.map((item) => (
            <article key={item.id} className='rounded-lg border border-border p-3'>
              <strong>
                {item.language} · {item.versionType ?? '—'}
              </strong>
              <p className='text-sm text-muted-foreground'>
                {item.readingDirection}
                {item.notes ? ` · ${item.notes}` : ''}
              </p>
              <p className='break-all text-xs text-muted-foreground'>{item.id}</p>
            </article>
          ))}
        </div>
      </section>
      <OperationPanel icon={Library} title={t('operations.createVersionSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SeriesSelect series={series} />
          <input name='language' required className={operationInput} placeholder='JA / EN / VI' />
          <select name='readingDirection' className={operationInput}>
            <option>RTL</option>
            <option>LTR</option>
          </select>
          <select name='versionType' className={operationInput}>
            <option>ORIGINAL</option>
            <option>DIGITAL</option>
            <option>FLIPPED</option>
          </select>
          <input name='notes' className={operationInput} placeholder={t('operations.notes')} />
          <OperationAction intent='createPublicationVersion' label={t('actions.createVersion')} />
        </fetcher.Form>
      </OperationPanel>
      <OperationPanel icon={Library} title={t('operations.updateVersionSection')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <input name='versionId' required className={operationInput} placeholder='Publication version ID' />
          <input name='language' className={operationInput} placeholder='JA / EN / VI' />
          <select name='readingDirection' className={operationInput} defaultValue=''>
            <option value=''>{t('operations.keepCurrent')}</option>
            <option>RTL</option>
            <option>LTR</option>
          </select>
          <select name='versionType' className={operationInput} defaultValue=''>
            <option value=''>{t('operations.keepCurrent')}</option>
            <option>ORIGINAL</option>
            <option>DIGITAL</option>
            <option>FLIPPED</option>
          </select>
          <input name='notes' className={`${operationInput} sm:col-span-2`} placeholder={t('operations.notes')} />
          <div className='grid grid-cols-2 gap-2 sm:col-span-2'>
            <OperationAction intent='updatePublicationVersion' label={t('actions.updateVersion')} />
            <OperationAction intent='removePublicationVersion' label={t('actions.remove')} destructive />
          </div>
        </fetcher.Form>
        <OperationFeedback data={fetcher.data} />
      </OperationPanel>
    </OperationsLayout>
  )
}
