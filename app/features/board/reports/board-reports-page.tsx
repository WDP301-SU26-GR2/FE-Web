import { useTranslation } from 'react-i18next'
import type { SeriesReportResDtoOutput } from '~/api/model/board'
import { BoardHeader, EmptyState } from '../components/board-ui'

export function BoardReportsPage({ reports, hasError }: { reports: SeriesReportResDtoOutput[]; hasError: boolean }) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('reports.title')} description={t('reports.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4 md:grid-cols-2'>
        {reports.map((report) => (
          <article key={report.id} className='rounded-xl border border-border bg-card p-5 shadow-sm'>
            <h2 className='font-bold'>{report.reportType ?? t('reports.title')}</h2>
            <p className='mt-1 text-xs text-muted-foreground'>{report.seriesId}</p>
            <p className='mt-3 whitespace-pre-wrap text-sm text-muted-foreground'>{report.content}</p>
          </article>
        ))}
      </div>
      {!reports.length && <EmptyState text={t('reports.empty')} />}
    </div>
  )
}
