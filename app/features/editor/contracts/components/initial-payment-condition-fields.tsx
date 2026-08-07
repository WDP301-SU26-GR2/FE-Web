import { useTranslation } from 'react-i18next'
import { useState } from 'react'

import { CONTRACT_FIELD_LIMITS } from '../contract-flow'
import { MoneyInWords } from '~/shared/components/money-in-words'

export type InitialConditionType = 'CHAPTER_MILESTONE' | 'RECURRING_CHAPTER' | 'RANKING_MILESTONE' | 'TIME_BOUND'

export type InitialPayoutMode = 'amount' | 'percent'

interface InitialPaymentConditionFieldsProps {
  conditionType: InitialConditionType
  onConditionTypeChange: (value: InitialConditionType) => void
  payoutMode: InitialPayoutMode
  onPayoutModeChange: (value: InitialPayoutMode) => void
}

const inputClass =
  'h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary'
const fieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const fieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'

export function InitialPaymentConditionFields({
  conditionType,
  onConditionTypeChange,
  payoutMode,
  onPayoutModeChange
}: InitialPaymentConditionFieldsProps) {
  const { t, i18n } = useTranslation('editor')

  return (
    <fieldset className='grid gap-3 rounded-lg border border-border bg-muted/30 p-4 md:col-span-2 md:grid-cols-2'>
      <legend className='font-bold text-foreground md:col-span-2'>{t('contracts.initialConditionTitle')}</legend>
      <p className='text-xs font-normal text-muted-foreground md:col-span-2'>
        {t('contracts.initialConditionDescription')}
      </p>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>{t('contractDetail.conditions')}</span>
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
        <label className={fieldClass}>
          <span className={fieldLabelClass}>{t('contractDetail.deadline')}</span>
          <input name='deadline' type='datetime-local' required className={inputClass} />
        </label>
      )}
      <label className={fieldClass}>
        <span className={fieldLabelClass}>{t('contracts.payoutMode')}</span>
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
          locale={i18n.language}
          showMoneyInWords
        />
      ) : (
        <NumberField name='payoutPct' label={t('contractDetail.payoutPct')} maximum={100} />
      )}
      <p className='text-xs font-normal text-muted-foreground md:col-span-2'>{t('contractDetail.payoutRequirement')}</p>
    </fieldset>
  )
}

function NumberField({
  name,
  label,
  maximum,
  locale,
  showMoneyInWords = false
}: {
  name: string
  label: string
  maximum: number
  locale?: string
  showMoneyInWords?: boolean
}) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <label className={fieldClass}>
      <span className={fieldLabelClass}>{label}</span>
      <input
        name={name}
        type='number'
        min={1}
        max={maximum}
        step={1}
        required
        className={inputClass}
        onChange={(event) => setValue(event.target.value ? Number(event.target.value) : null)}
      />
      {showMoneyInWords && <MoneyInWords amount={value} locale={locale ?? 'vi'} />}
    </label>
  )
}
