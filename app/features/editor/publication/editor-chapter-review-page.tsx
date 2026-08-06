import { Link, useFetcher, useRevalidator } from 'react-router'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
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
import { EditorActionToast } from '../components/editor-action-toast'

import type { EditorActionResult, EditorChapterReviewData } from '../types'
import { ratioToPercent } from '~/shared/lib/progress'
import { Dialog, useDialogClose } from '~/shared/ui/dialog'

const HOLDABLE_MANUSCRIPT_STATUSES = new Set(['IN_PRODUCTION', 'EDITOR_REVIEW', 'EDITOR_REVISION', 'READY_FOR_PRINT'])

export function EditorChapterReviewPage({
  data,
  hasError
}: {
  data: EditorChapterReviewData | null
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const revalidator = useRevalidator()
  const [storyboardReviewOpen, setStoryboardReviewOpen] = useState(false)
  const [deadlineOpen, setDeadlineOpen] = useState(false)
  const [holdOpen, setHoldOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<'manuscript' | 'storyboard' | 'production'>('manuscript')

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && fetcher.state === 'idle' && revalidator.state === 'idle') {
        void revalidator.revalidate()
      }
    }, 15_000)
    return () => window.clearInterval(timer)
  }, [fetcher.state, revalidator])

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
        className='inline-flex items-center gap-2 text-xs font-bold text-muted-foreground'
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
            <span className='inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-bold text-warning'>
              <Pause className='size-3.5' />
              {t('publicationReviewUx.onHold')}
            </span>
          )}
        </div>
        <p className='mt-4 text-xs font-bold text-primary'>{series.title}</p>
        <h1 className='mt-1 text-2xl font-bold text-foreground'>
          {t('publication.chapter', { number: chapter.chapterNumber })}
          {chapter.title ? ` · ${chapter.title}` : ''}
        </h1>
        <p className='mt-2 text-xs text-muted-foreground'>{t('chapterReview.pageCount', { count: pages.length })}</p>
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
          value={data.progress ? `${ratioToPercent(data.progress.progressPct)}%` : t('common.notAvailable')}
        />
        <HeaderMetric
          icon={<CalendarClock className='size-4' />}
          label={t('publicationReviewUx.deadline')}
          value={formatDateTime(chapter.schedule?.currentDeadline, i18n.language)}
        />
      </section>
      {scheduleEditable && !chapter.schedule?.currentDeadline && (
        <button
          type='button'
          onClick={() => setActiveSection('production')}
          className='flex w-full flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-left transition-colors hover:bg-warning/15 sm:flex-row sm:items-center sm:justify-between'
        >
          <span className='flex items-start gap-3'>
            <CalendarClock className='mt-0.5 size-5 shrink-0 text-warning' />
            <span>
              <span className='block text-xs font-bold text-foreground'>{t('chapterReview.deadlineMissing')}</span>
              <span className='mt-1 block text-xs leading-5 text-muted-foreground'>
                {t('chapterReview.deadlineMissingDescription')}
              </span>
            </span>
          </span>
          <span className='shrink-0 text-xs font-bold text-primary'>{t('chapterReview.setDeadlineNow')}</span>
        </button>
      )}
      <EditorActionToast data={fetcher.data} scope={`editor-chapter-${chapter.id}`} />
      <WorkflowActionPanel data={data} />
      <nav
        aria-label={t('chapterReview.reviewSections')}
        className='grid overflow-hidden rounded-xl border border-border bg-card p-1 sm:grid-cols-3'
      >
        <SectionTab
          active={activeSection === 'manuscript'}
          onClick={() => setActiveSection('manuscript')}
          label={t('chapterReview.compositePages')}
          count={pages.length}
        />
        {data.storyboard && (
          <SectionTab
            active={activeSection === 'storyboard'}
            onClick={() => setActiveSection('storyboard')}
            label={t('chapterReview.storyboardTitle')}
            count={data.storyboardPages.length}
          />
        )}
        <SectionTab
          active={activeSection === 'production'}
          onClick={() => setActiveSection('production')}
          label={t('chapterReview.production')}
        />
      </nav>
      {activeSection === 'manuscript' && (
        <section>
          <h2 className='mb-3 text-base font-bold text-foreground'>{t('chapterReview.compositePages')}</h2>
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
                  <span className='text-muted-foreground'>{t(`chapterReview.pageStatuses.${page.status}`)}</span>
                </figcaption>
                <p className='border-t border-border px-3 py-2 text-[11px] text-muted-foreground'>
                  {t('chapterReview.regionCount', {
                    count: data.regionsByPage[page.id]?.length ?? 0
                  })}
                </p>
              </figure>
            ))}
          </div>
        </section>
      )}
      {activeSection === 'storyboard' && data.storyboard && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <h2 className='min-w-0 text-pretty text-base font-bold leading-6 text-foreground'>
              {t('chapterReview.storyboardTitle')}
            </h2>
            <span className='rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground'>
              {t(`filters.storyboardStatuses.${data.storyboard.status}`, {
                defaultValue: t('common.notAvailable')
              })}
            </span>
          </div>
          <div className='mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {data.storyboardPages.map(
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
          <div className='mt-4 flex flex-wrap justify-end gap-2 border-t border-border pt-4'>
            <button
              type='button'
              onClick={() => setStoryboardReviewOpen(true)}
              disabled={!['SUBMITTED', 'IN_REVIEW'].includes(data.storyboard.status) || busy}
              className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
            >
              <FileCheck2 className='size-4' />
              {t('actions.review')}
            </button>
          </div>
        </section>
      )}
      {activeSection === 'production' && (
        <section>
          <div id='deadline-management' className='scroll-mt-6 rounded-xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <h2 className='flex items-center gap-2 text-base font-bold text-foreground'>
                <CalendarClock className='size-5 text-primary' />
                {t('chapterReview.production')}
              </h2>
            </div>
            {chapter.schedule?.currentDeadline ? (
              <div className='mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs font-bold uppercase tracking-wider text-primary'>
                      {t('chapterReview.currentDeadline')}
                    </p>
                    <p className='mt-1 text-base font-bold text-foreground'>
                      {formatDateTime(chapter.schedule.currentDeadline, i18n.language)}
                    </p>
                  </div>
                  {chapter.schedule.extended && (
                    <span className='rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning'>
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
              <div className='mt-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4'>
                <AlertTriangle className='mt-0.5 size-5 shrink-0 text-warning' />
                <div>
                  <p className='text-xs font-bold text-foreground'>{t('chapterReview.deadlineMissing')}</p>
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
              <div className='mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-xs'>
                <Metric label={t('chapterReview.progress')} value={`${ratioToPercent(data.progress.progressPct)}%`} />
                <Metric
                  label={t('chapterReview.warning')}
                  value={t(`operations.riskLevels.${data.progress.warningLevel}`, {
                    defaultValue: t('common.notAvailable')
                  })}
                />
                <Metric
                  label={t('chapterReview.pagesProgress')}
                  value={`${data.progress.pagesReady}/${data.progress.totalPages}`}
                />
                <Metric
                  label={t('chapterReview.remaining')}
                  value={formatRemainingHours(data.progress.remainingHours, i18n.language)}
                />
              </div>
            )}
            {data.stages && (
              <div className='mt-4 space-y-3 rounded-lg border border-border p-4'>
                <div>
                  <h3 className='font-bold text-foreground'>{t('chapterReview.productionStages')}</h3>
                  <p className='mt-1 text-xs text-muted-foreground'>{t('chapterReview.currentRevisionRound')}</p>
                </div>
                {data.stages.stages.map((stage) => (
                  <div key={stage.id} className='grid gap-2 rounded-md bg-muted p-3 text-xs sm:grid-cols-4'>
                    <strong className='text-foreground'>
                      {stage.order}.{' '}
                      {t(`chapterReview.stageNames.${stage.name}`, {
                        defaultValue: t('common.notAvailable')
                      })}
                    </strong>
                    <span>
                      {t(`chapterReview.stageStatuses.${stage.status}`, {
                        defaultValue: t('common.notAvailable')
                      })}
                    </span>
                    <span>{t('chapterReview.openTasks', { count: stage.analytics.openCount })}</span>
                    <span>
                      {t('chapterReview.stageOutputs', {
                        ready: data.stagePages.filter((page) => page.stageId === stage.id && page.outputReady).length,
                        total: data.stagePages.filter((page) => page.stageId === stage.id).length
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <fetcher.Form method='post' className='mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]'>
              <input type='hidden' name='chapterId' value={chapter.id} />
              <label className='grid gap-1.5 text-xs font-bold text-foreground'>
                {chapter.schedule?.currentDeadline
                  ? t('chapterReview.newDeadline')
                  : t('chapterReview.initialDeadline')}
                <input
                  name='deadline'
                  type='datetime-local'
                  required
                  defaultValue={toDateTimeLocal(chapter.schedule?.currentDeadline)}
                  disabled={!scheduleEditable || busy}
                  className='h-10 rounded-md border border-input bg-background px-3 text-xs font-normal text-foreground disabled:opacity-50'
                />
              </label>
              <button
                name='intent'
                value={chapter.schedule?.currentDeadline ? 'extendSchedule' : 'setSchedule'}
                disabled={!scheduleEditable || busy}
                className='inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
              >
                <CalendarClock className='size-4' />
                {chapter.schedule?.currentDeadline ? t('actions.extendDeadline') : t('actions.setDeadline')}
              </button>
              <button
                type='button'
                onClick={() => setHoldOpen(true)}
                disabled={!holdable || busy}
                className='inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-border px-4 text-xs font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-50'
              >
                {data.progress?.onHold ? <Play className='size-4' /> : <Pause className='size-4' />}
                {data.progress?.onHold ? t('actions.resumeChapter') : t('actions.holdChapter')}
              </button>
            </fetcher.Form>
          </div>
        </section>
      )}
      {data.storyboard && (
        <Dialog
          compact
          open={storyboardReviewOpen}
          onClose={() => setStoryboardReviewOpen(false)}
          titleId='chapter-storyboard-review-title'
          title={t('chapterReview.storyboardTitle')}
          description={t('publicationReviewUx.approveDescription')}
          size='md'
        >
          <CloseDialogOnSuccess data={fetcher.data} state={fetcher.state} />
          <fetcher.Form method='post' className='space-y-4'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input type='hidden' name='storyboardId' value={data.storyboard.id} />
            <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
              {t('actions.revisionReason')}
              <textarea
                name='reason'
                maxLength={1000}
                className='min-h-24 w-full rounded-md border border-input bg-background p-3 text-xs font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
                placeholder={t('actions.revisionPlaceholder')}
              />
            </label>
            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <button
                name='intent'
                value='reviseStoryboard'
                disabled={busy}
                className='h-10 rounded-md border border-border px-4 text-xs font-bold text-foreground disabled:opacity-50'
              >
                {t('actions.requestRevision')}
              </button>
              <button
                name='intent'
                value='approveStoryboard'
                disabled={busy}
                className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
              >
                {t('actions.approveStoryboard')}
              </button>
            </div>
          </fetcher.Form>
        </Dialog>
      )}
      <Dialog
        compact
        open={deadlineOpen}
        onClose={() => setDeadlineOpen(false)}
        titleId='chapter-deadline-title'
        title={chapter.schedule?.currentDeadline ? t('actions.extendDeadline') : t('actions.setDeadline')}
        size='sm'
      >
        <CloseDialogOnSuccess data={fetcher.data} state={fetcher.state} />
        <fetcher.Form method='post' className='space-y-4'>
          <input type='hidden' name='chapterId' value={chapter.id} />
          <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
            {chapter.schedule?.currentDeadline ? t('chapterReview.newDeadline') : t('chapterReview.initialDeadline')}
            <input
              name='deadline'
              type='datetime-local'
              required
              defaultValue={toDateTimeLocal(chapter.schedule?.currentDeadline)}
              disabled={busy}
              className='h-10 rounded-md border border-input bg-background px-3 text-xs font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'
            />
          </label>
          <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
            {t('chapterReview.reason')}
            <input
              name='reason'
              required={Boolean(chapter.schedule?.currentDeadline)}
              disabled={busy}
              className='h-10 rounded-md border border-input bg-background px-3 text-xs font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'
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
            disabled={busy}
            className='h-10 w-full rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            {chapter.schedule?.currentDeadline ? t('actions.extendDeadline') : t('actions.setDeadline')}
          </button>
        </fetcher.Form>
      </Dialog>
      <Dialog
        compact
        open={holdOpen}
        onClose={() => setHoldOpen(false)}
        titleId='chapter-hold-title'
        title={data.progress?.onHold ? t('actions.resumeChapter') : t('actions.holdChapter')}
        size='sm'
      >
        <CloseDialogOnSuccess data={fetcher.data} state={fetcher.state} />
        <fetcher.Form method='post' className='space-y-4'>
          <input type='hidden' name='chapterId' value={chapter.id} />
          {!data.progress?.onHold && (
            <>
              <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
                {t('chapterReview.reason')}
                <input
                  name='reason'
                  required
                  disabled={busy}
                  className='h-10 rounded-md border border-input bg-background px-3 text-xs font-normal text-foreground'
                  placeholder={t('chapterReview.holdReason')}
                />
              </label>
              <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
                {t('chapterReview.expectedReturnDate')}
                <input
                  name='expectedReturnDate'
                  type='datetime-local'
                  disabled={busy}
                  className='h-10 rounded-md border border-input bg-background px-3 text-xs font-normal text-foreground'
                />
              </label>
            </>
          )}
          <button
            name='intent'
            value={data.progress?.onHold ? 'resumeChapter' : 'holdChapter'}
            disabled={busy}
            className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            {data.progress?.onHold ? <Play className='size-4' /> : <Pause className='size-4' />}
            {data.progress?.onHold ? t('actions.resumeChapter') : t('actions.holdChapter')}
          </button>
        </fetcher.Form>
      </Dialog>
    </div>
  )
}

function WorkflowActionPanel({ data }: { data: EditorChapterReviewData }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const [actionOpen, setActionOpen] = useState(false)

  const { series, chapter, contract } = data
  const status = chapter.manuscriptStatus ?? chapter.status
  const busy = fetcher.state !== 'idle'
  const isOnHold = Boolean(data.progress?.onHold)
  const canReview = chapter.manuscriptStatus === 'EDITOR_REVIEW'
  const canPublish = chapter.manuscriptStatus === 'READY_FOR_PRINT'
  const incompletePageCount = data.pages.filter((page) => page.status !== 'COMPLETED').length
  const pagesReadyForPublish = incompletePageCount === 0
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
          <h2 className='mt-1 text-base font-bold text-foreground'>{t(`publicationReviewUx.workflow.${status}`)}</h2>
          <p className='mt-1 text-xs leading-6 text-muted-foreground'>
            {t(`publicationReviewUx.workflowDescription.${status}`)}
          </p>
        </div>
      </div>

      <EditorActionToast data={fetcher.data} scope={`editor-workflow-${chapter.id}`} />

      {canReview && (
        <div className='mt-5 flex justify-end border-t border-border pt-4'>
          <button
            type='button'
            onClick={() => setActionOpen(true)}
            disabled={busy || isOnHold}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
          >
            <FileCheck2 className='size-4' />
            {t('actions.review')}
          </button>
        </div>
      )}

      {canPublish && (
        <div className='mt-5 border-t border-border pt-5'>
          {!pagesReadyForPublish && (
            <div className='mb-4 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4'>
              <AlertTriangle className='mt-0.5 size-5 shrink-0 text-warning' />
              <div>
                <p className='text-xs font-bold text-foreground'>{t('publicationReviewUx.pagesBlocked')}</p>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {t('publicationReviewUx.pagesBlockedDescription', { count: incompletePageCount })}
                </p>
              </div>
            </div>
          )}
          <div
            className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start ${
              contractGateSatisfied ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10'
            }`}
          >
            {contractGateSatisfied ? (
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-success' />
            ) : (
              <LockKeyhole className='mt-0.5 size-5 shrink-0 text-warning' />
            )}
            <div className='min-w-0 flex-1'>
              <p className='text-xs font-bold text-foreground'>
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
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
            <p className='max-w-xl text-xs leading-5 text-muted-foreground'>{t('chapterReview.publishGate')}</p>
            <button
              type='button'
              onClick={() => setActionOpen(true)}
              disabled={busy || isOnHold || !contractGateSatisfied || !pagesReadyForPublish}
              className='inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-xs font-bold text-background shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40'
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <Printer className='size-4' />}
              {t('actions.publish')}
            </button>
          </div>
        </div>
      )}

      {!canReview && !canPublish && (
        <div className='mt-5 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
          <AlertTriangle className='mt-0.5 size-4 shrink-0' />
          {t('publicationReviewUx.noActionAvailable')}
        </div>
      )}
      <Dialog
        compact
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        titleId='publication-workflow-action-title'
        title={canReview ? t('actions.review') : t('actions.publish')}
        description={canReview ? t('publicationReviewUx.approveDescription') : t('chapterReview.publishGate')}
        size={canReview ? 'lg' : 'sm'}
      >
        <CloseDialogOnSuccess data={fetcher.data} state={fetcher.state} />
        {canReview ? (
          <div className='space-y-4'>
            <fetcher.Form method='post' className='space-y-4'>
              <input type='hidden' name='chapterId' value={chapter.id} />
              <label className='grid gap-1.5 text-xs font-semibold text-foreground'>
                {t('actions.revisionReason')}
                <textarea
                  name='reason'
                  required
                  minLength={1}
                  maxLength={1000}
                  rows={5}
                  disabled={busy || isOnHold}
                  placeholder={t('actions.revisionPlaceholder')}
                  className='w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs font-normal text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50'
                />
              </label>
              <p className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-6 text-muted-foreground'>
                {t('publicationReviewUx.approveDescription')}
              </p>
              <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                <button
                  name='intent'
                  value='reviseManuscript'
                  disabled={busy || isOnHold}
                  className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-xs font-bold text-foreground disabled:opacity-50'
                >
                  <RotateCcw className='size-4' />
                  {t('actions.requestRevision')}
                </button>
                <button
                  name='intent'
                  value='approveManuscript'
                  formNoValidate
                  disabled={busy || isOnHold}
                  className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
                >
                  {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
                  {t('actions.approveManuscript')}
                </button>
              </div>
            </fetcher.Form>
          </div>
        ) : (
          <fetcher.Form method='post' className='space-y-4'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <div className='flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4'>
              <CheckCircle2 className='mt-0.5 size-5 shrink-0 text-success' />
              <p className='text-xs leading-6 text-foreground'>
                {pagesReadyForPublish
                  ? t('publicationReviewUx.contractReady')
                  : t('publicationReviewUx.pagesBlockedDescription', { count: incompletePageCount })}
              </p>
            </div>
            <button
              name='intent'
              value='publishChapter'
              disabled={busy || isOnHold || !contractGateSatisfied || !pagesReadyForPublish}
              className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-foreground px-5 text-xs font-bold text-background disabled:opacity-40'
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <Printer className='size-4' />}
              {t('actions.publish')}
            </button>
          </fetcher.Form>
        )}
      </Dialog>
    </section>
  )
}

function CloseDialogOnSuccess({
  data,
  state
}: {
  data?: EditorActionResult
  state: 'idle' | 'loading' | 'submitting'
}) {
  const closeDialog = useDialogClose()
  const initialData = useRef(data)

  useEffect(() => {
    if (state === 'idle' && data?.ok && data !== initialData.current) closeDialog?.()
  }, [closeDialog, data, state])

  return null
}

function SectionTab({
  active,
  onClick,
  label,
  count
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
      {count != null && (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function HeaderMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className='flex items-center gap-3 border-b border-border px-5 py-4 last:border-b-0 sm:border-b-0'>
      <span className='text-primary'>{icon}</span>
      <div className='min-w-0'>
        <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>{label}</p>
        <p className='mt-0.5 truncate text-xs font-bold text-foreground'>{value}</p>
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
