import { ArrowLeft, BarChart3, BookOpen, CalendarClock, CheckCircle2, ClipboardList, Eye, FileText, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Form, Link } from 'react-router'
import { useState, type ReactNode } from 'react'
import type { TFunction } from 'i18next'

import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { ReprintRequestListItemDtoOutput } from '~/api/model/reprint-requests'
import type { ReprintRequestResDtoOutput } from '~/api/model/reprint-requests'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { deadlineControllerList } from '~/api/operations/deadline-requests/deadline-requests'
import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import {
  reprintRequestControllerFindAll,
  reprintRequestControllerFindById
} from '~/api/operations/reprint-requests/reprint-requests'
import { revisionControllerList } from '~/api/operations/revision/revision'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

interface MonitoringData {
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  reprints: ReprintRequestListItemDtoOutput[]
  selectedReprint: ReprintRequestResDtoOutput | null
  deadlines: MonitoringDeadline[]
  chapterId: string
  seriesId: string
  hasError: boolean
}

type MonitoringDeadline = DeadlineRequestListResDtoOutputItemsItem & { reason?: string | null }

export async function clientLoader({ request }: { request: Request }): Promise<MonitoringData> {
  const searchParams = new URL(request.url).searchParams
  const chapterId = searchParams.get('chapterId')?.trim() ?? ''
  const seriesId = searchParams.get('seriesId')?.trim() ?? ''
  const reprintId = searchParams.get('reprintId')?.trim() ?? ''
  const [seriesResult, chapterResult, revisionResult, reprintResult, deadlineResult, reprintDetailResult] =
    await Promise.allSettled([
      loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
      seriesId ? chapterControllerListBySeries({ seriesId }) : Promise.resolve(null),
      revisionControllerList({ limit: 100, offset: 0 }),
      reprintRequestControllerFindAll({
        status: undefined as unknown as string,
        seriesId: undefined as unknown as string
      }),
      chapterId ? deadlineControllerList({ chapterId }) : Promise.resolve(null),
      reprintId ? reprintRequestControllerFindById({ id: reprintId }) : Promise.resolve(null)
    ])

  const seriesOk = seriesResult.status === 'fulfilled'
  const revisionOk = revisionResult.status === 'fulfilled' && revisionResult.value.status === 200
  const reprintOk = reprintResult.status === 'fulfilled' && reprintResult.value.status === 200
  const deadlineOk = !chapterId || (deadlineResult.status === 'fulfilled' && deadlineResult.value?.status === 200)

  return {
    series: seriesOk ? seriesResult.value : [],
    chapters: chapterResult.status === 'fulfilled' && chapterResult.value?.status === 200 ? chapterResult.value.data.items : [],
    revisions: revisionOk ? (revisionResult.value.data as { items: RevisionRequestListResDtoOutputItemsItem[] }).items : [],
    reprints: reprintOk ? reprintResult.value.data : [],
    selectedReprint:
      reprintId && reprintDetailResult.status === 'fulfilled' && reprintDetailResult.value?.status === 200
        ? reprintDetailResult.value.data
        : null,
    deadlines: chapterId && deadlineResult.status === 'fulfilled' && deadlineResult.value?.status === 200
      ? deadlineResult.value.data.items as MonitoringDeadline[]
      : [],
    chapterId,
    seriesId,
    hasError: !seriesOk || !revisionOk || !reprintOk || !deadlineOk
  }
}

type MonitoringView = 'overview' | 'deadlines' | 'revisions' | 'reprints'

export default function AdminOperationsMonitoringRoute({ loaderData }: { loaderData: MonitoringData }) {
  const { t } = useTranslation('admin')
  const { series, chapters, revisions, reprints, selectedReprint, deadlines, chapterId, seriesId, hasError } = loaderData
  const [view, setView] = useState<MonitoringView>('overview')
  const [seriesSearch, setSeriesSearch] = useState('')
  const [seriesStatus, setSeriesStatus] = useState('')
  const [revisionType, setRevisionType] = useState('')
  const [revisionState, setRevisionState] = useState('')
  const [reprintSearch, setReprintSearch] = useState('')
  const [reprintStatus, setReprintStatus] = useState('')

  const localize = (group: string, value: string | null | undefined) => {
    const normalizedValue = value ?? 'UNKNOWN'
    return t(`operations.monitoring.${group}.${normalizedValue}`, { defaultValue: normalizedValue })
  }
  const filteredSeries = series.filter(
    (item) => (!seriesStatus || item.status === seriesStatus) && (!seriesSearch || item.title.toLowerCase().includes(seriesSearch.toLowerCase()))
  )
  const filteredRevisions = revisions.filter(
    (item) => (!revisionType || item.targetType === revisionType) && (!revisionState || (revisionState === 'RESOLVED' ? item.isResolved : !item.isResolved))
  )
  const filteredReprints = reprints.filter(
    (item) =>
      (!reprintStatus || item.status === reprintStatus) &&
      (!reprintSearch || (item.series?.title ?? item.seriesId).toLowerCase().includes(reprintSearch.toLowerCase()))
  )

  return (
    <div className='space-y-6 pb-12'>
      <Link to='/dashboard/admin/operations' className='inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline'>
        <ArrowLeft className='size-4' />
        {t('operations.back')}
      </Link>

      <header className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <div className='mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
            <Search className='size-4' aria-hidden='true' />
            <span>{t('operations.monitoring.eyebrow')}</span>
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>{t('operations.monitoring.title')}</h1>
          <p className='mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground'>{t('operations.monitoring.subtitle')}</p>
        </div>
        <span className='inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground'>
          <Eye className='size-4 text-primary' />
          {t('operations.monitoring.readOnly', { defaultValue: 'Chỉ đọc' })}
        </span>
      </header>

      {hasError && <p className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive'>{t('operations.monitoring.loadError')}</p>}

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard icon={BookOpen} label={t('operations.monitoring.series')} value={series.length} tone='orange' />
        <MetricCard icon={FileText} label={t('operations.monitoring.revisions')} value={revisions.filter((item) => !item.isResolved).length} detail={t('operations.monitoring.open')} tone='blue' />
        <MetricCard icon={ClipboardList} label={t('operations.monitoring.reprints')} value={reprints.length} tone='violet' />
        <MetricCard icon={CalendarClock} label={t('operations.monitoring.deadlines')} value={deadlines.length} detail={chapterId ? t('operations.monitoring.selectedChapter', { defaultValue: 'Chương đã chọn' }) : t('operations.monitoring.notSelected', { defaultValue: 'Chưa chọn chương' })} tone='green' />
      </div>

      {selectedReprint && <ReprintDetail reprint={selectedReprint} localize={localize} t={t} />}

      <div className='flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1'>
        <ViewButton active={view === 'overview'} onClick={() => setView('overview')} icon={BarChart3} label={t('operations.monitoring.overview', { defaultValue: 'Tổng quan' })} />
        <ViewButton active={view === 'deadlines'} onClick={() => setView('deadlines')} icon={CalendarClock} label={t('operations.monitoring.deadlines')} />
        <ViewButton active={view === 'revisions'} onClick={() => setView('revisions')} icon={FileText} label={t('operations.monitoring.revisions')} />
        <ViewButton active={view === 'reprints'} onClick={() => setView('reprints')} icon={ClipboardList} label={t('operations.monitoring.reprints')} />
      </div>

      {view === 'overview' && (
        <div className='grid gap-5 xl:grid-cols-[1.1fr_0.9fr]'>
          <SeriesPanel series={filteredSeries} allSeries={series} search={seriesSearch} status={seriesStatus} setSearch={setSeriesSearch} setStatus={setSeriesStatus} localize={localize} t={t} />
          <DeadlinePanel series={series} chapters={chapters} deadlines={deadlines} seriesId={seriesId} chapterId={chapterId} localize={localize} t={t} />
        </div>
      )}
      {view === 'deadlines' && <DeadlinePanel series={series} chapters={chapters} deadlines={deadlines} seriesId={seriesId} chapterId={chapterId} localize={localize} t={t} expanded />}
      {view === 'revisions' && <RevisionPanel revisions={filteredRevisions} allRevisions={revisions} type={revisionType} state={revisionState} setType={setRevisionType} setState={setRevisionState} localize={localize} t={t} />}
      {view === 'reprints' && <ReprintPanel reprints={filteredReprints} allReprints={reprints} search={reprintSearch} status={reprintStatus} setSearch={setReprintSearch} setStatus={setReprintStatus} localize={localize} t={t} />}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof BookOpen; label: string; value: number; detail?: string; tone: 'orange' | 'blue' | 'violet' | 'green' }) {
  const colors = { orange: 'bg-orange-50 text-orange-600', blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600', green: 'bg-emerald-50 text-emerald-600' }
  return <article className='rounded-xl border border-border bg-card p-4 shadow-sm'><div className='flex items-start justify-between gap-3'><span className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}><Icon className='size-5' /></span><strong className='text-2xl text-foreground'>{value}</strong></div><p className='mt-3 text-xs font-bold text-foreground'>{label}</p>{detail && <p className='mt-1 text-[11px] text-muted-foreground'>{detail}</p>}</article>
}

function ViewButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof BookOpen; label: string }) {
  return <button type='button' onClick={onClick} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition ${active ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}><Icon className='size-4' />{label}</button>
}

function SeriesPanel({ series, allSeries, search, status, setSearch, setStatus, localize, t }: { series: SeriesListResDtoOutputItemsItem[]; allSeries: SeriesListResDtoOutputItemsItem[]; search: string; status: string; setSearch: (value: string) => void; setStatus: (value: string) => void; localize: (group: string, value: string | null | undefined) => string; t: TFunction }) {
  return <Panel title={t('operations.monitoring.series')} description={t('operations.monitoring.seriesDescription', { defaultValue: 'Theo dõi trạng thái phát hành của toàn bộ bộ truyện.' })}>
    <div className='grid gap-2 md:grid-cols-[1fr_220px]'><input className={filterInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('operations.monitoring.filters.searchSeries')} /><select className={filterInput} value={status} onChange={(event) => setStatus(event.target.value)}><option value=''>{t('operations.monitoring.filters.allStatuses')}</option>{[...new Set(allSeries.map((item) => item.status))].map((value) => <option key={value} value={value}>{localize('seriesStatuses', value)}</option>)}</select></div>
    <div className='mt-4 space-y-2'>{series.slice(0, 12).map((item) => <article key={item.id} className='flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-3'><div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'><BookOpen className='size-4' /></div><div className='min-w-0 flex-1'><p className='truncate text-xs font-bold text-foreground'>{item.title}</p><p className='mt-1 text-[11px] text-muted-foreground'>{localize('seriesStatuses', item.status)}</p></div></article>)}{!series.length && <EmptyState text={t('operations.monitoring.empty')} />}</div>
    {series.length > 12 && <p className='mt-3 text-center text-[11px] text-muted-foreground'>{t('operations.monitoring.showingFirst', { defaultValue: 'Đang hiển thị 12 kết quả đầu.' })}</p>}
  </Panel>
}

function DeadlinePanel({ series, chapters, deadlines, seriesId, chapterId, localize, t, expanded = false }: { series: SeriesListResDtoOutputItemsItem[]; chapters: ChapterListResDtoOutputItemsItem[]; deadlines: MonitoringDeadline[]; seriesId: string; chapterId: string; localize: (group: string, value: string | null | undefined) => string; t: TFunction; expanded?: boolean }) {
  return <Panel title={t('operations.monitoring.deadlines')} description={t('operations.monitoring.deadlinesDescription', { defaultValue: 'Tra cứu các yêu cầu thay đổi thời hạn theo từng chương.' })}>
    <Form method='get' className='grid gap-2 md:grid-cols-[1fr_1fr_auto]'><select name='seriesId' defaultValue={seriesId} className={filterInput}><option value=''>{t('operations.monitoring.selectSeries')}</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><select name='chapterId' defaultValue={chapterId} disabled={!seriesId} className={`${filterInput} disabled:opacity-60`}><option value=''>{t('operations.monitoring.selectChapter')}</option>{chapters.map((item) => <option key={item.id} value={item.id}>{t('operations.monitoring.chapterOption', { number: item.chapterNumber, title: item.title || '' })}</option>)}</select><button className='rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground'>{t('operations.monitoring.search')}</button></Form>
    <div className={`mt-4 space-y-2 ${expanded ? '' : 'max-h-80 overflow-y-auto'}`}>{deadlines.map((item) => <article key={item.id} className='rounded-lg border border-border bg-background/50 p-3'><div className='flex flex-wrap items-center justify-between gap-2'><p className='text-xs font-bold text-foreground'>{item.chapter?.title || item.chapterId || t('operations.monitoring.selectChapter')}</p><StatusBadge label={localize('deadlineStatuses', item.status)} tone={item.status === 'REJECTED' ? 'red' : 'blue'} /></div><div className='mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-3'><Info label={t('operations.monitoring.currentDeadline', { defaultValue: 'Hạn hiện tại' })} value={formatDateTime(item.currentDeadline)} /><Info label={t('operations.monitoring.requestedDeadline', { defaultValue: 'Hạn đề xuất' })} value={formatDateTime(item.requestedDeadline)} /><Info label={t('operations.monitoring.requestedBy', { defaultValue: 'Bên đề xuất' })} value={localize('deadlineRequesters', item.requestedBy)} /></div>{item.reason && <p className='mt-3 border-t border-border pt-2 text-xs text-muted-foreground'>{item.reason}</p>}</article>)}{!deadlines.length && <EmptyState text={chapterId ? t('operations.monitoring.empty') : t('operations.monitoring.deadlineHint')} />}</div>
  </Panel>
}

function RevisionPanel({ revisions, allRevisions, type, state, setType, setState, localize, t }: { revisions: RevisionRequestListResDtoOutputItemsItem[]; allRevisions: RevisionRequestListResDtoOutputItemsItem[]; type: string; state: string; setType: (value: string) => void; setState: (value: string) => void; localize: (group: string, value: string | null | undefined) => string; t: TFunction }) {
  return <Panel title={t('operations.monitoring.revisions')} description={t('operations.monitoring.revisionsDescription', { defaultValue: 'Theo dõi các vòng yêu cầu sửa và người đang xử lý.' })}><div className='grid gap-2 md:grid-cols-2'><select className={filterInput} value={type} onChange={(event) => setType(event.target.value)}><option value=''>{t('operations.monitoring.filters.allRevisionTypes')}</option>{[...new Set(allRevisions.map((item) => item.targetType))].map((value) => <option key={value} value={value}>{localize('revisionTypes', value)}</option>)}</select><select className={filterInput} value={state} onChange={(event) => setState(event.target.value)}><option value=''>{t('operations.monitoring.filters.allResolutionStates')}</option><option value='OPEN'>{t('operations.monitoring.open')}</option><option value='RESOLVED'>{t('operations.monitoring.resolved')}</option></select></div><div className='mt-4 grid gap-3 lg:grid-cols-2'>{revisions.map((item) => <article key={item.id} className='rounded-lg border border-border bg-background/50 p-4'><div className='flex items-start justify-between gap-3'><div><p className='text-xs font-bold text-foreground'>{item.series?.title || item.seriesId || t('operations.monitoring.unknownSeries')}</p><p className='mt-1 text-[11px] text-primary'>{localize('revisionTypes', item.targetType)} / {t('operations.monitoring.round', { defaultValue: 'Vòng {{value}}', value: item.round })}</p></div><StatusBadge label={item.isResolved ? t('operations.monitoring.resolved') : t('operations.monitoring.open')} tone={item.isResolved ? 'green' : 'orange'} /></div><p className='mt-3 line-clamp-2 text-xs text-muted-foreground'>{item.reason || t('operations.monitoring.noReason')}</p><div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground'><span>{t('operations.monitoring.requestedBy', { defaultValue: 'Đề xuất bởi' })}: {item.requester?.displayName || item.requestedBy}</span><span>{formatDateTime(item.createdAt)}</span></div></article>)}{!revisions.length && <div className='lg:col-span-2'><EmptyState text={t('operations.monitoring.empty')} /></div>}</div></Panel>
}

function ReprintPanel({ reprints, allReprints, search, status, setSearch, setStatus, localize, t }: { reprints: ReprintRequestListItemDtoOutput[]; allReprints: ReprintRequestListItemDtoOutput[]; search: string; status: string; setSearch: (value: string) => void; setStatus: (value: string) => void; localize: (group: string, value: string | null | undefined) => string; t: TFunction }) {
  return <Panel title={t('operations.monitoring.reprints')} description={t('operations.monitoring.reprintsDescription', { defaultValue: 'Tra cứu yêu cầu tái bản và mở chi tiết khi cần đối chiếu.' })}><div className='grid gap-2 md:grid-cols-[1fr_220px]'><input className={filterInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('operations.monitoring.filters.searchReprints')} /><select className={filterInput} value={status} onChange={(event) => setStatus(event.target.value)}><option value=''>{t('operations.monitoring.filters.allStatuses')}</option>{[...new Set(allReprints.map((item) => item.status))].map((value) => <option key={value} value={value}>{localize('reprintStatuses', value)}</option>)}</select></div><div className='mt-4 grid gap-3 lg:grid-cols-2'>{reprints.map((item) => <article key={item.id} className='rounded-lg border border-border bg-background/50 p-4'><div className='flex items-start justify-between gap-3'><div className='min-w-0'><p className='truncate text-xs font-bold text-foreground'>{item.series?.title || t('operations.monitoring.unknownSeries')}</p><p className='mt-1 text-[11px] text-muted-foreground'>{item.chapterRangeStart || item.chapterRangeEnd ? `Ch. ${item.chapterRangeStart ?? '?'} - ${item.chapterRangeEnd ?? '?'}` : t('operations.monitoring.allChapters', { defaultValue: 'Toàn bộ chương' })}</p></div><StatusBadge label={localize('reprintStatuses', item.status)} tone={item.status === 'REJECTED' || item.status === 'REJECTED_BY_MANGAKA' ? 'red' : 'blue'} /></div><div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground'><span>{localize('revisionModes', item.revisionMode)}</span><span>{formatDateTime(item.createdAt)}</span></div><Link to={`/dashboard/admin/operations/monitoring?reprintId=${encodeURIComponent(item.id)}`} className='mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline'><Eye className='size-3.5' />{t('operations.monitoring.viewDetail', { defaultValue: 'Xem chi tiết' })}</Link></article>)}{!reprints.length && <div className='lg:col-span-2'><EmptyState text={t('operations.monitoring.empty')} /></div>}</div></Panel>
}

function ReprintDetail({ reprint, localize, t }: { reprint: ReprintRequestResDtoOutput; localize: (group: string, value: string | null | undefined) => string; t: TFunction }) {
  return <section className='rounded-xl border border-primary/25 bg-primary/5 p-5'><div className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-xs font-bold uppercase tracking-[0.16em] text-primary'>{t('operations.monitoring.detailTitle', { defaultValue: 'Chi tiết yêu cầu tái bản' })}</p><h2 className='mt-1 text-lg font-bold text-foreground'>{reprint.series?.title || t('operations.monitoring.unknownSeries')}</h2></div><Link to='/dashboard/admin/operations/monitoring' className='text-xs font-bold text-primary hover:underline'>{t('operations.monitoring.closeDetail', { defaultValue: 'Đóng chi tiết' })}</Link></div><div className='mt-4 grid gap-3 sm:grid-cols-4'><Info label={t('operations.monitoring.status', { defaultValue: 'Trạng thái' })} value={localize('reprintStatuses', reprint.status)} /><Info label={t('operations.monitoring.mode', { defaultValue: 'Hình thức' })} value={localize('revisionModes', reprint.revisionMode)} /><Info label={t('operations.monitoring.requestedBy', { defaultValue: 'Người yêu cầu' })} value={reprint.requester?.displayName || reprint.requestedBy || t('common.notAvailable')} /><Info label={t('operations.monitoring.createdAt', { defaultValue: 'Ngày tạo' })} value={formatDateTime(reprint.createdAt)} /></div>{reprint.reason && <p className='mt-4 rounded-lg border border-primary/10 bg-card p-3 text-xs text-muted-foreground'>{reprint.reason}</p>}<div className='mt-4'><p className='text-xs font-bold text-foreground'>{t('operations.monitoring.chapters', { defaultValue: 'Các chương trong yêu cầu' })}</p><div className='mt-2 flex flex-wrap gap-2'>{reprint.chapters.map((chapter, index) => <span key={chapter.originalChapterId} className='rounded-lg border border-border bg-card px-3 py-2 text-xs'><strong>#{index + 1}</strong><span className='mx-1 text-muted-foreground'>/</span>{localize('reprintChapterStatuses', chapter.status)}</span>)}</div></div></section>
}

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className='rounded-xl border border-border bg-card p-5 shadow-sm'><div className='mb-4 flex items-start gap-3'><span className='mt-0.5 grid size-8 place-items-center rounded-lg bg-primary/10 text-primary'><ClipboardList className='size-4' /></span><div><h2 className='font-bold text-foreground'>{title}</h2><p className='mt-1 text-xs text-muted-foreground'>{description}</p></div></div>{children}</section>
}

function StatusBadge({ label, tone }: { label: string; tone: 'green' | 'orange' | 'blue' | 'red' }) {
  const colors = { green: 'bg-emerald-100 text-emerald-700', orange: 'bg-orange-100 text-orange-700', blue: 'bg-blue-100 text-blue-700', red: 'bg-red-100 text-red-700' }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${colors[tone]}`}><CheckCircle2 className='size-3' />{label}</span>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>{label}</p><p className='mt-1 text-xs font-bold text-foreground'>{value}</p></div>
}

function EmptyState({ text }: { text: string }) {
  return <p className='rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground'>{text}</p>
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const filterInput = 'h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
