import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { useAuth } from '~/features/auth/context/auth-context'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { seriesControllerCreateProposal } from '~/api/operations/series/series'
import { BasicInfoStep } from './wizard-steps/basic-info-step'
import { StorySummaryStep } from './wizard-steps/story-summary-step'
import { CharacterDesignStep } from './wizard-steps/character-design-step'
import { ManuscriptDraftsStep } from './wizard-steps/manuscript-drafts-step'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CharacterDesignEntry {
  id: string
  /** Original File — held in memory so we can PUT it to R2 on submit. */
  file: File
  /** Object URL for preview (UI only) */
  preview: string
  /** R2 object key (set after upload) — sent to API as `characterDesigns[]` */
  key: string
}

export interface NamePageEntry {
  id: string
  /** Original File — held in memory so we can PUT it to R2 on submit. */
  file: File
  /** Object URL for preview */
  preview: string
  /** R2 object key (set after upload) — sent to API as `namePages[].fileUrl` */
  key: string
  /** Page number (≥1) — sent to API as `namePages[].pageNumber` */
  pageNumber: number
  /** Page title (UI only, not sent to API) */
  title: string
}

export interface CoverImageValue {
  /** Original File — held in memory so we can PUT it to R2 on submit. */
  file: File
  /** Object URL for preview (UI only) */
  preview: string
}

export interface ProposalFormData {
  // Step 1 – Basic Info
  // Matches `CreateProposalBodyDto` §6.1 of FE-API-Guide-v2.md
  seriesTitle: string
  coverImage: CoverImageValue | null
  genres: string[]
  demographic: string
  publicationType: string
  /** Estimated number of chapters (≥1) — maps to `estimatedLength` */
  estimatedLength: string

  // Step 2 – Synopsis (Word-like editor)
  synopsis: string

  // Step 3 – Character Designs
  characterDesigns: CharacterDesignEntry[]

  // Step 4 – Name pages (manuscript drafts)
  namePages: NamePageEntry[]
}

const DEFAULT_FORM: ProposalFormData = {
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

const STEPS = [
  { key: 'basicInfo', labelKey: 'wizard.step1' },
  { key: 'storySummary', labelKey: 'wizard.step2' },
  { key: 'characterDesign', labelKey: 'wizard.step3' },
  { key: 'manuscriptDrafts', labelKey: 'wizard.step4' }
] as const

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, onStepClick }: { current: number; onStepClick: (step: number) => void }) {
  const { t } = useTranslation('mangaka')

  return (
    <div className='flex items-center gap-0'>
      {STEPS.map((step, index) => {
        const isCompleted = index < current
        const isCurrent = index === current
        const isClickable = index <= current

        return (
          <div key={step.key} className='flex items-center'>
            <button
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all',
                isCompleted && 'border-primary bg-primary text-primary-foreground',
                isCurrent && !isCompleted && 'border-primary bg-background text-primary ring-2 ring-primary/20',
                !isCompleted && !isCurrent && 'border-border bg-background text-muted-foreground'
              )}
            >
              {isCompleted ? <Check className='h-4 w-4' /> : <span>{index + 1}</span>}
            </button>

            <span
              className={cn(
                'ml-2 hidden text-sm font-medium sm:block',
                isCurrent ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {t(step.labelKey)}
            </span>

            {index < STEPS.length - 1 && (
              <div
                className={cn('mx-3 h-0.5 w-8 flex-1 sm:mx-4 sm:w-16', index < current ? 'bg-primary' : 'bg-border')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Wizard Container ────────────────────────────────────────────────────

export function CreateProposalWizard() {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<ProposalFormData>(DEFAULT_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateForm = <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/dashboard/mangaka/series')
    } else {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleNext = async () => {
    setSubmitError(null)

    // Mid-step navigation
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
      return
    }

    // Final step → submit
    if (!isAuthenticated) {
      setSubmitError(t('wizard.errors.unauthenticated'))
      return
    }

    setIsSubmitting(true)
    try {
      // 1) Upload cover (optional) — skip if user didn't set one
      const coverKey = formData.coverImage ? await uploadToR2(formData.coverImage.file) : ''

      // 2) Upload character designs in parallel
      const characterKeys = await Promise.all(
        formData.characterDesigns.map(async (entry) => ({
          id: entry.id,
          key: await uploadToR2(entry.file)
        }))
      )

      // 3) Upload Name pages in parallel
      const namePageKeys = await Promise.all(
        formData.namePages.map(async (entry) => ({
          pageNumber: entry.pageNumber,
          key: await uploadToR2(entry.file)
        }))
      )

      // 4) Build API body — matches `CreateProposalBodyDto` in swagger.json.
      // NOTE: the orval-generated `CreateProposalBodyDto` type in this repo
      // is stale (lists `genre?: string` instead of the swagger-defined
      // `genres: string[]`). We construct the body in the correct shape
      // and cast on the boundary so the call site still goes through
      // `seriesControllerCreateProposal` (preserves auth/refresh/error
      // unwrapping in `customFetch`). Run `npm run orval` to regenerate
      // types from the current swagger and this cast can be dropped.
      const body = {
        title: formData.seriesTitle.trim(),
        coverImage: coverKey || undefined,
        genres: formData.genres,
        demographic: formData.demographic || undefined,
        publicationType: formData.publicationType || undefined,
        estimatedLength: formData.estimatedLength ? Number(formData.estimatedLength) : undefined,
        synopsis: formData.synopsis || undefined,
        characterDesigns: characterKeys.map((c) => c.key),
        namePages: namePageKeys.map((p, idx) => ({
          pageNumber: p.pageNumber || idx + 1,
          fileUrl: p.key
        }))
      }

      await seriesControllerCreateProposal(body as unknown as Parameters<typeof seriesControllerCreateProposal>[0])

      // 5) Done — go back to My Series
      navigate('/dashboard/mangaka/series')
    } catch (err) {
      setSubmitError(extractApiErrorMessage(err, t('wizard.errors.submitFailed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepComponents: ReactNode[] = [
    <BasicInfoStep key='step1' form={formData} onChange={updateForm} />,
    <StorySummaryStep key='step2' form={formData} onChange={updateForm} />,
    <CharacterDesignStep key='step3' form={formData} onChange={updateForm} />,
    <ManuscriptDraftsStep key='step4' form={formData} onChange={updateForm} />
  ]

  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <div className='flex flex-col gap-1'>
        <h1 className='text-2xl font-bold tracking-tight'>{t('wizard.title')}</h1>
        <p className='text-sm text-muted-foreground'>{t('wizard.subtitle')}</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator current={currentStep} onStepClick={setCurrentStep} />

      {/* Step Content */}
      <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>{stepComponents[currentStep]}</div>

      {/* Submit error banner */}
      {submitError && (
        <div
          role='alert'
          className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          {submitError}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className='flex items-center justify-between'>
        <button
          type='button'
          onClick={handleBack}
          disabled={isSubmitting}
          className='flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer'
        >
          <ChevronLeft className='h-4 w-4' />
          <span>{currentStep === 0 ? t('wizard.exit') : t('wizard.back')}</span>
        </button>

        <button
          type='button'
          onClick={handleNext}
          disabled={isSubmitting}
          className='flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer'
        >
          {isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
          <span>{isLastStep ? t('wizard.submit') : t('wizard.next')}</span>
          {!isSubmitting && <ChevronRight className='h-4 w-4' />}
        </button>
      </div>
    </div>
  )
}
