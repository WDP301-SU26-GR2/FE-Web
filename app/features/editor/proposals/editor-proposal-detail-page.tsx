import { useEffect, useRef, useState } from 'react'
import { Link, useFetcher } from 'react-router'
import { ArrowLeft, Ban, Check, FileText, Image, Loader2, Presentation, RotateCcw, Unlock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorProposalDetailData } from '../types'
import { EditorActionToast } from '../components/editor-action-toast'
import { useAuth } from '~/features/auth/context/auth-context'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import { Dialog } from '~/shared/ui/dialog'
import {
  EDITOR_PROPOSAL_INTENTS,
  EDITOR_PROPOSAL_ROUTES,
  canRejectProposal,
  canReleaseSeries,
  canReopenReview,
  canReviewProposal,
  isAssignedEditor,
  isReadyToPitch
} from './proposal-review'

export function EditorProposalDetailPage({
  data,
  hasError
}: {
  data: EditorProposalDetailData | null
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const { session } = useAuth()
  const fetcher = useFetcher<EditorActionResult>()

  if (hasError || !data) {
    return (
      <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive'>
        <h1 className='font-bold'>{t('errors.loadTitle')}</h1>
        <Link to={EDITOR_PROPOSAL_ROUTES.list} className='mt-4 inline-flex text-xs font-bold underline'>
          {t('actions.back')}
        </Link>
      </div>
    )
  }

  const { series } = data
  const userId = session?.user.id
  const assigned = isAssignedEditor(series, userId)
  const proposalReviewable = canReviewProposal(series, userId)
  const releasable = canReleaseSeries(series, userId)
  const rejectable = canRejectProposal(series, userId)
  const reopenable = canReopenReview(series, userId)
  const readyToPitch = isReadyToPitch(series, userId)

  return (
    <div className='space-y-6 pb-12'>
      <Link
        to={EDITOR_PROPOSAL_ROUTES.list}
        className='inline-flex items-center gap-2 text-xs font-bold text-muted-foreground'
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
            <h1 className='mt-4 text-2xl font-bold text-foreground'>{series.title}</h1>
            <p className='mt-3 text-xs leading-6 text-muted-foreground'>
              {series.proposal?.synopsis || t('proposals.noSynopsis')}
            </p>
            <div className='mt-5 flex flex-wrap gap-2'>
              {series.genres.map((genre) => (
                <span
                  key={genre}
                  className='rounded-full border border-border px-3 py-1 text-xs font-semibold text-foreground'
                >
                  {t(`common:businessData.values.${genre}`, { defaultValue: t('common.notAvailable') })}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>
      <EditorActionToast data={fetcher.data} scope={`editor-proposal-detail-${series.id}`} />
      <ProposalContext data={data} />
      {releasable && (
        <fetcher.Form method='post' className='flex justify-end'>
          <input type='hidden' name='seriesId' value={series.id} />
          <button
            name='intent'
            value={EDITOR_PROPOSAL_INTENTS.release}
            disabled={fetcher.state !== 'idle'}
            className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50'
          >
            <Unlock className='size-4' />
            {t('actions.release')}
          </button>
        </fetcher.Form>
      )}
      <div className='space-y-6'>
        <ReviewPanel
          title={t('proposalDetail.proposalTitle')}
          status={series.proposal?.status ?? series.status}
          facts={[
            [t('proposalDetail.estimatedLength'), String(series.proposal?.estimatedLength ?? t('common.notAvailable'))],
            [
              t('proposalDetail.publicationType'),
              series.publicationType
                ? t(`common:businessData.values.${series.publicationType}`, {
                    defaultValue: t('common.notAvailable')
                  })
                : t('common.notAvailable')
            ],
            [
              t('proposalDetail.demographic'),
              series.demographic
                ? t(`common:businessData.values.${series.demographic}`, {
                    defaultValue: t('common.notAvailable')
                  })
                : t('common.notAvailable')
            ]
          ]}
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {data.characterDesigns.map((design, index) =>
              design.url ? (
                <img
                  key={design.key}
                  src={design.url}
                  alt={t('proposalDetail.characterAlt', { number: index + 1 })}
                  className='aspect-square rounded-lg border border-border object-cover'
                />
              ) : null
            )}
          </div>
          <div className='mt-6 border-t border-border pt-5'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <h3 className='text-sm font-bold text-foreground'>{t('proposalDetail.storyboardTitle')}</h3>
              <span className='text-xs text-muted-foreground'>
                {t('proposalDetail.storyboardPageCount', { count: data.storyboardPages.length })}
              </span>
            </div>
            {data.storyboardPages.length ? (
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                {data.storyboardPages.map((page) => (
                  <figure key={`${page.pageNumber}-${page.key}`}>
                    {page.url ? (
                      <img
                        src={page.url}
                        alt={t('proposalDetail.storyboardPageAlt', { number: page.pageNumber })}
                        className='aspect-[3/4] w-full rounded-lg border border-border object-cover'
                      />
                    ) : (
                      <div className='grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-border bg-muted p-3 text-center text-xs text-muted-foreground'>
                        {t('proposalDetail.storyboardUnavailable')}
                      </div>
                    )}
                    <figcaption className='mt-1 text-center text-xs text-muted-foreground'>
                      {t('proposalDetail.storyboardPage', { number: page.pageNumber })}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className='rounded-lg border border-dashed border-border bg-muted p-5 text-center text-xs text-muted-foreground'>
                {t('proposalDetail.noStoryboardPages')}
              </div>
            )}
          </div>
          <ReviewForm
            fetcher={fetcher}
            seriesId={series.id}
            approveIntent={EDITOR_PROPOSAL_INTENTS.approve}
            reviseIntent={EDITOR_PROPOSAL_INTENTS.requestRevision}
            disabled={!assigned || !proposalReviewable}
          />
        </ReviewPanel>
      </div>
      {readyToPitch && (
        <section className='rounded-xl border border-primary/30 bg-primary/10 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='font-bold text-foreground'>{t('proposalDetail.readyToPitchTitle')}</h2>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                {t('proposalDetail.readyToPitchDescription')}
              </p>
            </div>
            <fetcher.Form method='post'>
              <input type='hidden' name='seriesId' value={series.id} />
              <button
                name='intent'
                value={EDITOR_PROPOSAL_INTENTS.pitch}
                disabled={fetcher.state !== 'idle'}
                className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'
              >
                <Presentation className='size-4' />
                {t('actions.pitch')}
              </button>
            </fetcher.Form>
          </div>
        </section>
      )}
      {rejectable && (
        <ProposalDecisionDialog
          fetcher={fetcher}
          seriesId={series.id}
          intent={EDITOR_PROPOSAL_INTENTS.reject}
          title={t('proposalDetail.rejectTitle')}
          description={t('proposalDetail.rejectDescription')}
          triggerLabel={t('actions.rejectSeries')}
          reasonLabel={t('proposalDetail.rejectReason')}
          reasonPlaceholder={t('proposalDetail.rejectPlaceholder')}
          icon={Ban}
          destructive
          reasonRequired
        />
      )}
      {reopenable && (
        <ProposalDecisionDialog
          fetcher={fetcher}
          seriesId={series.id}
          intent={EDITOR_PROPOSAL_INTENTS.reopen}
          title={t('proposalDetail.reopenTitle')}
          description={t('proposalDetail.reopenDescription')}
          triggerLabel={t('actions.reopenReview')}
          reasonLabel={t('actions.revisionReason')}
          reasonPlaceholder={t('proposalDetail.reopenPlaceholder')}
          icon={RotateCcw}
          reasonRequired
        />
      )}
    </div>
  )
}

function ProposalContext({ data }: { data: EditorProposalDetailData }) {
  const { t, i18n } = useTranslation('editor')
  const { series } = data
  const relationship = series.relationshipType
    ? t(`proposalDetail.relationshipTypes.${series.relationshipType}`)
    : t('proposalDetail.originalSeries')
  const consent = series.franchiseConsentStatus
    ? t(`proposalDetail.franchiseConsentStatuses.${series.franchiseConsentStatus}`)
    : t('proposalDetail.franchiseConsentNotRequired')
  const reviewStarted = series.reviewStartedAt
    ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(series.reviewStartedAt)
      )
    : t('proposalDetail.reviewNotStarted')

  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='font-bold text-foreground'>{t('proposalDetail.contextTitle')}</h2>
      <dl className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <ContextFact
          label={t('proposalDetail.mangaka')}
          value={series.mangaka?.displayName ?? t('common.notAvailable')}
        />
        <ContextFact label={t('proposalDetail.relationship')} value={relationship} />
        <ContextFact label={t('proposalDetail.franchiseConsent')} value={consent} />
        <ContextFact label={t('proposalDetail.reviewStartedAt')} value={reviewStarted} />
      </dl>
      {series.parentSeriesId && (
        <p className='mt-4 text-xs text-muted-foreground'>
          {t('proposalDetail.parentSeriesReference', { id: series.parentSeriesId })}
        </p>
      )}
      {series.statusReason && (
        <div className='mt-4 rounded-lg border border-border bg-muted p-3'>
          <p className='text-xs font-bold text-foreground'>{t('proposalDetail.statusReason')}</p>
          <p className='mt-1 whitespace-pre-wrap text-xs leading-5 text-muted-foreground'>{series.statusReason}</p>
        </div>
      )}
    </section>
  )
}

function ContextFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</dt>
      <dd className='mt-1 text-xs font-semibold text-foreground'>{value}</dd>
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
    { defaultValue: t('common.notAvailable') }
  )
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <h2 className='flex min-w-0 items-start gap-2 text-pretty text-base font-bold leading-6 text-foreground'>
          <FileText className='mt-0.5 size-5 shrink-0 text-primary' />
          <span>{title}</span>
        </h2>
        <SemanticStatusBadge value={status} label={statusLabel} />
      </div>
      <dl className='my-5 grid grid-cols-2 gap-3 rounded-lg bg-muted p-4'>
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className='text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</dt>
            <dd className='mt-1 text-xs font-semibold text-foreground'>{value}</dd>
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
  approveIntent,
  reviseIntent,
  disabled
}: {
  fetcher: ReturnType<typeof useFetcher<EditorActionResult>>
  seriesId: string
  approveIntent: string
  reviseIntent: string
  disabled: boolean
}) {
  return (
    <div className='mt-5 flex justify-end border-t border-border pt-4'>
      <ProposalReviewDialog
        fetcher={fetcher}
        seriesId={seriesId}
        approveIntent={approveIntent}
        reviseIntent={reviseIntent}
        disabled={disabled}
      />
    </div>
  )
}

function ProposalReviewDialog({
  fetcher,
  seriesId,
  approveIntent,
  reviseIntent,
  disabled
}: {
  fetcher: ReturnType<typeof useFetcher<EditorActionResult>>
  seriesId: string
  approveIntent: string
  reviseIntent: string
  disabled: boolean
}) {
  const { t } = useTranslation('editor')
  const [open, setOpen] = useState(false)
  const busy = fetcher.state !== 'idle'
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && fetcher.state === 'idle' && fetcher.data?.ok) {
      submitted.current = false
      setOpen(false)
    }
  }, [fetcher.data, fetcher.state])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        disabled={disabled || busy}
        className='inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
      >
        <Check className='size-4' />
        {t('proposalDetail.reviewAction')}
      </button>
      <Dialog
        compact
        open={open}
        onClose={() => setOpen(false)}
        titleId='proposal-review-decision-title'
        title={t('proposalDetail.reviewAction')}
        description={t('proposalDetail.reviewActionDescription')}
        descriptionId='proposal-review-decision-description'
        size='sm'
      >
        <fetcher.Form method='post' className='space-y-4' onSubmit={() => (submitted.current = true)}>
          <input type='hidden' name='seriesId' value={seriesId} />
          <label className='grid gap-1.5 text-xs font-bold text-foreground'>
            {t('actions.revisionReason')}
            <textarea
              name='reason'
              maxLength={1000}
              rows={4}
              placeholder={t('actions.revisionPlaceholder')}
              className='w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs font-normal text-foreground outline-none focus:border-primary'
            />
          </label>
          <p className='text-xs leading-5 text-muted-foreground'>{t('proposalDetail.revisionReasonHint')}</p>
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button
              name='intent'
              value={reviseIntent}
              disabled={busy}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 text-xs font-bold text-warning disabled:opacity-50'
            >
              <RotateCcw className='size-4' />
              {t('actions.requestRevision')}
            </button>
            <button
              name='intent'
              value={approveIntent}
              disabled={busy}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-success px-4 text-xs font-bold text-success-foreground disabled:opacity-50'
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
              {t('actions.approve')}
            </button>
          </div>
        </fetcher.Form>
      </Dialog>
    </>
  )
}

function ProposalDecisionDialog({
  fetcher,
  seriesId,
  intent,
  title,
  description,
  triggerLabel,
  reasonLabel,
  reasonPlaceholder,
  icon: Icon,
  destructive = false,
  reasonRequired = false
}: {
  fetcher: ReturnType<typeof useFetcher<EditorActionResult>>
  seriesId: string
  intent: string
  title: string
  description: string
  triggerLabel: string
  reasonLabel: string
  reasonPlaceholder: string
  icon: typeof Ban
  destructive?: boolean
  reasonRequired?: boolean
}) {
  const { t } = useTranslation('editor')
  const [open, setOpen] = useState(false)
  const busy = fetcher.state !== 'idle'
  const id = `proposal-${intent}-title`
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current && fetcher.state === 'idle' && fetcher.data?.ok) {
      submitted.current = false
      setOpen(false)
    }
  }, [fetcher.data, fetcher.state])

  return (
    <div className='flex justify-end'>
      <button
        type='button'
        onClick={() => setOpen(true)}
        disabled={busy}
        className={
          destructive
            ? 'inline-flex h-10 items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 text-xs font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50'
            : 'inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50'
        }
      >
        <Icon className='size-4' />
        {triggerLabel}
      </button>
      <Dialog
        compact
        open={open}
        onClose={() => setOpen(false)}
        titleId={id}
        title={title}
        description={description}
        descriptionId={`${id}-description`}
        size='sm'
      >
        <fetcher.Form method='post' className='space-y-4' onSubmit={() => (submitted.current = true)}>
          <input type='hidden' name='seriesId' value={seriesId} />
          <label className='grid gap-1.5 text-xs font-bold text-foreground'>
            {reasonLabel}
            <textarea
              name='reason'
              required={reasonRequired}
              maxLength={1000}
              rows={4}
              className='w-full resize-y rounded-md border border-input bg-background p-3 text-xs font-normal text-foreground outline-none focus:border-primary'
              placeholder={reasonPlaceholder}
            />
          </label>
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='h-10 rounded-md border border-border px-4 text-xs font-bold text-foreground'
            >
              {t('actions.cancel')}
            </button>
            <button
              name='intent'
              value={intent}
              disabled={busy}
              className={
                destructive
                  ? 'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-50'
                  : 'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
              }
            >
              {busy ? <Loader2 className='size-4 animate-spin' /> : <Icon className='size-4' />}
              {triggerLabel}
            </button>
          </div>
        </fetcher.Form>
      </Dialog>
    </div>
  )
}
