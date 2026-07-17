import { useTranslation } from 'react-i18next'

export type ComposerStep = 'context' | 'work' | 'confirm'

export interface TaskComposerStepperProps {
  currentStep: ComposerStep
  className?: string
}

const STEPS: ComposerStep[] = ['context', 'work', 'confirm']

export function TaskComposerStepper({ currentStep, className }: TaskComposerStepperProps) {
  const { t } = useTranslation('mangaka')

  const currentIndex = STEPS.indexOf(currentStep)

  return (
    <nav aria-label={t('studio.tasks.composer.steps.aria')} className={className}>
      <ol className='flex items-center gap-2'>
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = step === currentStep
          return (
            <li key={step} className='flex items-center gap-2'>
              <div className='flex items-center gap-2'>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary/20 text-primary ring-2 ring-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? '✓' : index + 1}
                </span>
                <span className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {t(`studio.tasks.composer.steps.${step}`)}
                </span>
              </div>
              {index < STEPS.length - 1 && <div className='h-px w-6 bg-border' aria-hidden='true' />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
