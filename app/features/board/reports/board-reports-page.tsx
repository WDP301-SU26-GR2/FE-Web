import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'
import type { SeriesReportResDtoOutput } from '~/api/model/board'
import { BoardHeader, EmptyState } from '../components/board-ui'

export function BoardReportsPage({
  reports,
  hasError,
  backPath,
  decisionBasePath,
  seriesTitles = {},
  enableFilters = false
}: {
  reports: SeriesReportResDtoOutput[]
  hasError: boolean
  backPath?: string
  decisionBasePath?: string
  seriesTitles?: Record<string, string>
  enableFilters?: boolean
}) {
  const { t } = useTranslation('board')
  const [search, setSearch] = useState('')
  const [reportType, setReportType] = useState('')
  const reportTypes = [...new Set(reports.flatMap((report) => (report.reportType ? [report.reportType] : [])))]
  const filteredReports = reports.filter(
    (report) =>
      (!reportType || report.reportType === reportType) &&
      (!search || `${report.content} ${seriesTitles[report.seriesId ?? ''] ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div className='space-y-6 pb-12'>
      {backPath && (
        <Link to={backPath} className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <BoardHeader title={t('reports.title')} description={t('reports.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      {enableFilters && (
        <div className='grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-2'>
          <input
            className='h-10 rounded-md border border-input bg-background px-3 text-sm'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('filters.searchReports')}
          />
          <select
            className='h-10 rounded-md border border-input bg-background px-3 text-sm'
            value={reportType}
            onChange={(event) => setReportType(event.target.value)}
          >
            <option value=''>{t('filters.allReportTypes')}</option>
            {reportTypes.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      )}
      <div className='grid gap-4 md:grid-cols-2'>
        {filteredReports.map((report) => (
          <article key={report.id} className='rounded-xl border border-border bg-card p-5 shadow-sm'>
            <h2 className='font-bold'>
              {decisionBasePath && report.boardDecisionId ? (
                <Link className='hover:text-primary hover:underline' to={`${decisionBasePath}/${report.boardDecisionId}`}>
                  {report.reportType ?? t('reports.title')}
                </Link>
              ) : (
                report.reportType ?? t('reports.title')
              )}
            </h2>
            <p className='mt-1 text-xs text-muted-foreground'>{seriesTitles[report.seriesId ?? ''] ?? t('reports.unknownSeries')}</p>
            <p className='mt-3 whitespace-pre-wrap text-sm text-muted-foreground'>{report.content}</p>
          </article>
        ))}
      </div>
      {!filteredReports.length && <EmptyState text={t('reports.empty')} />}
    </div>
  )
}
