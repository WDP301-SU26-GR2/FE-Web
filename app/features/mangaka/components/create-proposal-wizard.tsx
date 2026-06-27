import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '~/shared/lib/cn'
import { BasicInfoStep } from './steps/basic-info-step'
import { StorySummaryStep } from './steps/story-summary-step'
import { CharacterDesignStep } from './steps/character-design-step'
import { ManuscriptDraftsStep } from './steps/manuscript-drafts-step'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CharacterDesignEntry {
  id: string
  /** Object URL for preview */
  preview: string
  /** Character name */
  name: string
  /** Character description */
  description: string
}

export interface ManuscriptPageEntry {
  id: string
  /** Object URL for preview */
  preview: string
  /** Page title / filename */
  title: string
}

export interface ProposalFormData {
  // Step 1 – Basic Info
  seriesTitle: string
  altTitles: string
  author: string
  demographic: string
  seriesType: string
  synopsis: string
  tags: string

  // Step 2 – Story Summary (Word-like editor)
  summaryText: string

  // Step 3 – Character Designs (card with image + name + description)
  characterDesigns: CharacterDesignEntry[]

  // Step 4 – Manuscript Drafts (card with image + title)
  manuscripts: ManuscriptPageEntry[]
}

const DEFAULT_FORM: ProposalFormData = {
  seriesTitle: '',
  altTitles: '',
  author: '',
  demographic: '',
  seriesType: '',
  synopsis: '',
  tags: '',
  summaryText: '',
  characterDesigns: [],
  manuscripts: []
}

const STEPS = [
  { key: 'basicInfo', labelKey: 'wizard.step1' },
  { key: 'storySummary', labelKey: 'wizard.step2' },
  { key: 'characterDesign', labelKey: 'wizard.step3' },
  { key: 'manuscriptDrafts', labelKey: 'wizard.step4' }
] as const

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  onStepClick
}: {
  current: number
  onStepClick: (step: number) => void
}) {
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
              {isCompleted ? (
                <Check className='h-4 w-4' />
              ) : (
                <span>{index + 1}</span>
              )}
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
                className={cn(
                  'mx-3 h-0.5 w-8 flex-1 sm:mx-4 sm:w-16',
                  index < current ? 'bg-primary' : 'bg-border'
                )}
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
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<ProposalFormData>(DEFAULT_FORM)

  const updateForm = <K extends keyof ProposalFormData>(
    key: K,
    value: ProposalFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/dashboard/series')
    } else {
      setCurrentStep((s) => s - 1)
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      console.log('Submitting proposal:', formData)
      alert('Proposal submitted! (check console for data)')
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
      <div className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        {stepComponents[currentStep]}
      </div>

      {/* Navigation Buttons */}
      <div className='flex items-center justify-between'>
        <button
          onClick={handleBack}
          className='flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted cursor-pointer'
        >
          <ChevronLeft className='h-4 w-4' />
          <span>{currentStep === 0 ? t('wizard.exit') : t('wizard.back')}</span>
        </button>

        <button
          onClick={handleNext}
          className='flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer'
        >
          <span>{isLastStep ? t('wizard.submit') : t('wizard.next')}</span>
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
    </div>
  )
}
