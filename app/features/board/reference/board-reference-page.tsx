import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import type { BoardActionResult } from '../types'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState } from '../components/board-ui'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }

export function BoardReferencePage({
  series,
  periods,
  selected,
  directories,
  revisions,
  seriesData,
  surveyData,
  chapterData
}: {
  series: SelectItem[]
  periods: SelectItem[]
  selected: {
    seriesId: string
    seriesNameId: string
    publicationVersionId: string
    surveyPeriodId: string
    chapterId: string
    chapterNameId: string
  }
  directories: { assistants: unknown; mangakas: unknown }
  revisions: unknown
  seriesData: Record<string, unknown>
  surveyData: Record<string, unknown>
  chapterData: Record<string, unknown>
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('reference.title')} description={t('reference.description')} />

      <BoardPanel title={t('reference.seriesTitle')}>
        <Form method='get' className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <select className={boardInput} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? item.id}
              </option>
            ))}
          </select>
          <input
            className={boardInput}
            name='seriesNameId'
            defaultValue={selected.seriesNameId}
            placeholder={t('reference.seriesNameId')}
          />
          <input
            className={boardInput}
            name='publicationVersionId'
            defaultValue={selected.publicationVersionId}
            placeholder={t('reference.publicationVersionId')}
          />
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('common.load')}
          </button>
        </Form>
        <DatasetGrid data={seriesData} emptyText={t('reference.selectSeries')} />
      </BoardPanel>

      <BoardPanel title={t('reference.surveyTitle')}>
        <Form method='get' className='flex flex-col gap-3 sm:flex-row'>
          <select className={boardInput} name='surveyPeriodId' defaultValue={selected.surveyPeriodId} required>
            <option value=''>{t('reference.selectSurvey')}</option>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.issueNumber ?? item.id} · {item.status ?? '—'}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('common.load')}
          </button>
        </Form>
        <DatasetGrid data={surveyData} emptyText={t('reference.selectSurvey')} />
      </BoardPanel>

      <BoardPanel title={t('reference.productionTitle')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-[1fr_1fr_auto]'>
          <input
            className={boardInput}
            name='chapterId'
            defaultValue={selected.chapterId}
            placeholder={t('reference.chapterId')}
            required
          />
          <input
            className={boardInput}
            name='chapterNameId'
            defaultValue={selected.chapterNameId}
            placeholder={t('reference.chapterNameId')}
          />
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('common.load')}
          </button>
        </Form>
        <DatasetGrid data={chapterData} emptyText={t('reference.enterChapter')} />
      </BoardPanel>

      <div className='grid gap-6 xl:grid-cols-2'>
        <BoardPanel title={t('reference.directoriesTitle')}>
          <DatasetGrid data={directories} emptyText={t('common.loadError')} />
        </BoardPanel>
        <BoardPanel title={t('reference.revisionsTitle')}>
          <DataPreview value={revisions} />
        </BoardPanel>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <BoardPanel title={t('reference.salesTitle')}>
          <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
            <select className={boardInput} name='seriesId' defaultValue={selected.seriesId} required>
              <option value=''>{t('reference.selectSeries')}</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ?? item.id}
                </option>
              ))}
            </select>
            <input className={boardInput} name='period' placeholder={t('reference.period')} required />
            <input
              className={boardInput}
              name='volumeNumber'
              type='number'
              min={1}
              placeholder={t('reference.volume')}
              required
            />
            <input
              className={boardInput}
              name='unitsSold'
              type='number'
              min={0}
              placeholder={t('reference.unitsSold')}
              required
            />
            <button
              name='intent'
              value='recordTankobonSales'
              className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground sm:col-span-2'
            >
              {t('reference.recordSales')}
            </button>
          </fetcher.Form>
          <BoardFeedback data={fetcher.data?.intent === 'recordTankobonSales' ? fetcher.data : undefined} />
        </BoardPanel>

        <BoardPanel title={t('reference.taskFileTitle')}>
          <fetcher.Form method='post' className='grid gap-3'>
            <input className={boardInput} name='taskId' placeholder={t('reference.taskId')} required />
            <input className={boardInput} name='key' placeholder={t('reference.fileKey')} required />
            <button
              name='intent'
              value='downloadTaskFile'
              className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
            >
              {t('reference.signDownload')}
            </button>
          </fetcher.Form>
          {fetcher.data?.ok && fetcher.data.downloadUrl ? (
            <a
              className='mt-4 inline-flex font-bold text-primary underline'
              href={fetcher.data.downloadUrl}
              target='_blank'
              rel='noreferrer'
            >
              {t('reference.openDownload')}
            </a>
          ) : null}
          <BoardFeedback data={fetcher.data?.intent === 'downloadTaskFile' ? fetcher.data : undefined} />
        </BoardPanel>
      </div>
    </div>
  )
}

function DatasetGrid({ data, emptyText }: { data: Record<string, unknown>; emptyText: string }) {
  const entries = Object.entries(data).filter(([, value]) => value !== null)
  if (!entries.length)
    return (
      <div className='mt-4'>
        <EmptyState text={emptyText} />
      </div>
    )
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
  if (typeof value !== 'object') return <p className='break-words text-sm text-foreground'>{String(value)}</p>
  const normalized = Array.isArray(value) ? value : [value]
  if (!normalized.length) return <p className='text-sm text-muted-foreground'>—</p>
  return (
    <div className='max-h-80 space-y-2 overflow-auto'>
      {normalized.map((item, index) => (
        <div key={objectKey(item, index)} className='rounded-md bg-muted p-3 text-xs text-muted-foreground'>
          {renderObject(item)}
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
