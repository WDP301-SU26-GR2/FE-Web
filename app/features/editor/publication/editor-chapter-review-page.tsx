import { Link, useFetcher } from 'react-router'
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Loader2,
  MessageSquareText,
  Pause,
  Play,
  Printer,
  RotateCcw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorChapterReviewData } from '../types'

export function EditorChapterReviewPage({
  data,
  hasError
}: {
  data: EditorChapterReviewData | null
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
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
  return (
    <div className='space-y-6 pb-12'>
      <Link
        to='/dashboard/editor/publication'
        className='inline-flex items-center gap-2 text-sm font-bold text-muted-foreground'
      >
        <ArrowLeft className='size-4' />
        {t('actions.backPublication')}
      </Link>
      <header className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <span className='rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground'>
          {(chapter.manuscriptStatus ?? chapter.status).replaceAll('_', ' ')}
        </span>
        <p className='mt-4 text-sm font-bold text-primary'>{series.title}</p>
        <h1 className='mt-1 text-3xl font-bold text-foreground'>
          {t('publication.chapter', { number: chapter.chapterNumber })}
          {chapter.title ? ` · ${chapter.title}` : ''}
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('chapterReview.pageCount', { count: pages.length })}</p>
      </header>
      {fetcher.data && (
        <div
          className={`rounded-xl border p-4 text-sm font-bold ${fetcher.data.ok ? 'border-primary/30 bg-primary/10 text-primary' : 'border-destructive/30 bg-destructive/10 text-destructive'}`}
        >
          {fetcher.data.ok
            ? t(`messages.${fetcher.data.messageKey}`)
            : t(`errors.${fetcher.data.errorKey ?? 'actionFailed'}`)}
        </div>
      )}
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
        </section>
      )}
      <section className='grid gap-4 xl:grid-cols-2'>
        <div className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
            <CalendarClock className='size-5 text-primary' />
            {t('chapterReview.production')}
          </h2>
          {data.progress && (
            <div className='mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4 text-sm'>
              <Metric label={t('chapterReview.progress')} value={`${data.progress.progressPct}%`} />
              <Metric label={t('chapterReview.warning')} value={data.progress.warningLevel} />
              <Metric
                label={t('chapterReview.pagesProgress')}
                value={`${data.progress.pagesCompleted}/${data.progress.totalPages}`}
              />
              <Metric
                label={t('chapterReview.remaining')}
                value={data.progress.remainingHours == null ? '—' : `${Math.round(data.progress.remainingHours)}h`}
              />
            </div>
          )}
          <fetcher.Form method='post' className='mt-4 grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input
              name='deadline'
              type='datetime-local'
              required
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
            />
            <input
              name='reason'
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
              placeholder={t('chapterReview.reason')}
            />
            <button
              name='intent'
              value={chapter.schedule?.currentDeadline ? 'extendSchedule' : 'setSchedule'}
              className='h-9 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground sm:col-span-2'
            >
              {chapter.schedule?.currentDeadline ? t('actions.extendDeadline') : t('actions.setDeadline')}
            </button>
          </fetcher.Form>
          <fetcher.Form method='post' className='mt-3 grid gap-3 sm:grid-cols-2'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input
              name='reason'
              required
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
              placeholder={t('chapterReview.holdReason')}
            />
            <input
              name='expectedReturnDate'
              type='datetime-local'
              className='h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground'
            />
            <button
              name='intent'
              value={data.progress?.onHold ? 'resumeChapter' : 'holdChapter'}
              className='inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-foreground sm:col-span-2'
            >
              {data.progress?.onHold ? <Play className='size-4' /> : <Pause className='size-4' />}
              {data.progress?.onHold ? t('actions.resumeChapter') : t('actions.holdChapter')}
            </button>
          </fetcher.Form>
        </div>
        <div className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
            <MessageSquareText className='size-5 text-primary' />
            {t('chapterReview.annotations')}
          </h2>
          <fetcher.Form method='post' className='mt-4 flex gap-2'>
            <input type='hidden' name='chapterId' value={chapter.id} />
            <input
              name='content'
              required
              className='h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm text-foreground'
              placeholder={t('chapterReview.annotationPlaceholder')}
            />
            <button
              name='intent'
              value='createAnnotation'
              className='rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
            >
              {t('actions.add')}
            </button>
          </fetcher.Form>
          <div className='mt-4 space-y-2'>
            {data.annotations.map((item) => (
              <article key={item.id} className='rounded-lg border border-border p-3'>
                <p className={`text-sm ${item.isResolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                  {item.content}
                </p>
                <fetcher.Form method='post' className='mt-2 flex gap-2'>
                  <input type='hidden' name='chapterId' value={chapter.id} />
                  <input type='hidden' name='annotationId' value={item.id} />
                  {!item.isResolved && (
                    <button name='intent' value='resolveAnnotation' className='text-xs font-bold text-primary'>
                      {t('actions.resolve')}
                    </button>
                  )}
                  <button name='intent' value='removeAnnotation' className='text-xs font-bold text-destructive'>
                    {t('actions.remove')}
                  </button>
                </fetcher.Form>
              </article>
            ))}
            {!data.annotations.length && (
              <p className='text-sm text-muted-foreground'>{t('chapterReview.emptyAnnotations')}</p>
            )}
          </div>
        </div>
      </section>
      <fetcher.Form method='post' className='sticky bottom-4 rounded-xl border border-border bg-card p-4 shadow-lg'>
        <input type='hidden' name='chapterId' value={chapter.id} />
        <textarea
          name='reason'
          maxLength={1000}
          rows={2}
          aria-label={t('actions.revisionReason')}
          placeholder={t('actions.revisionPlaceholder')}
          className='w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
        />
        <div className='mt-3 flex flex-wrap gap-2'>
          <button
            name='intent'
            value='approveManuscript'
            disabled={chapter.manuscriptStatus !== 'EDITOR_REVIEW' || busy}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
            {t('actions.approveManuscript')}
          </button>
          <button
            name='intent'
            value='reviseManuscript'
            disabled={chapter.manuscriptStatus !== 'EDITOR_REVIEW' || busy}
            className='inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-bold text-foreground disabled:opacity-50'
          >
            <RotateCcw className='size-4' />
            {t('actions.requestRevision')}
          </button>
          <button
            name='intent'
            value='publishChapter'
            disabled={chapter.manuscriptStatus !== 'READY_FOR_PRINT' || busy}
            className='inline-flex h-10 items-center gap-2 rounded-md bg-foreground px-4 text-sm font-bold text-background disabled:opacity-50'
          >
            <Printer className='size-4' />
            {t('actions.publish')}
          </button>
        </div>
        <p className='mt-2 text-xs text-muted-foreground'>{t('chapterReview.publishGate')}</p>
      </fetcher.Form>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}
