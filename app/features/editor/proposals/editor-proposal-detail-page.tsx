import { useState, type FormEvent } from 'react'
import { Link, useFetcher } from 'react-router'
import {
  ArrowLeft,
  Ban,
  Check,
  FileText,
  Image,
  ImagePlus,
  Loader2,
  LockKeyhole,
  Presentation,
  RotateCcw,
  Save,
  Trash2,
  Unlock
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { EditorActionResult, EditorProposalDetailData } from '../types'
import { EditorActionToast } from '../components/editor-action-toast'
import { useAuth } from '~/features/auth/context/auth-context'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import {
  EDITOR_PROPOSAL_INTENTS,
  EDITOR_PROPOSAL_ROUTES,
  canEditSeriesMetadata,
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
  const metadataEditable = canEditSeriesMetadata(series, userId)
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
                  {genre}
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
      {assigned && <EditorMetadataForm data={data} fetcher={fetcher} editable={metadataEditable} />}
      <div className='space-y-6'>
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
        <fetcher.Form method='post' className='rounded-xl border border-destructive/30 bg-destructive/10 p-5'>
          <input type='hidden' name='seriesId' value={series.id} />
          <h2 className='font-bold text-destructive'>{t('proposalDetail.rejectTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('proposalDetail.rejectDescription')}</p>
          <textarea
            name='reason'
            required
            maxLength={1000}
            className='mt-4 min-h-24 w-full rounded-md border border-input bg-background p-3 text-xs text-foreground'
            placeholder={t('proposalDetail.rejectPlaceholder')}
          />
          <button
            name='intent'
            value={EDITOR_PROPOSAL_INTENTS.reject}
            disabled={fetcher.state !== 'idle'}
            className='mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-destructive px-4 text-xs font-bold text-destructive-foreground disabled:opacity-50'
          >
            <Ban className='size-4' />
            {t('actions.rejectSeries')}
          </button>
        </fetcher.Form>
      )}
      {reopenable && (
        <fetcher.Form method='post' className='rounded-xl border border-primary/30 bg-primary/10 p-5'>
          <input type='hidden' name='seriesId' value={series.id} />
          <h2 className='font-bold text-foreground'>{t('proposalDetail.reopenTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('proposalDetail.reopenDescription')}</p>
          <textarea
            name='reason'
            required
            maxLength={1000}
            className='mt-4 min-h-24 w-full rounded-md border border-input bg-background p-3 text-xs text-foreground'
            placeholder={t('proposalDetail.reopenPlaceholder')}
          />
          <button
            name='intent'
            value={EDITOR_PROPOSAL_INTENTS.reopen}
            disabled={fetcher.state !== 'idle'}
            className='mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
          >
            <RotateCcw className='size-4' />
            {t('actions.reopenReview')}
          </button>
        </fetcher.Form>
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

type MetadataImage = {
  id: string
  key?: string
  file?: File
  preview: string | null
}

function EditorMetadataForm({
  data,
  fetcher,
  editable
}: {
  data: EditorProposalDetailData
  fetcher: ReturnType<typeof useFetcher<EditorActionResult>>
  editable: boolean
}) {
  const { t } = useTranslation('editor')
  const { series } = data
  const [title, setTitle] = useState(series.title)
  const [synopsis, setSynopsis] = useState(series.proposal?.synopsis ?? '')
  const [cover, setCover] = useState<MetadataImage | null>(
    series.coverImage ? { id: series.coverImage, key: series.coverImage, preview: data.coverUrl } : null
  )
  const [designs, setDesigns] = useState<MetadataImage[]>(
    data.characterDesigns.map((design) => ({
      id: design.key,
      key: design.key,
      preview: design.url
    }))
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const busy = uploading || fetcher.state !== 'idle'

  const selectCover = (file: File | undefined) => {
    if (!file) return
    releasePreview(cover)
    setCover({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })
    setUploadError(null)
  }

  const addDesigns = (files: FileList | null) => {
    if (!files?.length) return
    setDesigns((current) => [
      ...current,
      ...Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file)
      }))
    ])
    setUploadError(null)
  }

  const removeDesign = (id: string) => {
    setDesigns((current) => {
      const removed = current.find((design) => design.id === id)
      releasePreview(removed)
      return current.filter((design) => design.id !== id)
    })
  }

  const submitMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editable || busy || !title.trim()) return
    setUploading(true)
    setUploadError(null)
    try {
      const coverKey = cover?.file ? await uploadToR2(cover.file) : (cover?.key ?? '')
      const uploadedDesigns = await Promise.all(
        designs.map(async (design) => ({
          ...design,
          key: design.file ? await uploadToR2(design.file) : design.key
        }))
      )
      const normalizedCover = cover ? { ...cover, key: coverKey, file: undefined } : null
      const normalizedDesigns = uploadedDesigns
        .filter((design): design is MetadataImage & { key: string } => Boolean(design.key))
        .map((design) => ({ ...design, file: undefined }))

      setCover(normalizedCover)
      setDesigns(normalizedDesigns)

      const formData = new FormData()
      formData.set('intent', EDITOR_PROPOSAL_INTENTS.updateMetadata)
      formData.set('seriesId', series.id)
      formData.set('title', title.trim())
      formData.set('synopsis', synopsis.trim())
      formData.set('coverImage', coverKey)
      formData.set('characterDesigns', normalizedDesigns.map((design) => design.key).join('\n'))
      await fetcher.submit(formData, { method: 'post' })
    } catch {
      setUploadError(t('proposalDetail.uploadError'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submitMetadata} className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <div className='flex flex-wrap items-start justify-between gap-3 border-b border-border p-5'>
        <div>
          <h2 className='font-bold text-foreground'>{t('proposalDetail.metadataTitle')}</h2>
          <p className='mt-1 text-xs text-muted-foreground'>{t('proposalDetail.metadataDescription')}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            editable ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}
        >
          {editable ? <Check className='size-3.5' /> : <LockKeyhole className='size-3.5' />}
          {editable ? t('proposalDetail.editable') : t('proposalDetail.locked')}
        </span>
      </div>

      {!editable && (
        <div className='mx-5 mt-5 flex items-start gap-3 rounded-lg border border-border bg-muted p-4 text-xs text-muted-foreground'>
          <LockKeyhole className='mt-0.5 size-4 shrink-0' />
          <p>{t('proposalDetail.lockedDescription')}</p>
        </div>
      )}

      <fieldset disabled={!editable || busy} className='grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px]'>
        <div className='space-y-5'>
          <label className='grid gap-2 text-xs font-semibold text-foreground'>
            {t('proposalDetail.seriesTitle')}
            <input
              required
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className='h-11 rounded-lg border border-input bg-background px-3 font-normal outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70'
            />
            <span className='text-right text-xs font-normal text-muted-foreground'>{title.length}/200</span>
          </label>

          <label className='grid gap-2 text-xs font-semibold text-foreground'>
            {t('proposalDetail.synopsis')}
            <textarea
              maxLength={5000}
              rows={8}
              value={synopsis}
              onChange={(event) => setSynopsis(event.target.value)}
              className='resize-y rounded-lg border border-input bg-background p-3 font-normal leading-6 outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-70'
            />
            <span className='text-right text-xs font-normal text-muted-foreground'>{synopsis.length}/5000</span>
          </label>
        </div>

        <div className='space-y-6'>
          <div>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <h3 className='min-w-0 text-pretty text-xs font-semibold text-foreground'>
                {t('proposalDetail.coverImage')}
              </h3>
              {editable && cover && (
                <button
                  type='button'
                  onClick={() => {
                    releasePreview(cover)
                    setCover(null)
                  }}
                  className='inline-flex items-center gap-1 text-xs font-bold text-destructive'
                >
                  <Trash2 className='size-3.5' />
                  {t('proposalDetail.removeImage')}
                </button>
              )}
            </div>
            <div className='relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted'>
              {cover?.preview ? (
                <img src={cover.preview} alt={title} className='size-full object-cover' />
              ) : (
                <div className='text-center text-muted-foreground'>
                  <Image className='mx-auto size-9' />
                  <p className='mt-2 text-xs'>{t('proposalDetail.noCover')}</p>
                </div>
              )}
            </div>
            {editable && (
              <label className='mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-muted'>
                <ImagePlus className='size-4' />
                {cover ? t('proposalDetail.replaceCover') : t('proposalDetail.addCover')}
                <input
                  type='file'
                  accept='image/png,image/jpeg,image/webp'
                  className='sr-only'
                  onChange={(event) => {
                    selectCover(event.currentTarget.files?.[0])
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            )}
          </div>

          <div>
            <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
              <h3 className='min-w-0 text-pretty text-xs font-semibold text-foreground'>
                {t('proposalDetail.characterDesigns')}
              </h3>
              <span className='text-xs text-muted-foreground'>
                {t('proposalDetail.imageCount', { count: designs.length })}
              </span>
            </div>
            {designs.length ? (
              <div className='grid grid-cols-3 gap-2'>
                {designs.map((design, index) => (
                  <div
                    key={design.id}
                    className='group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted'
                  >
                    {design.preview ? (
                      <img
                        src={design.preview}
                        alt={t('proposalDetail.characterAlt', { number: index + 1 })}
                        className='size-full object-cover'
                      />
                    ) : (
                      <Image className='absolute inset-0 m-auto size-6 text-muted-foreground' />
                    )}
                    {editable && (
                      <button
                        type='button'
                        onClick={() => removeDesign(design.id)}
                        aria-label={t('proposalDetail.removeCharacter', { number: index + 1 })}
                        className='absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-foreground/80 text-background opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100'
                      >
                        <Trash2 className='size-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className='rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground'>
                {t('proposalDetail.noCharacterDesigns')}
              </div>
            )}
            {editable && (
              <label className='mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold text-foreground hover:bg-muted'>
                <ImagePlus className='size-4' />
                {t('proposalDetail.addCharacterDesigns')}
                <input
                  type='file'
                  multiple
                  accept='image/png,image/jpeg,image/webp'
                  className='sr-only'
                  onChange={(event) => {
                    addDesigns(event.currentTarget.files)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
            )}
          </div>
        </div>
      </fieldset>

      {uploadError && <p className='mx-5 mb-4 text-xs text-destructive'>{uploadError}</p>}

      {editable && (
        <div className='flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-4'>
          <p className='min-w-0 text-pretty text-xs leading-5 text-muted-foreground'>{t('proposalDetail.imageHint')}</p>
          <button
            type='submit'
            disabled={busy || !title.trim()}
            className='inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
          >
            {busy ? <Loader2 className='size-4 animate-spin' /> : <Save className='size-4' />}
            {uploading ? t('proposalDetail.uploading') : t('actions.save')}
          </button>
        </div>
      )}
    </form>
  )
}

function releasePreview(image: MetadataImage | null | undefined) {
  if (image?.file && image.preview) URL.revokeObjectURL(image.preview)
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
  const { t } = useTranslation('editor')
  const busy = fetcher.state !== 'idle'
  return (
    <fetcher.Form method='post' className='mt-5 space-y-3 border-t border-border pt-4'>
      <input type='hidden' name='seriesId' value={seriesId} />
      <textarea
        name='reason'
        maxLength={1000}
        rows={2}
        aria-label={t('actions.revisionReason')}
        placeholder={t('actions.revisionPlaceholder')}
        className='w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-primary'
      />
      <div className='flex flex-wrap gap-2'>
        <button
          name='intent'
          value={approveIntent}
          disabled={disabled || busy}
          className='inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50'
        >
          {busy ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
          {t('actions.approve')}
        </button>
        <button
          name='intent'
          value={reviseIntent}
          disabled={disabled || busy}
          className='inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-foreground disabled:opacity-50'
        >
          <RotateCcw className='size-4' />
          {t('actions.requestRevision')}
        </button>
      </div>
    </fetcher.Form>
  )
}
