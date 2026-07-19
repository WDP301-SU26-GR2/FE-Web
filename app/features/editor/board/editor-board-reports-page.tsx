import { useEffect, useState } from 'react'
import { FilePlus2, Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { BoardDecisionResDtoOutput, SeriesReportResDtoOutput } from '~/api/model/board'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { orderBoardDecisions } from './board-order'
import { boardInput, BoardFeedback, BoardPageLayout, BoardPanel, useBoardFetcher } from './components/board-shared'
import { Dialog } from '~/shared/ui/dialog'

export function EditorBoardReportsPage({
  series,
  decisions,
  reports,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  decisions: BoardDecisionResDtoOutput[]
  reports: SeriesReportResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [reportType, setReportType] = useState('')
  const reportTypes = [...new Set(reports.flatMap((report) => report.reportType ? [report.reportType] : []))]
  const filteredReports = reports.filter((report) =>
    (!search || `${report.content ?? ''} ${series.find((item) => item.id === report.seriesId)?.title ?? ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!reportType || report.reportType === reportType)
  )
  return (
    <BoardPageLayout
      titleKey='board.sections.reports'
      descriptionKey='board.sectionDescriptions.reports'
      hasError={hasError}
    >
      <div className='flex justify-end'>
        <button type='button' onClick={() => setCreateOpen(true)} className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          <Plus className='size-4' />
          {t('actions.createReport')}
        </button>
      </div>
      <BoardPanel title={t('board.reportList')}>
          <div className='mb-4 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-2'>
            <input className={boardInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.searchReports')} />
            <select className={boardInput} value={reportType} onChange={(event) => setReportType(event.target.value)}>
              <option value=''>{t('filters.allReportTypes')}</option>
              {reportTypes.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className='grid gap-3'>
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} series={series} />
            ))}
            {!filteredReports.length && <p className='text-sm text-muted-foreground'>{t('board.emptyReports')}</p>}
          </div>
      </BoardPanel>
      {createOpen && <CreateReportDialog series={series} decisions={decisions} onClose={() => setCreateOpen(false)} />}
    </BoardPageLayout>
  )
}

function CreateReportDialog({
  series,
  decisions,
  onClose
}: {
  series: SeriesListResDtoOutputItemsItem[]
  decisions: BoardDecisionResDtoOutput[]
  onClose: () => void
}) {
  const { t } = useTranslation('editor')
  const fetcher = useBoardFetcher()
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [selectedDecisionId, setSelectedDecisionId] = useState('')
  const matchingDecisions = orderBoardDecisions(
    decisions.filter((decision) => decision.targetSeriesId === selectedSeriesId)
  )

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  function selectSeries(seriesId: string) {
    setSelectedSeriesId(seriesId)
    setSelectedDecisionId('')
  }

  return (
    <Dialog open onClose={onClose} titleId='create-board-report' title={t('board.reportTitle')} size='lg'>
      <fetcher.Form method='post' className='grid gap-3'>
        <input type='hidden' name='intent' value='createReport' />
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.selectSeries')}
          <select
            className={boardInput}
            name='seriesId'
            required
            value={selectedSeriesId}
            onChange={(event) => selectSeries(event.target.value)}
          >
            <option value='' disabled>
              {t('board.selectSeries')}
            </option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.selectDecision')}
          <select
            className={boardInput}
            name='decisionId'
            required
            disabled={!selectedSeriesId}
            value={selectedDecisionId}
            onChange={(event) => setSelectedDecisionId(event.target.value)}
          >
            <option value='' disabled>
              {t('board.selectDecision')}
            </option>
            {matchingDecisions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.decisionType ?? 'DECISION'} · {item.targetSeriesId?.slice(-6) ?? '—'}
              </option>
            ))}
          </select>
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.reportType')}
          <input className={boardInput} name='reportType' required />
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.reportContent')}
          <textarea className={`${boardInput} min-h-36 py-2`} name='content' required />
        </label>
        <label className='grid gap-1.5 text-sm font-semibold'>
          {t('board.attachments')}
          <textarea
            className={`${boardInput} min-h-20 py-2`}
            name='attachments'
            placeholder={t('board.attachmentsHint')}
          />
        </label>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>
            {t('actions.cancel')}
          </button>
          <button
            disabled={fetcher.state !== 'idle' || !selectedSeriesId || !selectedDecisionId}
            className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            {fetcher.state !== 'idle' ? <Loader2 className='size-4 animate-spin' /> : <FilePlus2 className='size-4' />}
            {t('actions.createReport')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function ReportCard({
  report,
  series
}: {
  report: SeriesReportResDtoOutput
  series: SeriesListResDtoOutputItemsItem[]
}) {
  const { i18n } = useTranslation('editor')
  return (
    <article className='rounded-lg border border-border p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='font-bold text-foreground'>
            {series.find((item) => item.id === report.seriesId)?.title ?? report.seriesId ?? '—'}
          </h3>
          <p className='mt-1 text-xs font-semibold text-primary'>{report.reportType ?? '—'}</p>
        </div>
        <time className='text-xs text-muted-foreground'>
          {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(report.createdAt))}
        </time>
      </div>
      {report.content && <p className='mt-3 whitespace-pre-wrap text-sm text-muted-foreground'>{report.content}</p>}
    </article>
  )
}
