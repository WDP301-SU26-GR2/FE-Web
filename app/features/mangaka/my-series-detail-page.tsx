import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  Loader2,
  Pencil,
  ScrollText,
  Send,
  UserCheck,
  Users
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { useAuth } from '~/features/auth/context/auth-context'
import {
  SeriesResDtoOutputProposalStatus as ProposalStatusEnum,
  SeriesResDtoOutputStatus as SeriesStatusEnum
} from '~/api/model/series'
import type { SeriesResDtoOutput } from '~/api/model/series'
import type { NameListResDtoOutputItemsItem } from '~/api/model/names'

import { useSeriesDetail } from './hooks/use-series-detail'
import { useSubmitSeries } from './hooks/use-submit-series'
import { useChapterList } from './hooks/use-chapter-list'
import { useCreateChapter } from './hooks/use-create-chapter'
import { SignedImage } from './components/signed-image'
import { ImageLightbox } from './components/image-lightbox'
import { SubmitSeriesDialog } from './components/submit-series-dialog'
import { CreateChapterDialog } from './components/create-chapter-dialog'
import { PublicationSection } from './components/publication-section'

/** Status values that mark the series as being in the publication phase.
 *  Per FE-API-Guide-v2.md §2.2, SERIALIZED begins serialization and the
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

type MySeriesDetailPageProps = {
  seriesId: string
}

// ─── Reusable bits ─────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-neutral-700 to-slate-900',
  'from-amber-600 to-orange-800',
  'from-emerald-600 to-teal-800',
  'from-sky-600 to-cyan-800'
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
  IN_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  READY_TO_PITCH: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  PITCHED: { className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  SERIALIZED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  HIATUS: { className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
  COMPLETING: { className: 'bg-teal-500/10 text-teal-600 border-teal-500/20' },
  CANCELLING: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  COMPLETED: { className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  CANCELLED: { className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  REJECTED: { className: 'bg-rose-600/10 text-rose-600 border-rose-600/20' },
  ABANDONED: { className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' },
  WITHDRAWN: { className: 'bg-stone-500/10 text-stone-500 border-stone-500/20' }
}

const PROPOSAL_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  PROPOSAL_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  PROPOSAL_REVISION: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  PROPOSAL_APPROVED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  PITCHED: { className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  APPROVED: { className: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20' },
  REJECTED: { className: 'bg-rose-600/10 text-rose-600 border-rose-600/20' },
  WITHDRAWN: { className: 'bg-stone-500/10 text-stone-500 border-stone-500/20' }
}

const NAME_STATUS_META: Record<string, { className: string }> = {
  DRAFT: { className: 'bg-muted text-muted-foreground border-border' },
  SUBMITTED: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  IN_REVIEW: { className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  REVISION: { className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  APPROVED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function MySeriesDetailPage({ seriesId }: MySeriesDetailPageProps) {
  const { t, i18n } = useTranslation('mangaka')
  const navigate = useNavigate()
  const { series, names, isLoading, error, notFound, refresh } = useSeriesDetail(seriesId)
  const { session } = useAuth()
  const { submit, isSubmitting } = useSubmitSeries()
  const {
    chapters,
    isLoading: isChaptersLoading,
    error: chaptersError,
    refresh: refreshChapters
  } = useChapterList(seriesId)
  const { createChapter, isCreating } = useCreateChapter()
  const [lightbox, setLightbox] = useState<{ key: string; alt: string } | null>(null)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [createChapterOpen, setCreateChapterOpen] = useState(false)

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
  const canSubmit =
    series?.status === SeriesStatusEnum.DRAFT && !!session?.user?.id && session.user.id === series.mangakaId

  // Edit is available to the owner while the proposal is editable per §6.1:
  // series DRAFT, OR proposal PROPOSAL_REVISION. BE also enforces (409).
  const canEdit =
    !!session?.user?.id &&
    session.user.id === series?.mangakaId &&
    (series?.status === SeriesStatusEnum.DRAFT || proposal?.status === ProposalStatusEnum.PROPOSAL_REVISION)

  const isOwner = !!session?.user?.id && session.user.id === series?.mangakaId
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
    return <NotFoundView backHref='/dashboard/series' />
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
        <Link to='/dashboard/series' className='flex items-center gap-1 transition-colors hover:text-foreground'>
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
                  'flex h-44 w-44 items-center justify-center rounded-md bg-gradient-to-br font-extrabold text-3xl text-white shadow-md',
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
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                    seriesMeta.className
                  )}
                >
                  {translate(`mySeries.statuses.${seriesStatus ?? 'DRAFT'}`, seriesStatus ?? 'DRAFT')}
                </span>
                {/* Submit for review — only the owner of a DRAFT series can see this.
                    BE rejects non-owners / wrong status with 403 / 409. */}
                {canSubmit && (
                  <button
                    type='button'
                    onClick={() => setSubmitDialogOpen(true)}
                    className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
                  >
                    <Send className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.submit.button')}</span>
                  </button>
                )}
                {/* Edit Proposal — only the owner can edit while DRAFT or PROPOSAL_REVISION. */}
                {canEdit ? (
                  <button
                    type='button'
                    onClick={() => navigate(`/dashboard/series/${series.id}/edit`)}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
                  >
                    <Pencil className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.editProposal.button')}</span>
                  </button>
                ) : (
                  <button
                    type='button'
                    disabled
                    title={t('seriesDetail.editProposalNotImplemented')}
                    className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground opacity-60 cursor-not-allowed'
                  >
                    <Pencil className='h-3.5 w-3.5' />
                    <span>{t('seriesDetail.editProposal.button')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Status reason */}
            {series.statusReason && (
              <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700'>
                <strong className='font-semibold'>{t('seriesDetail.statusReason')}: </strong>
                {series.statusReason}
              </div>
            )}

            {/* Genre chips */}
            {series.genres.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {series.genres.map((g) => (
                  <span
                    key={g}
                    className='inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground'
                  >
                    {translate(`seriesDetail.enums.genres.${g}`, g)}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata grid */}
            <div className='grid grid-cols-1 gap-3 rounded-lg border border-border bg-background/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3'>
              <MetaItem
                icon={<Users className='h-3.5 w-3.5' />}
                label={t('seriesDetail.demographic')}
                value={
                  series.demographic
                    ? translate(`seriesDetail.enums.demographic.${series.demographic}`, series.demographic)
                    : '—'
                }
              />
              <MetaItem
                icon={<Calendar className='h-3.5 w-3.5' />}
                label={t('seriesDetail.publicationType')}
                value={
                  series.publicationType
                    ? translate(`seriesDetail.enums.publicationType.${series.publicationType}`, series.publicationType)
                    : '—'
                }
              />
              <MetaItem
                icon={<UserCheck className='h-3.5 w-3.5' />}
                label={t('seriesDetail.editor')}
                value={series.editorId ? t('seriesDetail.editorAssigned') : t('seriesDetail.inReviewQueue')}
              />
              <MetaItem
                icon={<Calendar className='h-3.5 w-3.5' />}
                label={t('seriesDetail.createdAt')}
                value={formatDateTime(series.createdAt, currentLocale)}
              />
              {series.reviewStartedAt && (
                <MetaItem
                  icon={<Calendar className='h-3.5 w-3.5' />}
                  label={t('seriesDetail.reviewStartedAt')}
                  value={formatDateTime(series.reviewStartedAt, currentLocale)}
                />
              )}
              {series.relationshipType && (
                <MetaItem
                  icon={<ChevronRight className='h-3.5 w-3.5' />}
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

      {/* PROPOSAL section */}
      <CollapsibleCard
        title={t('seriesDetail.proposal.title')}
        icon={<ScrollText className='h-4 w-4 text-muted-foreground' />}
        rightSlot={
          proposal && proposalMetaClassName ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                proposalMetaClassName
              )}
            >
              {translate(`seriesDetail.proposalStatus.${proposal.status}`, proposal.status)}
            </span>
          ) : null
        }
        defaultCollapsed={isLegacyCollapsed}
      >
        <ProposalBody proposal={proposal} locale={currentLocale} />
      </CollapsibleCard>

      {/* NAMES section */}
      <CollapsibleCard
        title={t('seriesDetail.names.title')}
        icon={<ImageIcon className='h-4 w-4 text-muted-foreground' />}
        rightSlot={
          <span className='text-xs text-muted-foreground'>
            {t('seriesDetail.names.count', { count: sortedNames.length })}
          </span>
        }
        defaultCollapsed={isLegacyCollapsed}
      >
        <NamesBody names={sortedNames} locale={currentLocale} onOpen={(key, alt) => setLightbox({ key, alt })} />
      </CollapsibleCard>

      {/* PUBLICATION section — visible once the series enters the production phase.
          Per FE-API-Guide-v2.md §6.2 / §7, the Mangaka produces chapters only
          after the series has been serialized (Board approved). BE auto-matches
          the latest APPROVED Name server-side, so FE no longer gates the
          "Create chapter" affordance on hasApprovedName. */}
      {isPublicationPhase && (
        <PublicationSection
          isOwner={isOwner}
          isLoading={isChaptersLoading}
          error={chaptersError}
          chapters={chapters}
          onRefresh={refreshChapters}
          nextChapterNumber={nextChapterNumber}
          onCreateClick={() => setCreateChapterOpen(true)}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox r2Key={lightbox.key} alt={lightbox.alt} open={!!lightbox} onClose={() => setLightbox(null)} />
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

      {/* Create-chapter confirmation (publication phase). BE auto-matches the
          latest APPROVED Name for the series, so FE does not send a nameId. */}
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
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

type MetaItemProps = {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function MetaItem({ icon, label, value }: MetaItemProps) {
  return (
    <div className='flex items-start gap-2'>
      <div className='mt-0.5 text-muted-foreground'>{icon}</div>
      <div className='min-w-0 flex-1'>
        <div className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>{label}</div>
        <div className='truncate font-medium text-foreground'>{value}</div>
      </div>
    </div>
  )
}

type CollapsibleCardProps = {
  title: React.ReactNode
  icon?: React.ReactNode
  rightSlot?: React.ReactNode
  defaultCollapsed?: boolean
  children: React.ReactNode
}

/**
 * Section card with a clickable header that toggles a collapse/expand body.
 * - When `defaultCollapsed` is true, starts closed.
 * - User can always toggle afterwards.
 */
function CollapsibleCard({ title, icon, rightSlot, defaultCollapsed = false, children }: CollapsibleCardProps) {
  const [open, setOpen] = useState(!defaultCollapsed)

  return (
    <section className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <button
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className='flex w-full items-center justify-between border-b border-border px-5 py-3 text-left transition-colors hover:bg-muted/40 cursor-pointer'
      >
        <div className='flex items-center gap-2'>
          {icon}
          <h2 className='text-sm font-bold uppercase tracking-wider'>{title}</h2>
        </div>
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
}

function ProposalBody({ proposal, locale }: ProposalBodyProps) {
  const { t } = useTranslation('mangaka')

  if (!proposal) {
    return (
      <div className='flex flex-col items-center gap-2 px-5 py-10 text-center'>
        <ImageIcon className='h-8 w-8 text-muted-foreground/40' />
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.proposal.empty')}</p>
      </div>
    )
  }

  return (
    <div className='space-y-6 p-5'>
      {/* Synopsis */}
      {proposal.synopsis && (
        <div>
          <h3 className='mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('seriesDetail.proposal.synopsis')}
          </h3>
          <p className='whitespace-pre-wrap text-sm leading-relaxed text-foreground'>{proposal.synopsis}</p>
        </div>
      )}

      {/* Character designs */}
      {proposal.characterDesigns.length > 0 && (
        <div>
          <h3 className='mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            {t('seriesDetail.proposal.characterDesigns')} · {proposal.characterDesigns.length}
          </h3>
          <div className='flex gap-3 overflow-x-auto pb-2'>
            {proposal.characterDesigns.map((key, i) => (
              <SignedImage
                key={`${key}-${i}`}
                r2Key={key}
                alt={t('seriesDetail.proposal.characterDesignAlt', { n: i + 1 })}
                aspectClassName='aspect-square'
                className='h-32 w-32 shrink-0'
              />
            ))}
          </div>
        </div>
      )}

      {/* Estimated length + createdAt — proposal-specific fields */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <MetaItem
          icon={<ScrollText className='h-3.5 w-3.5' />}
          label={t('seriesDetail.proposal.estimatedLength')}
          value={
            proposal.estimatedLength
              ? t('seriesDetail.proposal.chaptersCount', { count: proposal.estimatedLength })
              : '—'
          }
        />
        <MetaItem
          icon={<Calendar className='h-3.5 w-3.5' />}
          label={t('seriesDetail.proposal.createdAt')}
          value={formatDateTime(proposal.createdAt, locale)}
        />
      </div>
    </div>
  )
}

type NamesBodyProps = {
  names: NameListResDtoOutputItemsItem[]
  locale: string
  onOpen: (r2Key: string, alt: string) => void
}

function NamesBody({ names, locale, onOpen }: NamesBodyProps) {
  const { t } = useTranslation('mangaka')

  if (names.length === 0) {
    return (
      <div className='flex flex-col items-center gap-2 px-5 py-10 text-center'>
        <ImageIcon className='h-8 w-8 text-muted-foreground/40' />
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.names.empty')}</p>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
      {names.map((name) => {
        const firstPage = name.pages[0]
        const meta = NAME_STATUS_META[name.status] ?? NAME_STATUS_META.DRAFT
        const isSample = name.chapterNumber === null
        const label = isSample
          ? t('seriesDetail.names.sampleLabel')
          : t('seriesDetail.names.chapterLabel', { n: name.chapterNumber as number })
        return (
          <button
            key={name.id}
            type='button'
            onClick={() => firstPage && onOpen(firstPage.fileUrl, t('seriesDetail.names.alt', { label }))}
            className='group flex flex-col gap-2 rounded-lg border border-border bg-card p-2 text-left transition-all hover:border-primary hover:shadow-sm cursor-pointer'
          >
            <SignedImage
              r2Key={firstPage?.fileUrl ?? null}
              alt={t('seriesDetail.names.alt', { label })}
              aspectClassName='aspect-[3/4]'
              className='w-full'
            />
            <div className='space-y-1 px-1'>
              <div className='flex items-center justify-between text-[10px] text-muted-foreground'>
                <span className='truncate font-medium'>{label}</span>
                <span>{t('seriesDetail.names.versionLabel', { n: name.version })}</span>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  meta.className
                )}
              >
                {t(`seriesDetail.nameStatus.${name.status}`, name.status)}
              </span>
              {name.submittedAt && (
                <div className='truncate text-[10px] text-muted-foreground'>
                  {formatDateTime(name.submittedAt, locale)}
                </div>
              )}
            </div>
          </button>
        )
      })}
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
