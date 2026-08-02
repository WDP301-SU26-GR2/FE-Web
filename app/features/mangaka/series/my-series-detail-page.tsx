import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  ChevronDown,
  ImageIcon,
  Loader2,
  Pencil,
  PenLine,
  Send,
  Trash2,
  Undo2,
  RefreshCw,
  RotateCcw,
  MessageSquareWarning,
  Flag
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { useAuth } from '~/features/auth/context/auth-context'
import {
  SeriesResDtoOutputProposalStatus as ProposalStatusEnum,
  SeriesResDtoOutputStatus as SeriesStatusEnum
} from '~/api/model/series'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'

import { useSeriesDetail, type ProposalStoryboardView } from './use-series-detail'
import { useSubmitSeries } from './use-submit-series'
import { useProposalActions } from './use-proposal-actions'
import { useProposalRevisions } from './use-proposal-revisions'
import { useSeriesLifecycle } from './use-series-lifecycle'
import { useFranchiseConsentEligibility } from './use-franchise-consent-eligibility'
import { RevisionRequestsDrawer } from './components/revision-requests-drawer'
import { useChapterList } from '~/features/mangaka/chapters/use-chapter-list'
import { useCreateChapter } from '~/features/mangaka/chapters/use-create-chapter'
import { useChapterManagement } from '~/features/mangaka/chapters/use-chapter-management'
import { SignedImage } from '~/shared/components/signed-image'
import { ImageOverflowStrip, type ImageStripItem } from './components/image-overflow-strip'
import { ImageCarouselViewer, type ImageCarouselItem } from './components/image-carousel-viewer'
import { SubmitSeriesDialog } from './components/submit-series-dialog'
import { ProposalActionDialog, type ProposalActionDialogMode } from './components/proposal-action-dialog'
import { SynopsisBlock } from './components/synopsis-block'
import { CreateChapterDialog } from '~/features/mangaka/chapters/create-chapter-dialog'
import { PublicationSection } from '~/features/mangaka/chapters/publication-section'
import { EditChapterDialog } from '~/features/mangaka/chapters/edit-chapter-dialog'
import { DeleteChapterDialog } from '~/features/mangaka/chapters/delete-chapter-dialog'
import { CompletionProposalDialog } from './components/completion-proposal-dialog'
import { FranchiseConsentDialog } from './components/franchise-consent-dialog'
import { SeriesMetadataDialog } from './components/series-metadata-dialog'
import { translateNameStatus, translateProposalStatus, translateSeriesStatus } from './lib/translate-series-state'
import { translateDemographic, translateGenre, translatePublicationType } from './lib/translate-series-metadata'

/** Status values that mark the series as being in the publication phase.
 *  Per FE-API-Guide-v3.md §1.2, SERIALIZED begins serialization and the
 *  later lifecycle states are owned by BE-B (B5/Flow 5) but still mean
 *  the series has entered production. We surface the Publication section
 *  for all of them so the Mangaka can keep track of chapters even when
 *  the contract/board decides to pause or complete the run.
 */
const PUBLICATION_PHASE_STATUSES: ReadonlyArray<SeriesResDtoOutput['status']> = [
  SeriesStatusEnum.SERIALIZED,
  'HIATUS',
  'COMPLETING',
  'COMPLETED',
  'CANCELLING',
  'CANCELLED'
] as const

const CHAPTER_CREATABLE_SERIES_STATUSES: ReadonlyArray<SeriesResDtoOutput['status']> = [
  SeriesStatusEnum.SERIALIZED,
  'CANCELLING',
  'COMPLETING'
] as const

const SERIES_METADATA_TERMINAL_STATUSES = new Set<SeriesResDtoOutput['status']>([
  SeriesStatusEnum.COMPLETED,
  SeriesStatusEnum.CANCELLED,
  SeriesStatusEnum.REJECTED,
  SeriesStatusEnum.ABANDONED,
  SeriesStatusEnum.WITHDRAWN
])

type MySeriesDetailPageProps = {
  seriesId: string
}

// ─── Reusable bits ─────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
  'from-info to-info/70 text-info-foreground',
  'from-primary to-primary/70 text-primary-foreground',
  'from-muted-foreground to-foreground text-background',
  'from-warning to-warning/70 text-warning-foreground',
  'from-success to-success/70 text-success-foreground',
  'from-accent to-accent/70 text-accent-foreground'
] as const

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]
}

function getInitials(text: string): string {
  const cleaned = text.trim()
  if (!cleaned) return '?'
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatDateTime(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const SERIES_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  IN_REVIEW: { className: 'bg-warning/10 text-warning border-warning/20' },
  READY_TO_PITCH: { className: 'bg-info/10 text-info border-info/20' },
  PITCHED: { className: 'bg-primary/10 text-primary border-primary/20' },
  SERIALIZED: { className: 'bg-success/10 text-success border-success/20' },
  HIATUS: { className: 'bg-muted text-muted-foreground border-border' },
  COMPLETING: { className: 'bg-info/10 text-info border-info/20' },
  CANCELLING: { className: 'bg-warning/10 text-warning border-warning/20' },
  COMPLETED: { className: 'bg-success/10 text-success border-success/20' },
  CANCELLED: { className: 'bg-destructive/10 text-destructive border-destructive/20' },
  REJECTED: { className: 'bg-destructive/10 text-destructive border-destructive/20' },
  ABANDONED: { className: 'bg-muted text-muted-foreground border-border' },
  WITHDRAWN: { className: 'bg-muted text-muted-foreground border-border' }
}

const PROPOSAL_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  PROPOSAL_REVIEW: { className: 'bg-warning/10 text-warning border-warning/20' },
  PROPOSAL_REVISION: { className: 'bg-warning/10 text-warning border-warning/20' },
  PROPOSAL_APPROVED: { className: 'bg-success/10 text-success border-success/20' },
  PITCHED: { className: 'bg-primary/10 text-primary border-primary/20' },
  APPROVED: { className: 'bg-success/10 text-success border-success/20' },
  REJECTED: { className: 'bg-destructive/10 text-destructive border-destructive/20' },
  WITHDRAWN: { className: 'bg-muted text-muted-foreground border-border' }
}

const NAME_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  SUBMITTED: { className: 'bg-info/10 text-info border-info/20' },
  IN_REVIEW: { className: 'bg-warning/10 text-warning border-warning/20' },
  REVISION: { className: 'bg-warning/10 text-warning border-warning/20' },
  APPROVED: { className: 'bg-success/10 text-success border-success/20' }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function MySeriesDetailPage({ seriesId }: MySeriesDetailPageProps) {
  const { t, i18n } = useTranslation('mangaka')
  const navigate = useNavigate()
  const { series, names, isLoading, error, notFound, refresh } = useSeriesDetail(seriesId)
  const { session } = useAuth()
  const { submit, isSubmitting } = useSubmitSeries()
  const { activeAction, deleteDraft, withdraw, resubmitProposal, reopen } = useProposalActions()
  const {
    activeAction: activeLifecycleAction,
    updateMetadata,
    giveFranchiseConsent,
    proposeCompletion
  } = useSeriesLifecycle()
  const {
    chapters,
    isLoading: isChaptersLoading,
    error: chaptersError,
    refresh: refreshChapters
  } = useChapterList(seriesId)
  const { createChapter, isCreating } = useCreateChapter()
  const { activeAction: chapterManagementAction, updateChapter, removeChapter } = useChapterManagement()
  const [lightbox, setLightbox] = useState<{ items: ImageCarouselItem[]; startIndex: number } | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [createChapterOpen, setCreateChapterOpen] = useState(false)
  const [chapterToEdit, setChapterToEdit] = useState<ChapterListResDtoOutputItemsItem | null>(null)
  const [chapterToDelete, setChapterToDelete] = useState<ChapterListResDtoOutputItemsItem | null>(null)
  const [actionDialog, setActionDialog] = useState<ProposalActionDialogMode | null>(null)
  const [revisionDrawerOpen, setRevisionDrawerOpen] = useState(false)
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false)
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false)
  const [franchiseDecision, setFranchiseDecision] = useState<boolean | null>(null)

  const seriesStatus = series?.status
  const proposal = series?.proposal ?? null
  const isSerialized = seriesStatus === SeriesStatusEnum.SERIALIZED
  // Auto-collapse the legacy "Proposal" + "Names (Storyboard)" sections
  // once the series is being serialized — at that point those workflows
  // are frozen (already approved) and the user should focus on chapter
  // production via the new "Publication" section.
  const isLegacyCollapsed = isSerialized

  // Submit is only available to the series owner while it is still DRAFT.
  // BE also enforces both rules (403 / 409), this is just a UI gate so we
  // don't render a misleading button.
  const canPrepareSubmit =
    series?.status === SeriesStatusEnum.DRAFT && !!session?.user?.id && session.user.id === series.mangakaId

  // Edit is available to the owner while the proposal is editable per §6.1:
  // series DRAFT, OR proposal PROPOSAL_REVISION. BE also enforces (409).
  const proposalName = useMemo(() => names.find((name) => name.kind === 'PROPOSAL') ?? null, [names])
  const { revisions, refreshRevisions } = useProposalRevisions(seriesId)
  const canSubmit = canPrepareSubmit && !!proposalName && proposalName.pages.length > 0

  const canEdit =
    !!session?.user?.id &&
    session.user.id === series?.mangakaId &&
    (series?.status === SeriesStatusEnum.DRAFT || proposal?.status === ProposalStatusEnum.PROPOSAL_REVISION)

  const isOwner = !!session?.user?.id && session.user.id === series?.mangakaId
  const { isOriginalMangaka, isLoading: isFranchiseEligibilityLoading } = useFranchiseConsentEligibility(
    series?.parentSeriesId,
    session?.user?.id
  )
  const canEditMetadata = isOwner && !!seriesStatus && !SERIES_METADATA_TERMINAL_STATUSES.has(seriesStatus)
  const canProposeCompletion =
    isOwner &&
    (seriesStatus === SeriesStatusEnum.SERIALIZED || seriesStatus === SeriesStatusEnum.HIATUS) &&
    !series?.completionProposal
  // Consent is decided by the documented `parentSeries.mangakaId`, never by
  // the derivative series owner. Detail exposes only parentSeriesId, so the
  // eligibility hook resolves the parent record before showing this action.
  const canGiveFranchiseConsent =
    series?.franchiseConsentStatus === 'PENDING' && !isFranchiseEligibilityLoading && isOriginalMangaka
  const canDeleteDraft = isOwner && series?.status === SeriesStatusEnum.DRAFT
  // The series state machine rejects withdrawal from PITCHED onward. A Board
  // rejection is the only post-pitch state that can still be withdrawn.
  // Spec 22 (2026-07-18): ABANDONED/WITHDRAWN have their own reopen action instead.
  const canWithdraw = isOwner && ['IN_REVIEW', 'READY_TO_PITCH', 'REJECTED'].includes(series?.status ?? '')
  // Per Spec 22: at ABANDONED/WITHDRAWN Mangaka can "Nộp lại" (reopen → DRAFT, back to queue).
  const canReopen = isOwner && ['ABANDONED', 'WITHDRAWN'].includes(series?.status ?? '')
  const canResubmitProposal = isOwner && proposal?.status === ProposalStatusEnum.PROPOSAL_REVISION
  const isPublicationPhase = !!seriesStatus && PUBLICATION_PHASE_STATUSES.includes(seriesStatus)
  const nextChapterNumber = useMemo(() => {
    if (chapters.length === 0) return 1
    return chapters.reduce((max, c) => Math.max(max, c.chapterNumber), 0) + 1
  }, [chapters])

  // Sort names by submittedAt desc (most-recent first); fall back to chapter
  // number for proposal-names (which all share chapterNumber=null).
  const sortedNames = useMemo(() => {
    return [...names].sort((a, b) => {
      const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0
      const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0
      if (ta !== tb) return tb - ta
      return (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0)
    })
  }, [names])

  if (notFound) {
    return <NotFoundView backHref='/dashboard/mangaka/series' />
  }

  if (isLoading && !series) {
    return <LoadingView />
  }

  if (error && !series) {
    return (
      <ErrorView
        message={extractApiErrorMessage({ message: error }, t('seriesDetail.error.loadFailed'))}
        onRetry={refresh}
      />
    )
  }

  if (!series) {
    return null
  }

  const seriesMeta = SERIES_STATUS_META[seriesStatus ?? ''] ?? SERIES_STATUS_META[SeriesStatusEnum.DRAFT]
  const proposalMetaClassName = proposal
    ? (PROPOSAL_STATUS_META[proposal.status] ?? PROPOSAL_STATUS_META.DRAFT).className
    : null

  const translate = (key: string, fallback: string): string => (i18n.exists(key) ? t(key) : fallback)

  const currentLocale = i18n.language

  return (
    <div className='space-y-6'>
      {/* Top bar: back to list */}
      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
        <Link
          to='/dashboard/mangaka/series'
          className='flex items-center gap-1 transition-colors hover:text-foreground'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          <span>{t('seriesDetail.back')}</span>
        </Link>
      </div>

      {/* Header card */}
      <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
        <div className='grid grid-cols-1 gap-6 p-6 sm:grid-cols-[180px_1fr] sm:gap-8'>
          {/* Cover or initials fallback */}
          <div className='flex justify-center sm:justify-start'>
            {series.coverImage ? (
              <SignedImage
                r2Key={series.coverImage}
                alt={series.title}
                aspectClassName='aspect-[3/4]'
                className='w-44 shadow-md'
              />
            ) : (
              <div
                className={cn(
                  'flex h-44 w-44 items-center justify-center rounded-md bg-gradient-to-br font-extrabold text-3xl shadow-md',
                  pickGradient(series.id)
                )}
                aria-label={series.title}
              >
                {getInitials(series.title)}
              </div>
            )}
          </div>

          {/* Title + metadata grid */}
          <div className='space-y-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h1 className='text-2xl font-bold tracking-tight'>{series.title}</h1>
                <p className='mt-1 text-sm text-muted-foreground'>{t('seriesDetail.subtitle')}</p>
              </div>
              <div className='flex flex-wrap items-center justify-end gap-2'>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                    seriesMeta.className
                  )}
                >
                  {translateSeriesStatus(seriesStatus, t)}
                </span>
                {/* Submit for review — only the owner of a DRAFT series can see this.
                    BE rejects non-owners / wrong status with 403 / 409. */}
                {canPrepareSubmit && (
                  <button
                    type='button'
                    disabled={!canSubmit}
                    title={!canSubmit ? t('seriesDetail.submit.missingNamePages') : undefined}
                    onClick={() => setSubmitDialogOpen(true)}
                    className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    <Send className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.submit.button')}</span>
                  </button>
                )}
                {/* Edit Proposal — only the owner can edit while DRAFT or PROPOSAL_REVISION. */}
                {canEdit && (
                  <button
                    type='button'
                    onClick={() => navigate(`/dashboard/mangaka/series/${series.id}/edit`)}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
                  >
                    <Pencil className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.editProposal.button')}</span>
                  </button>
                )}
                {canEditMetadata && (
                  <button
                    type='button'
                    disabled={activeLifecycleAction !== null}
                    onClick={() => setMetadataDialogOpen(true)}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <PenLine className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.lifecycle.metadata.button')}</span>
                  </button>
                )}
                {canProposeCompletion && (
                  <button
                    type='button'
                    disabled={activeLifecycleAction !== null}
                    onClick={() => setCompletionDialogOpen(true)}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <Flag className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.lifecycle.completion.button')}</span>
                  </button>
                )}
                {canResubmitProposal && (
                  <button
                    type='button'
                    disabled={activeAction !== null}
                    onClick={async () => {
                      if (await resubmitProposal(series.id)) {
                        refresh()
                        refreshRevisions()
                      }
                    }}
                    className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', activeAction === 'resubmitProposal' && 'animate-spin')} />
                    {t('seriesDetail.actions.resubmitProposal.button')}
                  </button>
                )}
                {isOwner && revisions.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setRevisionDrawerOpen(true)}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
                  >
                    <MessageSquareWarning className='h-3.5 w-3.5 text-primary' />
                    <span>{t('seriesDetail.revisions.openDrawer')}</span>
                    {(() => {
                      const unresolved = revisions.reduce((n, r) => (r.isResolved ? n : n + 1), 0)
                      return unresolved > 0 ? (
                        <span className='inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground'>
                          {unresolved}
                        </span>
                      ) : null
                    })()}
                  </button>
                )}
                {canReopen && (
                  <button
                    type='button'
                    disabled={activeAction !== null}
                    onClick={async () => {
                      if (await reopen(series.id)) {
                        refresh()
                      }
                    }}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <RotateCcw className={cn('h-3.5 w-3.5', activeAction === 'reopen' && 'animate-spin')} />
                    {t('seriesDetail.actions.reopen.button')}
                  </button>
                )}
                {canWithdraw && (
                  <button
                    type='button'
                    onClick={() => setActionDialog('withdraw')}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted'
                  >
                    <Undo2 className='h-3.5 w-3.5' />
                    {t('seriesDetail.actions.withdraw.button')}
                  </button>
                )}
                {canDeleteDraft && (
                  <button
                    type='button'
                    onClick={() => setActionDialog('delete')}
                    className='flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20'
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                    {t('seriesDetail.actions.delete.button')}
                  </button>
                )}
              </div>
            </div>

            {/* Genre chips */}
            {series.genres?.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {series.genres.map((g) => (
                  <span
                    key={g}
                    className='inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground'
                  >
                    {translateGenre(g, t)}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata grid */}
            <div className='grid grid-cols-1 gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3'>
              <MetaItem
                label={t('seriesDetail.demographic')}
                value={series.demographic ? translateDemographic(series.demographic, t) : '—'}
              />
              <MetaItem
                label={t('seriesDetail.publicationType')}
                value={series.publicationType ? translatePublicationType(series.publicationType, t) : '—'}
              />
              <MetaItem
                label={t('seriesDetail.editor')}
                value={
                  series.editor?.displayName
                    ? series.editor.displayName
                    : series.editorId
                      ? t('seriesDetail.editorAssigned')
                      : t('seriesDetail.inReviewQueue')
                }
              />
              <MetaItem label={t('seriesDetail.createdAt')} value={formatDateTime(series.createdAt, currentLocale)} />
              {series.reviewStartedAt && (
                <MetaItem
                  label={t('seriesDetail.reviewStartedAt')}
                  value={formatDateTime(series.reviewStartedAt, currentLocale)}
                />
              )}
              {series.statusReason && series.status === 'REJECTED' && (
                <MetaItem label={t('seriesDetail.statusReason')} value={series.statusReason} />
              )}
              {series.relationshipType && (
                <MetaItem
                  label={t('seriesDetail.relationshipType')}
                  value={translate(
                    `seriesDetail.enums.relationshipType.${series.relationshipType}`,
                    series.relationshipType
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {(canGiveFranchiseConsent || series.completionProposal) && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          {canGiveFranchiseConsent && (
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <h2 className='text-sm font-bold'>{t('seriesDetail.lifecycle.franchise.title')}</h2>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {t('seriesDetail.lifecycle.franchise.description')}
                </p>
              </div>
              <div className='flex shrink-0 flex-wrap gap-2'>
                <button
                  type='button'
                  disabled={activeLifecycleAction !== null}
                  onClick={() => setFranchiseDecision(false)}
                  className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {t('seriesDetail.lifecycle.franchise.reject')}
                </button>
                <button
                  type='button'
                  disabled={activeLifecycleAction !== null}
                  onClick={() => setFranchiseDecision(true)}
                  className='rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {t('seriesDetail.lifecycle.franchise.approve')}
                </button>
              </div>
            </div>
          )}
          {series.completionProposal && (
            <div className={cn(canGiveFranchiseConsent && 'mt-5 border-t border-border pt-5')}>
              <h2 className='text-sm font-bold'>{t('seriesDetail.lifecycle.completion.proposedTitle')}</h2>
              <p className='mt-1 text-sm text-muted-foreground'>{series.completionProposal.reason}</p>
              <p className='mt-2 text-xs text-muted-foreground'>
                {series.completionProposal.proposedEndingChapters === null
                  ? t('seriesDetail.lifecycle.completion.noEndingChapter')
                  : t('seriesDetail.lifecycle.completion.endingChaptersValue', {
                      count: series.completionProposal.proposedEndingChapters
                    })}
                {' · '}
                {formatDateTime(series.completionProposal.proposedAt, currentLocale)}
              </p>
            </div>
          )}
        </section>
      )}

      {/* PROPOSAL section */}
      <CollapsibleCard
        title={t('seriesDetail.proposal.title')}
        rightSlot={
          proposal && proposalMetaClassName ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                proposalMetaClassName
              )}
            >
              {translateProposalStatus(proposal.status, t)}
            </span>
          ) : null
        }
        defaultCollapsed={isLegacyCollapsed}
      >
        <ProposalBody
          proposal={proposal}
          locale={currentLocale}
          onOpenStrip={(items, startIndex) => setLightbox({ items, startIndex })}
        />
      </CollapsibleCard>

      {/* NAMES section */}
      <CollapsibleCard
        title={t('seriesDetail.names.title')}
        rightSlot={
          <span className='text-xs text-muted-foreground'>
            {t('seriesDetail.names.count', { count: sortedNames.length })}
          </span>
        }
        defaultCollapsed={isLegacyCollapsed}
      >
        <NamesBody
          names={sortedNames}
          locale={currentLocale}
          onOpen={(items, startIndex) => setLightbox({ items, startIndex })}
        />
      </CollapsibleCard>

      {/* PUBLICATION section — visible once the series enters the production phase.
          Per FE-API-Guide-v3.md §5, chapter-first creates the chapter slot before
          its chapter-scoped Name, so no proposal-Name gate belongs here. */}
      {isPublicationPhase && (
        <PublicationSection
          isOwner={isOwner}
          canCreateChapter={isOwner && !!seriesStatus && CHAPTER_CREATABLE_SERIES_STATUSES.includes(seriesStatus)}
          isLoading={isChaptersLoading}
          error={chaptersError}
          chapters={chapters}
          seriesId={series.id}
          onRefresh={refreshChapters}
          nextChapterNumber={nextChapterNumber}
          onCreateClick={() => setCreateChapterOpen(true)}
          onEditClick={setChapterToEdit}
          onDeleteClick={setChapterToDelete}
        />
      )}

      {/* Image carousel viewer — shared by proposal character designs + name pages */}
      {lightbox && (
        <ImageCarouselViewer
          items={lightbox.items}
          startIndex={lightbox.startIndex}
          open
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Submit-for-review confirmation */}
      <SubmitSeriesDialog
        seriesTitle={series.title}
        isSubmitting={isSubmitting}
        open={submitDialogOpen}
        onCancel={() => {
          if (!isSubmitting) setSubmitDialogOpen(false)
        }}
        onConfirm={async () => {
          const updated = await submit(series.id)
          if (updated) {
            setSubmitDialogOpen(false)
            // Refetch the detail page so the status badge + downstream UI
            // (proposal/name status, status reason, etc.) reflect the new state.
            refresh()
          }
        }}
      />

      <SeriesMetadataDialog
        open={metadataDialogOpen}
        series={series}
        isSubmitting={activeLifecycleAction === 'metadata'}
        onClose={() => {
          if (!activeLifecycleAction) setMetadataDialogOpen(false)
        }}
        onSubmit={async (input) => {
          const updated = await updateMetadata(series.id, input)
          if (!updated) return false
          refresh()
          return true
        }}
      />

      <CompletionProposalDialog
        open={completionDialogOpen}
        seriesTitle={series.title}
        isSubmitting={activeLifecycleAction === 'completion'}
        onClose={() => {
          if (!activeLifecycleAction) setCompletionDialogOpen(false)
        }}
        onSubmit={async (input) => {
          const updated = await proposeCompletion(series.id, input)
          if (updated) {
            setCompletionDialogOpen(false)
            refresh()
          }
        }}
      />

      {franchiseDecision !== null && (
        <FranchiseConsentDialog
          open
          seriesTitle={series.title}
          approve={franchiseDecision}
          isSubmitting={activeLifecycleAction === 'franchiseConsent'}
          onClose={() => {
            if (!activeLifecycleAction) setFranchiseDecision(null)
          }}
          onConfirm={async () => {
            const updated = await giveFranchiseConsent(series.id, franchiseDecision)
            if (updated) {
              setFranchiseDecision(null)
              refresh()
            }
          }}
        />
      )}

      {actionDialog && (
        <ProposalActionDialog
          mode={actionDialog}
          open
          seriesTitle={series.title}
          isSubmitting={activeAction === actionDialog}
          onCancel={() => {
            if (!activeAction) setActionDialog(null)
          }}
          onConfirm={async (reason) => {
            if (actionDialog === 'withdraw' && !reason) return
            const succeeded =
              actionDialog === 'delete' ? await deleteDraft(series.id) : await withdraw(series.id, reason!)
            if (!succeeded) return
            setActionDialog(null)
            if (actionDialog === 'delete') {
              navigate('/dashboard/mangaka/series')
            } else {
              refresh()
            }
          }}
        />
      )}

      {/* Create-chapter confirmation (publication phase, chapter-first body has no nameId). */}
      <CreateChapterDialog
        seriesId={series.id}
        nextChapterNumber={nextChapterNumber}
        isSubmitting={isCreating}
        open={createChapterOpen}
        onCancel={() => {
          if (!isCreating) setCreateChapterOpen(false)
        }}
        onConfirm={async (input) => {
          const created = await createChapter({
            seriesId: series.id,
            chapterNumber: input.chapterNumber,
            title: input.title
          })
          if (created) {
            setCreateChapterOpen(false)
            // The dialog stays open while the chapter list re-pulls so the
            // user sees the new row without a flash of empty state.
            refreshChapters()
            // Series detail is also pulled so any side-effects on Name
            // bookkeeping show up immediately.
            refresh()
            return true
          }
          return false
        }}
      />

      {/* Revision requests drawer — surfaces every Editor round for the
          current series (PROPOSAL + proposal-Name), paginated 4/page. The
          owner can resolve any round where they are the recipient. */}
      <EditChapterDialog
        chapter={chapterToEdit}
        open={chapterToEdit !== null}
        isSubmitting={chapterManagementAction === 'update'}
        onClose={() => {
          if (!chapterManagementAction) setChapterToEdit(null)
        }}
        onConfirm={async (chapterId, update) => {
          const succeeded = await updateChapter(chapterId, update)
          if (succeeded) {
            refreshChapters()
            refresh()
          }
          return succeeded
        }}
      />

      <DeleteChapterDialog
        chapter={chapterToDelete}
        open={chapterToDelete !== null}
        isSubmitting={chapterManagementAction === 'remove'}
        onClose={() => {
          if (!chapterManagementAction) setChapterToDelete(null)
        }}
        onConfirm={async (chapterId) => {
          const succeeded = await removeChapter(chapterId)
          if (succeeded) {
            refreshChapters()
            refresh()
          }
          return succeeded
        }}
      />

      <RevisionRequestsDrawer
        open={revisionDrawerOpen}
        onClose={() => setRevisionDrawerOpen(false)}
        seriesId={series.id}
      />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

type MetaItemProps = {
  label: string
  value: React.ReactNode
}

function MetaItem({ label, value }: MetaItemProps) {
  return (
    <div className='min-w-0 border-l-2 border-primary/30 pl-3'>
      <div className='min-w-0'>
        <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>{label}</div>
        <div className='truncate font-medium text-foreground'>{value}</div>
      </div>
    </div>
  )
}

type CollapsibleCardProps = {
  title: React.ReactNode
  rightSlot?: React.ReactNode
  defaultCollapsed?: boolean
  children: React.ReactNode
}

/**
 * Section card with a clickable header that toggles a collapse/expand body.
 * - When `defaultCollapsed` is true, starts closed.
 * - User can always toggle afterwards.
 */
function CollapsibleCard({ title, rightSlot, defaultCollapsed = false, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <section className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className='flex w-full items-center justify-between border-b border-border px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer'
      >
        <h2 className='text-sm font-bold uppercase tracking-wider'>{title}</h2>
        <div className='flex items-center gap-2'>
          {rightSlot}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>
      {open && children}
    </section>
  )
}

type ProposalBodyProps = {
  proposal: SeriesResDtoOutput['proposal']
  locale: string
  /** Open the carousel viewer at a given character-design index. */
  onOpenStrip: (items: ImageCarouselItem[], startIndex: number) => void
}

function ProposalBody({ proposal, locale, onOpenStrip }: ProposalBodyProps) {
  const { t } = useTranslation('mangaka')

  if (!proposal) {
    return (
      <div className='flex flex-col items-center gap-2 px-5 py-10 text-center'>
        <ImageIcon className='h-8 w-8 text-muted-foreground/40' />
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.proposal.empty')}</p>
      </div>
    )
  }

  // Build the carousel entry list ONCE — never inline-mapped inside JSX so the
  // children identity stays stable across renders (matters when the strip's
  // ResizeObserver effect fires).
  const characterItems: ImageCarouselItem[] = proposal.characterDesigns.map((key, i) => ({
    id: `${key}-${i}`,
    r2Key: key,
    alt: t('seriesDetail.proposal.characterDesignAlt', { n: i + 1 })
  }))

  const stripItems: ImageStripItem[] = characterItems.map((c) => ({
    id: c.id,
    r2Key: c.r2Key,
    alt: c.alt
  }))

  return (
    <div className='space-y-6 p-5'>
      {/* Synopsis — long-form body collapses with a "Read more" toggle and
          an "Open reader" link that launches SynopsisReader for comfortable
          reading of editor-style prose. */}
      {proposal.synopsis && <SynopsisBlock text={proposal.synopsis} />}

      {/* Estimated length + createdAt — proposal-specific fields. Rendered
          BEFORE the image-heavy character designs so the text metadata
          reads first and the visual blocks stay grouped at the bottom. */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <MetaItem
          label={t('seriesDetail.proposal.estimatedLength')}
          value={
            proposal.estimatedLength
              ? t('seriesDetail.proposal.chaptersCount', { count: proposal.estimatedLength })
              : '—'
          }
        />
        <MetaItem label={t('seriesDetail.proposal.createdAt')} value={formatDateTime(proposal.createdAt, locale)} />
      </div>

      {/* Character designs — image strip rendered LAST so all visuals (this
          plus the Name strip that follows) stay grouped together at the
          bottom of the proposal card. */}
      {characterItems.length > 0 && (
        <div>
          <h3 className='mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('seriesDetail.proposal.characterDesigns')} · {characterItems.length}
          </h3>
          <ImageOverflowStrip items={stripItems} onOpen={(idx) => onOpenStrip(characterItems, idx)} />
        </div>
      )}
    </div>
  )
}

type NamesBodyProps = {
  names: ProposalStoryboardView[]
  locale: string
  /** Open the carousel viewer for a given Name's pages at a given page index. */
  onOpen: (items: ImageCarouselItem[], startIndex: number) => void
}

function NamesBody({ names, locale, onOpen }: NamesBodyProps) {
  const { t } = useTranslation('mangaka')

  // Split names: the "sample" (proposal) name gets its own full-width row so
  // its image strip isn't squeezed into a `grid-cols-3` card.
  const sampleName = names.find((n) => n.chapterNumber === null) ?? null
  const chapterNames = names.filter((n) => n.chapterNumber !== null)

  if (names.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 px-5 py-10 text-center'>
        <ImageIcon className='h-8 w-8 text-muted-foreground/40' />
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.names.empty')}</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 p-5'>
      {/* Sample / proposal name — full-width horizontal strip */}
      {sampleName && <SampleNameRow name={sampleName} locale={locale} onOpen={(items, idx) => onOpen(items, idx)} />}

      {/* Chapter names — grid cards */}
      {chapterNames.length > 0 && (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {chapterNames.map((name) => {
            const meta = NAME_STATUS_META[name.status] ?? NAME_STATUS_META.DRAFT
            const label = t('seriesDetail.names.chapterLabel', { n: name.chapterNumber as number })

            const carouselItems: ImageCarouselItem[] = name.pages.map((page) => ({
              id: `${name.id}-${page.pageNumber}`,
              r2Key: page.fileUrl,
              alt: t('seriesDetail.names.alt', {
                label: `${label} #${page.pageNumber}`
              })
            }))

            return (
              <article
                key={name.id}
                className='flex flex-col gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary'
              >
                {/* Header row: label + version + status pill */}
                <div className='flex items-center justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-semibold text-foreground'>{label}</p>
                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                      {t('seriesDetail.names.versionLabel', { n: name.version })}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                      meta.className
                    )}
                  >
                    {translateNameStatus(name.status, t)}
                  </span>
                </div>

                {/* Page grid — tiles match the edit wizard (aspect 3/4), opens carousel on click */}
                {carouselItems.length > 0 && (
                  <NamePagesGrid items={carouselItems} onOpen={(idx) => onOpen(carouselItems, idx)} />
                )}

                {/* Footer timestamp */}
                {name.submittedAt && (
                  <p className='text-[10px] text-muted-foreground'>{formatDateTime(name.submittedAt, locale)}</p>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Full-width row for the proposal/sample name — renders a single horizontal
 * image strip with a "+N" chip when there are too many pages to fit in one
 * row. Clicking any tile (or the chip) opens the carousel viewer.
 */
function SampleNameRow({
  name,
  locale,
  onOpen
}: {
  name: ProposalStoryboardView
  locale: string
  onOpen: (items: ImageCarouselItem[], startIndex: number) => void
}) {
  const { t } = useTranslation('mangaka')
  const meta = NAME_STATUS_META[name.status] ?? NAME_STATUS_META.DRAFT
  const label = t('seriesDetail.names.sampleLabel')

  const carouselItems: ImageCarouselItem[] = name.pages.map((page) => ({
    id: `${name.id}-${page.pageNumber}`,
    r2Key: page.fileUrl,
    alt: t('seriesDetail.names.alt', {
      label: `${label} #${page.pageNumber}`
    })
  }))
  const stripItems: ImageStripItem[] = carouselItems.map((c) => ({
    id: c.id,
    r2Key: c.r2Key,
    alt: c.alt
  }))

  return (
    <div className='space-y-3'>
      {/* Header row */}
      <div className='flex items-center justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-semibold text-foreground'>{label}</p>
          <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            {t('seriesDetail.names.versionLabel', { n: name.version })} · {name.pages.length}{' '}
            {t('seriesDetail.names.pagesCount', { count: name.pages.length })}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            meta.className
          )}
        >
          {translateProposalStatus(name.status, t)}
        </span>
      </div>

      {/* Horizontal strip — single row, "+N" chip on overflow */}
      {stripItems.length > 0 && <ImageOverflowStrip items={stripItems} onOpen={(idx) => onOpen(carouselItems, idx)} />}

      {/* Footer timestamp */}
      {name.submittedAt && (
        <p className='text-[10px] text-muted-foreground'>{formatDateTime(name.submittedAt, locale)}</p>
      )}
    </div>
  )
}

// ─── Image grid tiles (used in detail view, matching the edit wizard sizing) ─

/**
 * Grid of square-ish tiles for character designs. Matches the `aspect-[3/4]`
 * tile style of the edit wizard's `CharacterDesignStep` so the same images
 * feel consistent across both pages.
 */

function NamePagesGrid({ items, onOpen }: { items: ImageCarouselItem[]; onOpen: (index: number) => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
      {items.map((item, idx) => (
        <button
          key={item.id}
          type='button'
          onClick={() => onOpen(idx)}
          aria-label={item.alt}
          className='group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border border-border bg-muted shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <SignedImage
            r2Key={item.r2Key}
            alt={item.alt}
            aspectClassName='aspect-[3/4]'
            className='h-full w-full object-cover'
          />
          <div className='absolute left-2 top-2 flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-foreground/80 px-2 text-xs font-bold text-background'>
            {String(idx + 1).padStart(2, '0')}
          </div>
        </button>
      ))}
      {/* touch the key so unused-i18n doesn't drop it */}
      <span className='hidden'>{t('seriesDetail.names.title')}</span>
    </div>
  )
}

// ─── Loading / Error / Not-found views ──────────────────────────────────────

function NotFoundView({ backHref }: { backHref: string }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-16 text-center'>
      <ImageIcon className='h-12 w-12 text-muted-foreground/40' />
      <h2 className='text-lg font-semibold'>{t('seriesDetail.notFound.title')}</h2>
      <p className='max-w-sm text-sm text-muted-foreground'>{t('seriesDetail.notFound.description')}</p>
      <Link
        to={backHref}
        className='mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
      >
        <ArrowLeft className='h-4 w-4' />
        {t('seriesDetail.notFound.back')}
      </Link>
    </div>
  )
}

function LoadingView() {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-20 text-center text-muted-foreground'>
      <Loader2 className='h-8 w-8 animate-spin' />
      <p className='text-sm'>{t('seriesDetail.loading')}</p>
    </div>
  )
}

function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='mx-auto max-w-md space-y-3 py-16 text-center'>
      <div
        role='alert'
        className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
      >
        {message}
      </div>
      <button
        type='button'
        onClick={onRetry}
        className='rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted cursor-pointer'
      >
        {t('seriesDetail.error.retry')}
      </button>
    </div>
  )
}
