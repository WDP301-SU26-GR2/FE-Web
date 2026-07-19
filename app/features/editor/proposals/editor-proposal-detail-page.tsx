import { Link, useFetcher } from 'react-router'
import { ArrowLeft, Ban, Check, FileText, Image, Loader2, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorProposalDetailData } from '../types'
import { EditorAnnotationPanel } from '../components/editor-annotation-panel'

export function EditorProposalDetailPage({
  data,
  hasError
}: {
  data: EditorProposalDetailData | null
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()

  if (hasError || !data) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive'>
        <h1 className='font-bold'>{t('errors.loadTitle')}</h1>
        <Link to='/dashboard/editor/proposals' className='mt-4 inline-flex text-sm font-bold underline'>
          {t('actions.back')}
        </Link>
      </div>
    )
  }

  const { series, name } = data
  const assigned = Boolean(series.editorId)
  const proposalReviewable = series.proposal?.status === 'PROPOSAL_REVIEW'
  const nameReviewable = name?.status === 'SUBMITTED' || name?.status === 'IN_REVIEW'

  return (
    <div className='space-y-6 pb-12'>
      <Link
        to='/dashboard/editor/proposals'
        className='inline-flex items-center gap-2 text-sm font-bold text-muted-foreground'
      >
        <ArrowLeft className='size-4' />
        {t('actions.back')}
      </Link>
      <header className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <div className='grid md:grid-cols-[220px_1fr]'>
          <div className='flex min-h-56 items-center justify-center bg-muted'>
            {data.coverUrl ? (
              <img src={data.coverUrl} alt={series.title} className='h-full max-h-80 w-full object-cover' />
            ) : (
              <Image className='size-12 text-muted-foreground' />
            )}
          </div>
          <div className='p-6'>
            <span className='rounded-full bg-secondary px-3 py-1 text-xs font-extrabold text-secondary-foreground'>
              {t(`filters.seriesStatuses.${series.status}`)}
            </span>
            <h1 className='mt-4 text-3xl font-bold text-foreground'>{series.title}</h1>
            <p className='mt-3 text-sm leading-6 text-muted-foreground'>
              {series.proposal?.synopsis || t('proposals.noSynopsis')}
            </p>
            <div className='mt-5 flex flex-wrap gap-2'>
              {series.genres.map((genre) => (
                <span
                  key={genre}
                  className='rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground'
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>
      {fetcher.data && <Feedback result={fetcher.data} />}
      <div className='grid gap-6 xl:grid-cols-2'>
        <ReviewPanel
          title={t('proposalDetail.proposalTitle')}
          status={series.proposal?.status ?? series.status}
          facts={[
            [t('proposalDetail.estimatedLength'), String(series.proposal?.estimatedLength ?? t('common.notAvailable'))],
            [t('proposalDetail.publicationType'), series.publicationType ?? t('common.notAvailable')],
            [t('proposalDetail.demographic'), series.demographic ?? t('common.notAvailable')]
          ]}
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {data.characterDesignUrls.map((url, index) => (
              <img
                key={url}
                src={url}
                alt={t('proposalDetail.characterAlt', { number: index + 1 })}
                className='aspect-square rounded-lg border border-border object-cover'
              />
            ))}
          </div>
          <ReviewForm
            fetcher={fetcher}
            seriesId={series.id}
            approveIntent='approveProposal'
            reviseIntent='reviseProposal'
            disabled={!assigned || !proposalReviewable}
          />
        </ReviewPanel>
        <ReviewPanel
          title={t('proposalDetail.nameTitle')}
          status={name?.status ?? t('common.notAvailable')}
          facts={[
            [t('proposalDetail.version'), String(name?.version ?? 0)],
            [t('proposalDetail.pages'), String(name?.pages.length ?? 0)]
          ]}
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {data.namePageUrls.map((page) =>
              page.url ? (
                <figure key={page.pageNumber}>
                  <img
                    src={page.url}
                    alt={t('proposalDetail.pageAlt', { number: page.pageNumber })}
                    className='aspect-[3/4] w-full rounded-lg border border-border object-cover'
                  />
                  <figcaption className='mt-1 text-center text-xs text-muted-foreground'>
                    {t('proposalDetail.page', { number: page.pageNumber })}
                  </figcaption>
                </figure>
              ) : null
            )}
          </div>
          {name && (
            <>
              <ReviewForm
                fetcher={fetcher}
                seriesId={series.id}
                nameId={name.id}
                approveIntent='approveName'
                reviseIntent='reviseName'
                disabled={!assigned || !nameReviewable}
              />
              <div className='mt-5'>
                <EditorAnnotationPanel
                  title={t('chapterReview.nameAnnotations')}
                  annotations={data.nameAnnotations}
                  target='NAME'
                  targetId={name.id}
                  contextFields={{ seriesId: series.id, nameId: name.id }}
                  createIntent='createNameAnnotation'
                  resolveIntent='resolveNameAnnotation'
                  removeIntent='removeNameAnnotation'
                />
              </div>
            </>
          )}
        </ReviewPanel>
      </div>
      {series.status === 'IN_REVIEW' && (
        <fetcher.Form method='post' className='rounded-xl border border-destructive/30 bg-destructive/10 p-5'>
          <input type='hidden' name='seriesId' value={series.id} />
          <h2 className='font-bold text-destructive'>{t('proposalDetail.rejectTitle')}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>{t('proposalDetail.rejectDescription')}</p>
          <textarea
            name='reason'
            required
            maxLength={1000}
            className='mt-4 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
            placeholder={t('proposalDetail.rejectPlaceholder')}
          />
          <button
            name='intent'
            value='rejectSeries'
            disabled={fetcher.state !== 'idle'}
            className='mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-bold text-destructive-foreground disabled:opacity-50'
          >
            <Ban className='size-4' />
            {t('actions.rejectSeries')}
          </button>
        </fetcher.Form>
      )}
      {series.status === 'REJECTED' && (
        <fetcher.Form method='post' className='rounded-xl border border-primary/30 bg-primary/10 p-5'>
          <input type='hidden' name='seriesId' value={series.id} />
          <h2 className='font-bold text-foreground'>{t('proposalDetail.reopenTitle')}</h2>
          <p className='mt-1 text-sm text-muted-foreground'>{t('proposalDetail.reopenDescription')}</p>
          <textarea
            name='reason'
            required
            maxLength={1000}
            className='mt-4 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
            placeholder={t('proposalDetail.reopenPlaceholder')}
          />
          <button
            name='intent'
            value='reopenReview'
            disabled={fetcher.state !== 'idle'}
            className='mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50'
          >
            <RotateCcw className='size-4' />
            {t('actions.reopenReview')}
          </button>
        </fetcher.Form>
      )}
    </div>
  )
}

function ReviewPanel({
  title,
  status,
  facts,
  children
}: {
  title: string
  status: string
  facts: Array<[string, string]>
  children: React.ReactNode
}) {
  const { t } = useTranslation('editor')
  const statusLabel = t(
    [`filters.proposalStatuses.${status}`, `filters.nameStatuses.${status}`, `filters.seriesStatuses.${status}`],
    { defaultValue: status.replaceAll('_', ' ') }
  )
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-lg font-bold text-foreground'>
          <FileText className='size-5 text-primary' />
          {title}
        </h2>
        <span className='rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'>
          {statusLabel}
        </span>
      </div>
      <dl className='my-5 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4'>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className='text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</dt>
            <dd className='mt-1 text-sm font-semibold text-foreground'>{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  )
}

function ReviewForm({
  fetcher,
  seriesId,
  nameId,
  approveIntent,
  reviseIntent,
  disabled
}: {
  fetcher: ReturnType<typeof useFetcher<EditorActionResult>>
  seriesId: string
  nameId?: string
  approveIntent: string
  reviseIntent: string
  disabled: boolean
}) {
  const { t } = useTranslation('editor')
  const busy = fetcher.state !== 'idle'
  return (
    <fetcher.Form method='post' className='mt-5 space-y-3 border-t border-border pt-4'>
      <input type='hidden' name='seriesId' value={seriesId} />
      {nameId && <input type='hidden' name='nameId' value={nameId} />}
      <textarea
        name='reason'
        maxLength={1000}
        rows={2}
        aria-label={t('actions.revisionReason')}
        placeholder={t('actions.revisionPlaceholder')}
        className='w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'
      />
      <div className='flex flex-wrap gap-2'>
        <button
          name='intent'
          value={approveIntent}
          disabled={disabled || busy}
          className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50'
        >
          {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
          {t('actions.approve')}
        </button>
        <button
          name='intent'
          value={reviseIntent}
          disabled={disabled || busy}
          className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-bold text-foreground disabled:opacity-50'
        >
          <RotateCcw className='size-4' />
          {t('actions.requestRevision')}
        </button>
      </div>
    </fetcher.Form>
  )
}

function Feedback({ result }: { result: EditorActionResult }) {
  const { t } = useTranslation('editor')
  return (
    <div
      className={`rounded-xl border p-4 text-sm font-bold ${
        result.ok
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-destructive/30 bg-destructive/10 text-destructive'
      }`}
    >
      {result.ok ? t(`messages.${result.messageKey}`) : t(`errors.${result.errorKey ?? 'actionFailed'}`)}
    </div>
  )
}
