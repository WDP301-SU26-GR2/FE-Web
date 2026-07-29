import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardActionResult } from '../types'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState } from '../components/board-ui'
import { BusinessDataView } from '~/shared/components/business-data-view'

type SelectItem = { id: string; title?: string; issueNumber?: string | number | null; status?: string }

export function BoardReferencePage({
  series,
  periods,
  selected,
  directories,
  revisions,
  seriesData,
  surveyData
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
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader
        title={t('reference.title')}
        description={t('reference.description')}
        backHref='/dashboard/board/operations'
      />

      <BoardPanel title={t('reference.seriesTitle')}>
        <Form method='get' className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
          <select className={boardInput} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.noDescription')}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
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
                {t('rankings.issue', { issue: item.issueNumber ?? '—' })} ·{' '}
                {item.status
                  ? t(`rankings.statuses.${item.status}`, { defaultValue: item.status.replaceAll('_', ' ') })
                  : '—'}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('common.load')}
          </button>
        </Form>
        <DatasetGrid data={surveyData} emptyText={t('reference.selectSurvey')} />
      </BoardPanel>

      <div className='space-y-6'>
        <BoardPanel title={t('reference.directoriesTitle')}>
          <DatasetGrid data={directories} emptyText={t('common.loadError')} />
        </BoardPanel>
        <BoardPanel title={t('reference.revisionsTitle')}>
          <BusinessDataView value={revisions} />
        </BoardPanel>
      </div>

      <div className='space-y-6'>
        <BoardPanel title={t('reference.salesTitle')}>
          <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
            <select className={boardInput} name='seriesId' defaultValue={selected.seriesId} required>
              <option value=''>{t('reference.selectSeries')}</option>
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title ?? t('common.noDescription')}
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
              className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground sm:col-span-2'
            >
              {t('reference.recordSales')}
            </button>
          </fetcher.Form>
          <BoardFeedback data={fetcher.data?.intent === 'recordTankobonSales' ? fetcher.data : undefined} />
        </BoardPanel>
      </div>
    </div>
  )
}

function DatasetGrid({ data, emptyText }: { data: Record<string, unknown>; emptyText: string }) {
  const { t } = useTranslation('board')
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
          <h3 className='mb-3 text-xs font-bold text-foreground'>
            {t(`reference.datasets.${key}`, { defaultValue: humanize(key) })}
          </h3>
          <BusinessDataView value={value} emptyText={emptyText} />
        </section>
      ))}
    </div>
  )
}

function humanize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')
}
