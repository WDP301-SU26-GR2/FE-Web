import { useTranslation } from 'react-i18next'

import { CONTRACT_FIELD_LIMITS } from '../contract-flow'

export type InitialConditionType = 'CHAPTER_MILESTONE' | 'RECURRING_CHAPTER' | 'RANKING_MILESTONE' | 'TIME_BOUND'

export type InitialPayoutMode = 'amount' | 'percent'

interface InitialPaymentConditionFieldsProps {
  conditionType: InitialConditionType
  onConditionTypeChange: (value: InitialConditionType) => void
  payoutMode: InitialPayoutMode
  onPayoutModeChange: (value: InitialPayoutMode) => void
}

const inputClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'

export function InitialPaymentConditionFields({
  conditionType,
  onConditionTypeChange,
  payoutMode,
  onPayoutModeChange
}: InitialPaymentConditionFieldsProps) {
  const { t } = useTranslation('editor')

  return (
    <fieldset className='grid gap-3 rounded-lg border border-border bg-muted/30 p-4 md:col-span-2 md:grid-cols-2'>
      <legend className='font-bold text-foreground md:col-span-2'>{t('contracts.initialConditionTitle')}</legend>
      <p className='text-xs font-normal text-muted-foreground md:col-span-2'>
        {t('contracts.initialConditionDescription')}
      </p>
      <label className='grid gap-1.5 text-xs font-semibold'>
        {t('contractDetail.conditions')}
        <select
          name='conditionType'
          value={conditionType}
          onChange={(event) => onConditionTypeChange(event.target.value as InitialConditionType)}
          className={inputClass}
        >
          <option value='CHAPTER_MILESTONE'>{t('contractDetail.conditionTypes.chapter')}</option>
          <option value='RECURRING_CHAPTER'>{t('contractDetail.conditionTypes.recurring')}</option>
          <option value='RANKING_MILESTONE'>{t('contractDetail.conditionTypes.ranking')}</option>
          <option value='TIME_BOUND'>{t('contractDetail.conditionTypes.time')}</option>
        </select>
      </label>
      {conditionType === 'CHAPTER_MILESTONE' && (
        <NumberField
          name='chapter'
          label={t('contractDetail.chapterMilestone')}
          maximum={CONTRACT_FIELD_LIMITS.chapterMaximum}
        />
      )}
      {conditionType === 'RECURRING_CHAPTER' && (
        <NumberField
          name='every'
          label={t('contractDetail.everyChapters')}
          maximum={CONTRACT_FIELD_LIMITS.chapterMaximum}
        />
      )}
      {conditionType === 'RANKING_MILESTONE' && (
        <NumberField
          name='topRank'
          label={t('contractDetail.topRank')}
          maximum={CONTRACT_FIELD_LIMITS.rankingMaximum}
        />
      )}
      {conditionType === 'TIME_BOUND' && (
        <label className='grid gap-1.5 text-xs font-semibold'>
          {t('contractDetail.deadline')}
          <input name='deadline' type='datetime-local' required className={inputClass} />
        </label>
      )}
      <label className='grid gap-1.5 text-xs font-semibold'>
        {t('contracts.payoutMode')}
        <select
          value={payoutMode}
          onChange={(event) => onPayoutModeChange(event.target.value as InitialPayoutMode)}
          className={inputClass}
        >
          <option value='amount'>{t('contracts.payoutModes.amount')}</option>
          <option value='percent'>{t('contracts.payoutModes.percent')}</option>
        </select>
      </label>
      {payoutMode === 'amount' ? (
        <NumberField
          name='payoutAmount'
          label={t('contractDetail.payoutAmount')}
          maximum={CONTRACT_FIELD_LIMITS.moneyMaximum}
        />
      ) : (
        <NumberField name='payoutPct' label={t('contractDetail.payoutPct')} maximum={100} />
      )}
      <p className='text-xs font-normal text-muted-foreground md:col-span-2'>{t('contractDetail.payoutRequirement')}</p>
    </fieldset>
  )
}

function NumberField({ name, label, maximum }: { name: string; label: string; maximum: number }) {
  return (
    <label className='grid gap-1.5 text-xs font-semibold'>
      {label}
      <input name={name} type='number' min={1} max={maximum} step={1} required className={inputClass} />
    </label>
  )
}
