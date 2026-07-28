import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

export type AdminReferenceActionResult = {
  ok: boolean
  intent: string
  message?: string
  downloadUrl?: string
  expiresAt?: string
}

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary'

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
  const fetcher = useFetcher<AdminReferenceActionResult>()
  return (
    <div className='space-y-6 pb-12'>
      <header>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>{t('operations.eyebrow')}</p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('operations.reference.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('operations.reference.description')}</p>
      </header>

      <Panel title={t('operations.reference.series')}>
        <Form method='get' className='grid gap-3 md:grid-cols-[1fr_1fr_auto]'>
          <select className={inputClass} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('operations.reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? item.id}
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
        <Form method='get' className='grid gap-3 md:grid-cols-[1fr_1fr_auto]'>
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
                  {item.issueNumber ?? item.id} · {item.status ?? '—'}
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
        <Form method='get' className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
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
          <div className='xl:col-span-5'>
            <LoadButton label={t('operations.reference.load')} />
          </div>
        </Form>
        <DatasetGrid data={workflowData} />
      </Panel>

      <Panel title={t('operations.reference.taskFile')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-[1fr_1fr_auto]'>
          <input className={inputClass} name='taskId' placeholder={t('operations.reference.taskId')} required />
          <input className={inputClass} name='key' placeholder={t('operations.reference.fileKey')} required />
          <button
            name='intent'
            value='downloadTaskFile'
            className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
          >
            {t('operations.reference.createDownload')}
          </button>
        </fetcher.Form>
        {fetcher.data?.message ? <p className='mt-3 text-sm text-destructive'>{fetcher.data.message}</p> : null}
        {fetcher.data?.downloadUrl ? (
          <a
            className='mt-3 inline-flex font-bold text-primary underline'
            href={fetcher.data.downloadUrl}
            target='_blank'
            rel='noreferrer'
          >
            {t('operations.reference.openDownload')}
          </a>
        ) : null}
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='mb-4 text-lg font-bold text-foreground'>{title}</h2>
      {children}
    </section>
  )
}

function LoadButton({ label }: { label: string }) {
  return <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>{label}</button>
}

function DatasetGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, value]) => value !== null)
  if (!entries.length) return null
  return (
    <div className='mt-4 grid gap-3 lg:grid-cols-2'>
      {entries.map(([key, value]) => (
        <section key={key} className='min-w-0 rounded-lg border border-border p-4'>
          <h3 className='mb-3 text-sm font-bold capitalize text-foreground'>{humanize(key)}</h3>
          <DataPreview value={value} />
        </section>
      ))}
    </div>
  )
}

function DataPreview({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className='text-sm text-muted-foreground'>—</p>
  if (typeof value !== 'object') return <p className='break-words text-sm'>{String(value)}</p>
  const rows = Array.isArray(value) ? value : [value]
  if (!rows.length) return <p className='text-sm text-muted-foreground'>—</p>
  return (
    <div className='max-h-80 space-y-2 overflow-auto'>
      {rows.map((row, index) => (
        <div key={objectKey(row, index)} className='rounded-md bg-muted p-3 text-xs text-muted-foreground'>
          {renderObject(row)}
        </div>
      ))}
    </div>
  )
}

function renderObject(value: unknown): ReactNode {
  if (!value || typeof value !== 'object') return String(value ?? '—')
  return (
    <dl className='grid gap-2'>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
        <div key={key} className='grid grid-cols-[minmax(7rem,0.35fr)_1fr] gap-2'>
          <dt className='font-semibold text-foreground'>{humanize(key)}</dt>
          <dd className='break-words'>
            {item && typeof item === 'object' ? JSON.stringify(item) : String(item ?? '—')}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function objectKey(value: unknown, index: number) {
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: unknown }).id)
  return String(index)
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
}
