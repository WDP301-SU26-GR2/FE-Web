import { Form } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { BusinessDataView } from '~/shared/components/business-data-view'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

export function AdminReferencePage({
  series,
  periods,
  selected,
  directories,
  seriesData,
  rankingData
}: {
  series: SelectItem[]
  periods: SelectItem[]
  selected: Record<string, string>
  directories: Record<string, unknown>
  seriesData: Record<string, unknown>
  rankingData: Record<string, unknown>
}) {
  const { t } = useTranslation('admin')
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('operations.eyebrow')}</p>
        <h1 className='mt-2 text-2xl font-bold text-foreground'>{t('operations.reference.title')}</h1>
        <p className='mt-2 text-xs text-muted-foreground'>{t('operations.reference.description')}</p>
      </header>

      <Panel title={t('operations.reference.series')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
          <select className={inputClass} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.notAvailable')}
              </option>
            ))}
          </select>
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={seriesData} />
      </Panel>

      <div className='space-y-6'>
        <Panel title={t('operations.reference.ranking')}>
          <Form method='get' className='flex gap-3'>
            <select className={inputClass} name='surveyPeriodId' defaultValue={selected.surveyPeriodId} required>
              <option value=''>{t('operations.reference.selectPeriod')}</option>
              {periods.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.issueNumber ?? t('common.notAvailable')} ·{' '}
                  {item.status
                    ? t(`operations.surveyStatuses.${item.status}`, {
                        defaultValue: item.status.replaceAll('_', ' ')
                      })
                    : t('common.notAvailable')}
                </option>
              ))}
            </select>
            <LoadButton label={t('operations.reference.load')} />
          </Form>
          <DatasetGrid data={rankingData} />
        </Panel>
        <Panel title={t('operations.reference.directories')}>
          <DatasetGrid data={directories} />
        </Panel>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='mb-4 text-base font-bold text-foreground'>{title}</h2>
      {children}
    </section>
  )
}

function LoadButton({ label }: { label: string }) {
  return <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>{label}</button>
}

function DatasetGrid({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation('admin')
  const entries = Object.entries(data).filter(([, value]) => value !== null)
  if (!entries.length) return null
  return (
    <div className='mt-4 grid gap-3 lg:grid-cols-2'>
      {entries.map(([key, value]) => (
        <section key={key} className='min-w-0 rounded-lg border border-border p-4'>
          <h3 className='mb-3 text-xs font-bold text-foreground'>
            {t(`operations.reference.datasets.${key}`, { defaultValue: humanize(key) })}
          </h3>
          <BusinessDataView value={value} />
        </section>
      ))}
    </div>
  )
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
}
