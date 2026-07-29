import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { BusinessDataView } from '~/shared/components/business-data-view'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }
type TaskDownloadResult = {
  ok: boolean
  intent: 'taskDownload'
  downloadUrl?: string
  expiresAt?: string
  message?: string
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

export function AdminReferencePage({
  series,
  periods,
  selected,
  directories,
  seriesData,
  chapterData,
  rankingData,
  workflowData
}: {
  series: SelectItem[]
  periods: SelectItem[]
  selected: Record<string, string>
  directories: Record<string, unknown>
  seriesData: Record<string, unknown>
  chapterData: Record<string, unknown>
  rankingData: Record<string, unknown>
  workflowData: Record<string, unknown>
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
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <select className={inputClass} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.notAvailable')}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            name='seriesNameId'
            defaultValue={selected.seriesNameId}
            placeholder={t('operations.reference.seriesNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={seriesData} />
      </Panel>

      <Panel title={t('operations.reference.chapter')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
          <input
            className={inputClass}
            name='chapterId'
            defaultValue={selected.chapterId}
            placeholder={t('operations.reference.chapterId')}
            required
          />
          <input
            className={inputClass}
            name='chapterNameId'
            defaultValue={selected.chapterNameId}
            placeholder={t('operations.reference.chapterNameId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={chapterData} />
      </Panel>

      <div className='grid gap-6 xl:grid-cols-2'>
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

      <Panel title={t('operations.reference.workflows')}>
        <Form method='get' className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
          <input
            className={inputClass}
            name='reprintId'
            defaultValue={selected.reprintId}
            placeholder={t('operations.reference.reprintId')}
          />
          <input
            className={inputClass}
            name='reprintChapterId'
            defaultValue={selected.reprintChapterId}
            placeholder={t('operations.reference.reprintChapterId')}
          />
          <input
            className={inputClass}
            name='deadlineId'
            defaultValue={selected.deadlineId}
            placeholder={t('operations.reference.deadlineId')}
          />
          <input
            className={inputClass}
            name='transferRequestId'
            defaultValue={selected.transferRequestId}
            placeholder={t('operations.reference.transferRequestId')}
          />
          <input
            className={inputClass}
            name='transferContractId'
            defaultValue={selected.transferContractId}
            placeholder={t('operations.reference.transferContractId')}
          />
          <LoadButton label={t('operations.reference.load')} />
        </Form>
        <DatasetGrid data={workflowData} />
      </Panel>

      <TaskDownloadPanel />
    </div>
  )
}

function TaskDownloadPanel() {
  const { t } = useTranslation('admin')
  const fetcher = useFetcher<TaskDownloadResult>()
  return (
    <Panel title={t('operations.reference.taskFile')}>
      <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <input type='hidden' name='intent' value='taskDownload' />
        <input className={inputClass} name='taskId' placeholder={t('operations.reference.taskId')} required />
        <input className={inputClass} name='fileKey' placeholder={t('operations.reference.fileKey')} required />
        <button
          disabled={fetcher.state !== 'idle'}
          className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
        >
          {t('operations.reference.createDownload')}
        </button>
      </fetcher.Form>
      {fetcher.data?.ok && fetcher.data.downloadUrl && (
        <div className='mt-4 rounded-lg border border-primary/30 bg-primary/10 p-4'>
          <a
            href={fetcher.data.downloadUrl}
            target='_blank'
            rel='noreferrer'
            className='text-xs font-bold text-primary underline'
          >
            {t('operations.reference.openDownload')}
          </a>
          {fetcher.data.expiresAt && (
            <p className='mt-2 text-xs text-muted-foreground'>
              {t('operations.reference.downloadExpires', { date: fetcher.data.expiresAt })}
            </p>
          )}
        </div>
      )}
      {fetcher.data && !fetcher.data.ok && (
        <p className='mt-4 text-xs font-semibold text-destructive'>
          {fetcher.data.message ?? t('operations.reference.downloadFailed')}
        </p>
      )}
    </Panel>
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
