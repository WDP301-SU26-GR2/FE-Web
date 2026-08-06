import { Form, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { BoardActionResult } from '../types'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel, EmptyState } from '../components/board-ui'
import { BusinessDataView } from '~/shared/components/business-data-view'
import { SignedImage } from '~/shared/components/signed-image'

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
    publicationVersionId: string
    surveyPeriodId: string
    chapterId: string
    storyboardId: string
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
      <BoardHeader
        title={t('reference.title')}
        description={t('reference.description')}
        backHref='/dashboard/board/operations'
      />

      <BoardPanel title={t('reference.seriesTitle')}>
        <p className='mb-4 text-xs leading-5 text-muted-foreground'>{t('reference.seriesHelp')}</p>
        <Form method='get' replace preventScrollReset className='grid gap-3 lg:grid-cols-2'>
          <select className={boardInput} name='seriesId' defaultValue={selected.seriesId} required>
            <option value=''>{t('reference.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title ?? t('common.noDescription')}
              </option>
            ))}
          </select>
          <select className={boardInput} name='publicationVersionId' defaultValue={selected.publicationVersionId}>
            <option value=''>{t('reference.publicationVersionId')}</option>
            {selectItems(seriesData.publicationVersions).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground lg:col-span-3'>
            {t('common.load')}
          </button>
        </Form>
        <DatasetGrid data={seriesData} emptyText={t('reference.selectSeries')} />
      </BoardPanel>

      <BoardPanel title={t('reference.productionTitle')}>
        <p className='mb-4 text-xs leading-5 text-muted-foreground'>{t('reference.productionHelp')}</p>
        <Form
          method='get'
          replace
          preventScrollReset
          className='grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
        >
          <input
            className={boardInput}
            name='chapterId'
            defaultValue={selected.chapterId}
            placeholder={t('reference.chapterId')}
            required
          />
          <select className={boardInput} name='storyboardId' defaultValue={selected.storyboardId}>
            <option value=''>{t('reference.storyboardId')}</option>
            {selectItems(chapterData.storyboards).map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('common.load')}
          </button>
        </Form>
        <StoryboardPreview value={chapterData.selectedStoryboard} />
        <DatasetGrid data={chapterData} emptyText={t('reference.enterChapter')} />
      </BoardPanel>

      <BoardPanel title={t('reference.surveyTitle')}>
        <Form method='get' replace preventScrollReset className='flex flex-col gap-3 sm:flex-row'>
          <select className={boardInput} name='surveyPeriodId' defaultValue={selected.surveyPeriodId} required>
            <option value=''>{t('reference.selectSurvey')}</option>
            {periods.map((item) => (
              <option key={item.id} value={item.id}>
                {t('rankings.issue', { issue: item.issueNumber ?? '—' })} ·{' '}
                {item.status ? t(`rankings.statuses.${item.status}`, { defaultValue: t('common.notAvailable') }) : '—'}
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

function StoryboardPreview({ value }: { value: unknown }) {
  const { t } = useTranslation('board')
  if (!value || typeof value !== 'object' || !('pages' in value) || !Array.isArray(value.pages)) return null
  const pages = value.pages.flatMap((page) => {
    if (!page || typeof page !== 'object') return []
    const record = page as Record<string, unknown>
    if (typeof record.fileUrl !== 'string' || typeof record.pageNumber !== 'number') return []
    return [{ fileUrl: record.fileUrl, pageNumber: record.pageNumber }]
  })
  if (!pages.length) return null
  return (
    <section className='mt-4'>
      <h3 className='text-xs font-bold text-foreground'>{t('reference.storyboardPreview')}</h3>
      <div className='mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
        {pages.map((page) => (
          <SignedImage
            key={`${page.pageNumber}:${page.fileUrl}`}
            r2Key={page.fileUrl}
            alt={t('reference.storyboardPageAlt', { number: page.pageNumber })}
          />
        ))}
      </div>
    </section>
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
            {t(`reference.datasets.${key}`, { defaultValue: t('common.data') })}
          </h3>
          <BusinessDataView value={value} emptyText={emptyText} />
        </section>
      ))}
    </div>
  )
}

function selectItems(value: unknown): Array<{ id: string; label: string }> {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'items' in value && Array.isArray(value.items)
      ? value.items
      : []
  return source.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'string') return []
    const record = item as Record<string, unknown>
    const label = [record.title, record.name, record.language, record.versionType, record.status].find(
      (entry) => typeof entry === 'string' && entry.length > 0
    )
    return [{ id: item.id, label: typeof label === 'string' ? label : item.id }]
  })
}
