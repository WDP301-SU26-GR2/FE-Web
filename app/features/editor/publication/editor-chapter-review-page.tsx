import { Link, useFetcher } from 'react-router'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  Printer,
  RotateCcw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EditorAnnotationPanel } from '../components/editor-annotation-panel'

import type { EditorActionResult, EditorChapterReviewData } from '../types'

const HOLDABLE_MANUSCRIPT_STATUSES = new Set([
  'IN_PRODUCTION',
  'EDITOR_REVIEW',
  'EDITOR_REVISION',
  'READY_FOR_PRINT'
])

export function EditorChapterReviewPage({
  data,
  hasError
}: {
  data: EditorChapterReviewData | null
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  if (hasError || !data) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive'>
        {t('errors.loadDescription')}
      </div>
    )
  }
  const { series, chapter, pages } = data
  const busy = fetcher.state !== 'idle'
  const manuscriptStatus = chapter.manuscriptStatus ?? chapter.status
  const isOnHold = Boolean(data.progress?.onHold)
  const scheduleEditable = !['AWAITING_CO_OWNER_APPROVAL', 'PUBLISHED'].includes(chapter.manuscriptStatus ?? '')
  const holdable = isOnHold || HOLDABLE_MANUSCRIPT_STATUSES.has(chapter.manuscriptStatus ?? '')
  return (
    <div className='space-y-6 pb-12'>
      <Link
        to='/dashboard/editor/publication'
        className='inline-flex items-center gap-2 text-sm font-bold text-muted-foreground'
      >
        <ArrowLeft className='size-4' />
        {t('actions.backPublication')}
      </Link>
      <header className='rounded-2xl border border-border bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <span className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-extrabold text-primary'>
            <span className='size-2 rounded-full bg-primary' />
            {t(`publicationReviewUx.workflow.${manuscriptStatus}`)}
          </span>
          {isOnHold && (
            <span className='inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700'>
              <Pause className='size-3.5' />
              {t('publicationReviewUx.onHold')}
            </span>
          )}
        </div>
        <p className='mt-4 text-sm font-bold text-primary'>{series.title}</p>
        <h1 className='mt-1 text-3xl font-bold text-foreground'>
          {t('publication.chapter', { number: chapter.chapterNumber })}
          {chapter.title ? ` · ${chapter.title}` : ''}
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('chapterReview.pageCount', { count: pages.length })}</p>
      </header>
      <section className='grid overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-border'>
        <HeaderMetric
          icon={<FileCheck2 className='size-4' />}
          label={t('publicationReviewUx.pages')}
          value={t('chapterReview.pageCount', { count: pages.length })}
        />
        <HeaderMetric
          icon={<CheckCircle2 className='size-4' />}
          label={t('chapterReview.progress')}
          value={data.progress ? `${data.progress.progressPct}%` : t('common.notAvailable')}
        />
        <HeaderMetric
          icon={<CalendarClock className='size-4' />}
          label={t('publicationReviewUx.deadline')}
          value={formatDateTime(chapter.schedule?.currentDeadline, i18n.language)}
        />
      </section>
      {scheduleEditable && !chapter.schedule?.currentDeadline && (
        <a
          href='#deadline-management'
          className='flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 transition-colors hover:bg-amber-500/15 sm:flex-row sm:items-center sm:justify-between'
        >
          <span className='flex items-start gap-3'>
            <CalendarClock className='mt-0.5 size-5 shrink-0 text-amber-700' />
            <span>
              <span className='block text-sm font-bold text-foreground'>{t('chapterReview.deadlineMissing')}</span>
              <span className='mt-1 block text-xs leading-5 text-muted-foreground'>
                {t('chapterReview.deadlineMissingDescription')}
              </span>
            </span>
          </span>
          <span className='shrink-0 text-sm font-bold text-primary'>{t('chapterReview.setDeadlineNow')}</span>
        </a>
      )}
      {fetcher.data && (
        <div
          role='status'
          aria-live='polite'
          className={`rounded-xl border p-4 text-sm font-bold ${fetcher.data.ok ? 'border-primary/30 bg-primary/10 text-primary' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}
        >
          {fetcher.data.ok
            ? t(`messages.${fetcher.data.messageKey}`)
            : t(`errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
        </div>
      )}
      <WorkflowActionPanel data={data} />
      <section>
        <h2 className='mb-3 text-lg font-bold text-foreground'>{t('chapterReview.compositePages')}</h2>
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4'>
          {pages.map((page) => (
            <figure key={page.id} className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
              {page.url ? (
                <a href={page.url} target='_blank' rel='noreferrer'>
                  <img
                    src={page.url}
                    alt={t('proposalDetail.pageAlt', { number: page.pageNumber })}
                    className='aspect-[3/4] w-full object-cover'
                  />
                </a>
              ) : (
                <div className='flex aspect-[3/4] items-center justify-center bg-muted text-xs text-muted-foreground'>
                  {t('chapterReview.imageUnavailable')}
                </div>
              )}
              <figcaption className='flex justify-between p-3 text-xs'>
                <span className='font-bold text-foreground'>
                  {t('proposalDetail.page', { number: page.pageNumber })}
                </span>
                <span className='text-muted-foreground'>{page.status.replaceAll('_', ' ')}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      {data.name && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-lg font-bold text-foreground'>{t('chapterReview.nameTitle')}</h2>
            <span className='rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground'>
              {data.name.status}
            </span>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {data.namePages.map(
              (page) =>
                page.url && (
                  <img
                    key={page.pageNumber}
                    src={page.url}
                    alt={t('proposalDetail.pageAlt', { number: page.pageNumber })}
                    className='aspect-[3/4] rounded-lg border border-border object-cover'
                  />
                )
            )}
          </div>
          <fetcher.Form method='post' className='mt-4 space-y-3 border-t border-border pt-4'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input type='hidden' name='nameId' value={data.name.id} />
            <textarea
              name='reason'
              className='min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
              placeholder={t('actions.revisionPlaceholder')}
            />
            <div className='flex gap-2'>
              <button
                name='intent'
                value='approveChapterName'
                disabled={!['SUBMITTED', 'IN_REVIEW'].includes(data.name.status) || busy}
                className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('actions.approveName')}
              </button>
              <button
                name='intent'
                value='reviseChapterName'
                disabled={!['SUBMITTED', 'IN_REVIEW'].includes(data.name.status) || busy}
                className='h-9 rounded-md border border-border px-3 text-sm font-bold text-foreground disabled:opacity-50'
              >
                {t('actions.requestRevision')}
              </button>
            </div>
          </fetcher.Form>
          <div className='mt-5'>
            <EditorAnnotationPanel
              title={t('chapterReview.nameAnnotations')}
              annotations={data.nameAnnotations}
              target='NAME'
              targetId={data.name.id}
              contextFields={{ chapterId: chapter.id, nameId: data.name.id }}
            />
          </div>
        </section>
      )}
      <section className='grid gap-4 xl:grid-cols-2'>
        <div id='deadline-management' className='scroll-mt-6 rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
            <CalendarClock className='size-5 text-primary' />
            {t('chapterReview.production')}
          </h2>
          {chapter.schedule?.currentDeadline ? (
            <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='text-xs font-bold uppercase tracking-wider text-primary'>
                    {t('chapterReview.currentDeadline')}
                  </p>
                  <p className='mt-1 text-lg font-bold text-foreground'>
                    {formatDateTime(chapter.schedule.currentDeadline, i18n.language)}
                  </p>
                </div>
                {chapter.schedule.extended && (
                  <span className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700'>
                    {t('chapterReview.extended')}
                  </span>
                )}
              </div>
              <div className='mt-3 grid gap-3 border-t border-primary/15 pt-3 sm:grid-cols-2'>
                <Metric
                  label={t('chapterReview.originalDeadline')}
                  value={formatDateTime(chapter.schedule.originalDeadline, i18n.language)}
                />
                <Metric
                  label={t('chapterReview.remaining')}
                  value={formatRemainingHours(data.progress?.remainingHours, i18n.language)}
                />
              </div>
            </div>
          ) : (
            <div className='mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
              <AlertTriangle className='mt-0.5 size-5 shrink-0 text-amber-700' />
              <div>
                <p className='text-sm font-bold text-foreground'>{t('chapterReview.deadlineMissing')}</p>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {t('chapterReview.deadlineMissingDescription')}
                </p>
              </div>
            </div>
          )}
          {scheduleEditable && chapter.schedule?.currentDeadline && (
            <Link
              to={`/dashboard/editor/operations/deadlines?chapterId=${encodeURIComponent(chapter.id)}`}
              className='mt-2 inline-flex text-xs font-bold text-primary'
            >
              {t('chapterReview.openDeadlineNegotiation')}
            </Link>
          )}
          {data.progress && (
            <div className='mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm'>
              <Metric label={t('chapterReview.progress')} value={`${data.progress.progressPct}%`} />
              <Metric label={t('chapterReview.warning')} value={data.progress.warningLevel} />
              <Metric
                label={t('chapterReview.pagesProgress')}
                value={`${data.progress.pagesReady}/${data.progress.totalPages}`}
              />
              <Metric
                label={t('chapterReview.remaining')}
                value={data.progress.remainingHours == null ? '—' : `${Math.round(data.progress.remainingHours)}h`}
              />
            </div>
          )}
          <fetcher.Form method='post' className='mt-4 grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <label className='grid gap-1.5 text-xs font-bold text-foreground'>
              {chapter.schedule?.currentDeadline ? t('chapterReview.newDeadline') : t('chapterReview.initialDeadline')}
              <input
                name='deadline'
                type='datetime-local'
                required
                defaultValue={toDateTimeLocal(chapter.schedule?.currentDeadline)}
                disabled={!scheduleEditable || busy}
                className='h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'
              />
            </label>
            <label className='grid gap-1.5 text-xs font-bold text-foreground'>
              {t('chapterReview.reason')}
              <input
                name='reason'
                required={Boolean(chapter.schedule?.currentDeadline)}
                disabled={!scheduleEditable || busy}
                className='h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'
                placeholder={
                  chapter.schedule?.currentDeadline
                    ? t('chapterReview.extensionReasonPlaceholder')
                    : t('chapterReview.initialDeadlineReasonPlaceholder')
                }
              />
            </label>
            <button
              name='intent'
              value={chapter.schedule?.currentDeadline ? 'extendSchedule' : 'setSchedule'}
              disabled={!scheduleEditable || busy}
              className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2'
            >
              {chapter.schedule?.currentDeadline ? t('actions.extendDeadline') : t('actions.setDeadline')}
            </button>
          </fetcher.Form>
          <fetcher.Form method='post' className='mt-3 grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input
              name='reason'
              required={!data.progress?.onHold}
              disabled={!holdable || busy || Boolean(data.progress?.onHold)}
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
              placeholder={t('chapterReview.holdReason')}
            />
            <input
              name='expectedReturnDate'
              type='datetime-local'
              disabled={!holdable || busy || Boolean(data.progress?.onHold)}
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
            />
            <button
              name='intent'
              value={data.progress?.onHold ? 'resumeChapter' : 'holdChapter'}
              disabled={!holdable || busy}
              className='inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-foreground disabled:opacity-50 sm:col-span-2'
            >
              {data.progress?.onHold ? <Play className='size-4' /> : <Pause className='size-4' />}
              {data.progress?.onHold ? t('actions.resumeChapter') : t('actions.holdChapter')}
            </button>
          </fetcher.Form>
        </div>
        <EditorAnnotationPanel
          title={t('chapterReview.annotations')}
          annotations={data.annotations}
          target='MANUSCRIPT'
          targetId={chapter.id}
          contextFields={{ chapterId: chapter.id }}
        />
      </section>
    </div>
  )
}

function WorkflowActionPanel({ data }: { data: EditorChapterReviewData }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const { series, chapter, contract } = data
  const status = chapter.manuscriptStatus ?? chapter.status
  const busy = fetcher.state !== 'idle'
  const isOnHold = Boolean(data.progress?.onHold)
  const canReview = chapter.manuscriptStatus === 'EDITOR_REVIEW'
  const canPublish = chapter.manuscriptStatus === 'READY_FOR_PRINT'
  const endingPhase = ['CANCELLING', 'COMPLETING'].includes(series.status)
  const contractGateSatisfied = contract?.status === 'FULLY_EXECUTED' || endingPhase

  return (
    <section className='rounded-2xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          {canReview ? (
            <FileCheck2 className='size-5' />
          ) : canPublish ? (
            <Printer className='size-5' />
          ) : (
            <Clock3 className='size-5' />
          )}
        </div>
        <div>
          <p className='text-xs font-bold uppercase tracking-[0.16em] text-primary'>
            {t('publicationReviewUx.nextAction')}
          </p>
          <h2 className='mt-1 text-lg font-bold text-foreground'>{t(`publicationReviewUx.workflow.${status}`)}</h2>
          <p className='mt-1 text-sm leading-6 text-muted-foreground'>
            {t(`publicationReviewUx.workflowDescription.${status}`)}
          </p>
        </div>
      </div>

      {fetcher.data && (
        <div
          role='status'
          className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
            fetcher.data.ok
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          {fetcher.data.ok
            ? t(`messages.${fetcher.data.messageKey}`)
            : t(`errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
        </div>
      )}

      {canReview && (
        <div className='mt-5 grid gap-4 border-t border-border pt-5 lg:grid-cols-[1fr_18rem]'>
          <fetcher.Form method='post' className='space-y-3'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <label className='grid gap-1.5 text-sm font-semibold text-foreground'>
              {t('actions.revisionReason')}
              <textarea
                name='reason'
                required
                minLength={1}
                maxLength={1000}
                rows={3}
                disabled={busy || isOnHold}
                placeholder={t('actions.revisionPlaceholder')}
                className='w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50'
              />
            </label>
            <button
              name='intent'
              value='reviseManuscript'
              disabled={busy || isOnHold}
              className='inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
            >
              <RotateCcw className='size-4' />
              {t('actions.requestRevision')}
            </button>
          </fetcher.Form>
          <div className='flex flex-col justify-end border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0'>
            <p className='mb-3 text-xs leading-5 text-muted-foreground'>
              {t('publicationReviewUx.approveDescription')}
            </p>
            <fetcher.Form method='post'>
              <input type='hidden' name='chapterId' value={chapter.id} />
              <button
                name='intent'
                value='approveManuscript'
                disabled={busy || isOnHold}
                className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
                {t('actions.approveManuscript')}
              </button>
            </fetcher.Form>
          </div>
        </div>
      )}

      {canPublish && (
        <div className='mt-5 border-t border-border pt-5'>
          <div
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start ${
              contractGateSatisfied ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/30 bg-amber-500/10'
            }`}
          >
            {contractGateSatisfied ? (
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-emerald-700' />
            ) : (
              <LockKeyhole className='mt-0.5 size-5 shrink-0 text-amber-700' />
            )}
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-bold text-foreground'>
                {contractGateSatisfied
                  ? t('publicationReviewUx.contractReady')
                  : t('publicationReviewUx.contractBlocked')}
              </p>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                {endingPhase
                  ? t('publicationReviewUx.endingPhaseContractBypass')
                  : t('publicationReviewUx.contractStatus', {
                      status: contract?.status ?? t('publicationReviewUx.noContract')
                    })}
              </p>
            </div>
            <Link
              to={contract ? `/dashboard/editor/contracts/${contract.id}` : '/dashboard/editor/contracts'}
              className='shrink-0 text-xs font-bold text-primary hover:underline'
            >
              {t('publicationReviewUx.openContract')}
            </Link>
          </div>
          <fetcher.Form method='post' className='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <p className='max-w-xl text-xs leading-5 text-muted-foreground'>{t('chapterReview.publishGate')}</p>
            <button
              name='intent'
              value='publishChapter'
              disabled={busy || isOnHold || !contractGateSatisfied}
              className='inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-sm font-bold text-background shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <Printer className='size-4' />}
              {t('actions.publish')}
            </button>
          </fetcher.Form>
        </div>
      )}

      {!canReview && !canPublish && (
        <div className='mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
          <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          {t('publicationReviewUx.noActionAvailable')}
        </div>
      )}
    </section>
  )
}

function HeaderMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className='flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0'>
      <span className='text-primary'>{icon}</span>
      <div className='min-w-0'>
        <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>{label}</p>
        <p className='mt-0.5 truncate text-sm font-bold text-foreground'>{value}</p>
      </div>
    </div>
  )
}

function formatDateTime(iso: string | null | undefined, locale?: string) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatRemainingHours(hours: number | null | undefined, locale?: string) {
  if (hours == null) return '—'
  return new Intl.RelativeTimeFormat(locale, { numeric: 'always' }).format(Math.round(hours), 'hour')
}

function toDateTimeLocal(iso: string | null | undefined) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}
