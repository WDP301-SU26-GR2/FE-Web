import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft, Loader2, Save } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { useSeriesDetail } from './use-series-detail'
import { useUpdateProposal } from './use-update-proposal'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import {
  SeriesResDtoOutputProposalStatus as ProposalStatusEnum,
  SeriesResDtoOutputStatus as SeriesStatusEnum
} from '~/api/model/series'
import type { UpdateProposalBodyDto } from '~/api/model/series'

import { BasicInfoStep } from './components/wizard-steps/basic-info-step'
import { CharacterDesignStep } from './components/wizard-steps/character-design-step'
import { StorySummaryStep } from './components/wizard-steps/story-summary-step'
import type { CharacterDesignEntry, CoverImageValue, ProposalFormData } from './components/create-proposal-wizard'

// ─── Editable snapshot — values loaded from the server. ───────────────────────
// We hold the original state separately from the live form so we can compare
// field-by-field when building the partial body (see §1.5 of FE-API-Guide-v2:
// omit = keep current, send field = replace, send null = clear, [] = clear array).

type EditableSnapshot = {
  title: string
  coverKey: string | null
  genres: string[]
  demographic: string
  publicationType: string
  synopsis: string
  characterDesigns: string[]
  estimatedLength: number | null
}

type EditProposalPageProps = {
  seriesId: string
}

const EMPTY_SNAPSHOT: EditableSnapshot = {
  title: '',
  coverKey: null,
  genres: [],
  demographic: '',
  publicationType: '',
  synopsis: '',
  characterDesigns: [],
  estimatedLength: null
}

const EMPTY_FORM: ProposalFormData = {
  seriesTitle: '',
  coverImage: null,
  genres: [],
  demographic: '',
  publicationType: '',
  estimatedLength: '',
  synopsis: '',
  characterDesigns: [],
  namePages: []
}

export function EditProposalPage({ seriesId }: EditProposalPageProps) {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()
  const { session } = useAuth()
  const { series, isLoading, error, notFound, refresh } = useSeriesDetail(seriesId)
  const { update, isUpdating } = useUpdateProposal()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null)

  const [form, setForm] = useState<ProposalFormData>(EMPTY_FORM)
  const [initial, setInitial] = useState<EditableSnapshot>(EMPTY_SNAPSHOT)
  const [existingKeysRemoved, setExistingKeysRemoved] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  const updateForm = useCallback(<K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  // ── Hydrate form from series detail once it arrives ────────────────────────
  useEffect(() => {
    if (!series || hydrated) return

    const snap: EditableSnapshot = {
      title: series.title ?? '',
      coverKey: series.coverImage ?? null,
      genres: [...(series.genres ?? [])],
      demographic: series.demographic ?? '',
      publicationType: series.publicationType ?? '',
      synopsis: series.proposal?.synopsis ?? '',
      characterDesigns: [...(series.proposal?.characterDesigns ?? [])],
      estimatedLength: series.proposal?.estimatedLength ?? null
    }

    /* eslint-disable react-hooks/set-state-in-effect -- hydrate once when detail arrives */
    setForm({
      ...EMPTY_FORM,
      seriesTitle: snap.title,
      // cover stays null — we render the existing key via `existingCoverKey` prop
      genres: snap.genres,
      demographic: snap.demographic,
      publicationType: snap.publicationType,
      synopsis: snap.synopsis,
      estimatedLength: snap.estimatedLength ? String(snap.estimatedLength) : ''
    })
    setInitial(snap)
    setHydrated(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [series, hydrated])

  // Reset hydration if the user navigates between different series without
  // unmounting (e.g. clicking the edit button of a different row).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset on id change */
    setHydrated(false)
    setForm(EMPTY_FORM)
    setInitial(EMPTY_SNAPSHOT)
    setExistingKeysRemoved([])
    setSubmitError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [seriesId])

  // ── Editability gate (BE also enforces via 409) ────────────────────────────
  const editable =
    series?.status === SeriesStatusEnum.DRAFT || series?.proposal?.status === ProposalStatusEnum.PROPOSAL_REVISION
  const isOwner = !!session?.user?.id && session.user.id === series?.mangakaId

  // ── Diff the live form against the initial snapshot ────────────────────────
  const dirty = useMemo(() => {
    if (!hydrated) return false
    if (form.seriesTitle.trim() !== initial.title) return true
    if ((form.coverImage ? 'NEW' : null) !== (initial.coverKey ? 'NEW' : null)) return true
    if (!sameSet(form.genres, initial.genres)) return true
    if ((form.demographic || '') !== (initial.demographic || '')) return true
    if ((form.publicationType || '') !== (initial.publicationType || '')) return true
    if (form.synopsis !== initial.synopsis) return true
    if (form.characterDesigns.length > 0) return true
    if (existingKeysRemoved.length > 0) return true
    const estStr = form.estimatedLength ? String(Number(form.estimatedLength)) : ''
    const initialEst = initial.estimatedLength != null ? String(initial.estimatedLength) : ''
    if (estStr !== initialEst) return true
    return false
  }, [form, initial, hydrated, existingKeysRemoved])

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!series || !dirty || isUpdating) return

    // Client-side guards; BE will re-validate.
    const estimatedLengthNum = form.estimatedLength ? Number(form.estimatedLength) : null
    if (estimatedLengthNum !== null && (!Number.isFinite(estimatedLengthNum) || estimatedLengthNum < 1)) {
      setSubmitError(t('wizard.estimatedLengthHint'))
      return
    }

    setSubmitError(null)
    try {
      // 1) Upload new cover (if user replaced it) — upload only when there's a
      //    pending File. The presence of `form.coverImage` is the user intent.
      let uploadedCoverKey: string | null | undefined = undefined
      if (form.coverImage) {
        uploadedCoverKey = await uploadToR2(form.coverImage.file)
      }

      // 2) Upload newly-added character designs in parallel
      const newCharKeys = await Promise.all(form.characterDesigns.map(async (entry) => uploadToR2(entry.file)))

      // 3) Compose final characterDesigns array:
      //    keep = existingKeys minus removed
      //    add  = newCharKeys
      const finalCharacterDesigns = [
        ...initial.characterDesigns.filter((k) => !existingKeysRemoved.includes(k)),
        ...newCharKeys
      ]

      // 4) Build partial body — only include fields that actually changed.
      //    We type `body` loosely here because the orval-generated types are
      //    narrower than the actual swagger contract (e.g. `genres: string`
      //    instead of `string[]`). The boundary cast happens at the API call.
      const body: Record<string, unknown> = {}

      const titleChanged = form.seriesTitle.trim() !== initial.title
      if (titleChanged) body.title = form.seriesTitle.trim()

      // Cover: 3 cases
      //  a) User picked a new file         → send uploadedCoverKey
      //  b) User cleared (and there was one) → send null
      //  c) Unchanged                       → omit field (no key in body)
      if (form.coverImage) {
        body.coverImage = uploadedCoverKey ?? null
      } else if (initial.coverKey && !form.coverImage) {
        // user cleared the existing cover — explicit null to clear
        body.coverImage = null
      }

      if (!sameSet(form.genres, initial.genres)) {
        body.genres = [...form.genres]
      }
      if ((form.demographic || '') !== (initial.demographic || '')) {
        body.demographic = (form.demographic || undefined) as UpdateProposalBodyDto['demographic']
      }
      if ((form.publicationType || '') !== (initial.publicationType || '')) {
        body.publicationType = (form.publicationType || undefined) as UpdateProposalBodyDto['publicationType']
      }
      if (form.synopsis !== initial.synopsis) {
        body.synopsis = form.synopsis
      }
      const initialEstStr = initial.estimatedLength != null ? String(initial.estimatedLength) : ''
      const currentEstStr = form.estimatedLength ? String(Number(form.estimatedLength)) : ''
      if (currentEstStr !== initialEstStr) {
        body.estimatedLength = currentEstStr ? Number(currentEstStr) : null
      }

      // Character designs — only send when the final array differs from initial
      if (
        form.characterDesigns.length > 0 ||
        existingKeysRemoved.length > 0 ||
        !sameStringArray(finalCharacterDesigns, initial.characterDesigns)
      ) {
        body.characterDesigns = finalCharacterDesigns
      }

      // Nothing to send? Guard against empty PATCH (BE would 422).
      if (Object.keys(body).length === 0) {
        setSubmitError(t('seriesDetail.editProposal.noChanges'))
        return
      }

      // NOTE: orval-generated `UpdateProposalBodyDto` types in this repo are
      // narrower than the swagger contract (e.g. `genres: string` vs
      // `string[]`). We construct the body in the correct shape and cast on
      // the boundary so the call site still goes through
      // `seriesControllerUpdateProposal` (preserves auth/refresh/error
      // unwrapping in `customFetch`). Run `npm run orval` to regenerate types
      // from the current swagger and this cast can be tightened.
      const updated = await update(series.id, body as unknown as Parameters<typeof update>[1])
      if (updated) {
        // Refresh the detail page so it sees the new state, then go back.
        refresh()
        navigate(`/dashboard/series/${series.id}`)
      }
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err, t('seriesDetail.editProposal.errorGeneric')))
    }
  }

  // ── Navigation with unsaved-changes guard ─────────────────────────────────
  const requestLeave = useCallback(
    (next: () => void) => {
      if (dirty && !isUpdating) {
        setPendingLeave(() => next)
      } else {
        next()
      }
    },
    [dirty, isUpdating]
  )

  const handleBack = () => {
    requestLeave(() => navigate(`/dashboard/series/${seriesId}`))
  }

  if (notFound) {
    return (
      <div className='flex flex-col items-center gap-3 py-16 text-center'>
        <h2 className='text-lg font-semibold'>{t('seriesDetail.notFound.title')}</h2>
        <p className='max-w-sm text-sm text-muted-foreground'>{t('seriesDetail.notFound.description')}</p>
        <Link
          to={`/dashboard/series/${seriesId}`}
          className='mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
        >
          <ArrowLeft className='h-4 w-4' />
          {t('seriesDetail.editProposal.back')}
        </Link>
      </div>
    )
  }

  if (isLoading && !series) {
    return (
      <div className='flex flex-col items-center gap-3 py-20 text-center text-muted-foreground'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <p className='text-sm'>{t('seriesDetail.editProposal.loading')}</p>
      </div>
    )
  }

  if (error && !series) {
    return (
      <div className='mx-auto max-w-md space-y-3 py-16 text-center'>
        <div
          role='alert'
          className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
        >
          {extractApiErrorMessage({ message: error }, t('seriesDetail.editProposal.loadFailed'))}
        </div>
        <button
          type='button'
          onClick={refresh}
          className='rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted cursor-pointer'
        >
          {t('seriesDetail.editProposal.retry')}
        </button>
      </div>
    )
  }

  if (!series) return null

  if (!isOwner) {
    return (
      <div className='mx-auto max-w-md space-y-3 py-16 text-center'>
        <h2 className='text-lg font-semibold'>{t('seriesDetail.editProposal.notEditableTitle')}</h2>
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.editProposal.errorPermission')}</p>
        <Link
          to={`/dashboard/series/${seriesId}`}
          className='mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted'
        >
          <ArrowLeft className='h-4 w-4' />
          {t('seriesDetail.editProposal.back')}
        </Link>
      </div>
    )
  }

  if (!editable) {
    return (
      <div className='mx-auto max-w-md space-y-3 py-16 text-center'>
        <h2 className='text-lg font-semibold'>{t('seriesDetail.editProposal.notEditableTitle')}</h2>
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.editProposal.notEditableDescription')}</p>
        <Link
          to={`/dashboard/series/${seriesId}`}
          className='mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted'
        >
          <ArrowLeft className='h-4 w-4' />
          {t('seriesDetail.editProposal.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-bold tracking-tight'>{t('seriesDetail.editProposal.title')}</h1>
        <p className='text-sm text-muted-foreground'>{t('seriesDetail.editProposal.subtitle')}</p>
      </div>

      {/* Step content — basic info */}
      <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        <div className='mb-4 flex items-center gap-2'>
          <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
            1
          </span>
          <h2 className='text-sm font-bold uppercase tracking-wider'>{t('seriesDetail.editProposal.sectionBasic')}</h2>
        </div>
        <BasicInfoStep form={form} onChange={updateForm} existingCoverKey={initial.coverKey} />
      </div>

      {/* Synopsis */}
      <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        <div className='mb-4 flex items-center gap-2'>
          <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
            2
          </span>
          <h2 className='text-sm font-bold uppercase tracking-wider'>
            {t('seriesDetail.editProposal.sectionSynopsis')}
          </h2>
        </div>
        <StorySummaryStep form={form} onChange={updateForm} />
      </div>

      {/* Character designs */}
      <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        <div className='mb-4 flex items-center gap-2'>
          <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
            3
          </span>
          <h2 className='text-sm font-bold uppercase tracking-wider'>
            {t('seriesDetail.editProposal.sectionCharacters')}
          </h2>
        </div>
        <CharacterDesignStep
          form={form}
          onChange={updateForm}
          existingKeys={initial.characterDesigns}
          existingKeysRemoved={existingKeysRemoved}
          onToggleExistingRemoval={(key) =>
            setExistingKeysRemoved((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
          }
        />
      </div>

      {/* Submit error banner */}
      {submitError && (
        <div
          role='alert'
          className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          {submitError}
        </div>
      )}

      {/* Action bar */}
      <div className='flex items-center justify-between'>
        <button
          type='button'
          onClick={handleBack}
          disabled={isUpdating}
          className='flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
        >
          <ChevronLeft className='h-4 w-4' />
          <span>{t('seriesDetail.editProposal.back')}</span>
        </button>

        <button
          type='button'
          onClick={handleSubmit}
          disabled={!dirty || isUpdating}
          className={cn(
            'flex items-center gap-2 rounded-md px-5 py-2 text-sm font-bold shadow-sm transition-all cursor-pointer',
            dirty && !isUpdating
              ? 'bg-primary text-primary-foreground hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span>{t('seriesDetail.editProposal.saving')}</span>
            </>
          ) : (
            <>
              <Save className='h-4 w-4' />
              <span>{t('seriesDetail.editProposal.saveChanges')}</span>
            </>
          )}
        </button>
      </div>

      {/* Unsaved changes confirmation */}
      {pendingLeave && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'>
          <div className='w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-5 shadow-2xl'>
            <h3 className='text-base font-bold'>{t('seriesDetail.editProposal.unsavedChangesTitle')}</h3>
            <p className='text-sm text-muted-foreground'>{t('seriesDetail.editProposal.unsavedChangesDescription')}</p>
            <div className='flex items-center justify-end gap-2 pt-1'>
              <button
                type='button'
                onClick={() => setPendingLeave(null)}
                className='rounded-md border border-border bg-card px-3.5 py-1.5 text-sm font-medium hover:bg-muted cursor-pointer'
              >
                {t('seriesDetail.editProposal.unsavedChangesStay')}
              </button>
              <button
                type='button'
                onClick={() => {
                  const next = pendingLeave
                  setPendingLeave(null)
                  next()
                }}
                className='rounded-md bg-destructive px-3.5 py-1.5 text-sm font-bold text-destructive-foreground shadow-sm hover:opacity-90 cursor-pointer'
              >
                {t('seriesDetail.editProposal.unsavedChangesLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const x of b) if (!sa.has(x)) return false
  return true
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

// Re-export type alias to satisfy the prop typing in `StorySummaryStep` even
// though it's unused here — keeps tsc happy if anyone re-orders imports.
export type { CoverImageValue, CharacterDesignEntry }
