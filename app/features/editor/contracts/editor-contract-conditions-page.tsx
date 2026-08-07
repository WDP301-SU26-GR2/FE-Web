import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ContractResDtoOutput, PaymentConditionListResDtoOutputDataItem } from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { MoneyInWords } from '~/shared/components/money-in-words'
import { CONTRACT_FIELD_LIMITS, canEditContract } from './contract-flow'
import { ContractActionMessage, ContractDialogPanel, contractDialogButton, contractInput } from './components/contract-shared'

const conditionFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-1.5 text-xs font-semibold'
const conditionFieldLabelClass = 'flex min-h-10 items-end leading-5 text-foreground'

export function ContractConditionsManager({
  contract,
  conditions,
  action
}: {
  contract: ContractResDtoOutput
  conditions: PaymentConditionListResDtoOutputDataItem[]
  action: string
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const [conditionType, setConditionType] = useState('CHAPTER_MILESTONE')
  const [newPayoutAmount, setNewPayoutAmount] = useState<number | null>(null)
  const canManageConditions = canEditContract(contract)
  return (
    <div className='space-y-4'>
      {!canManageConditions && (
        <p className='rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
          {t('contractDetail.paymentConditionsLocked')}
        </p>
      )}
      <ContractDialogPanel
        title={t('actions.addCondition')}
        description={t('contractDetail.paymentConditionManageHint')}
        disabled={!canManageConditions}
      >
        <fetcher.Form method='post' action={action} className='grid gap-3 md:grid-cols-2'>
          <input type='hidden' name='intent' value='createCondition' />
          <label className={conditionFieldClass}>
            <span className={conditionFieldLabelClass}>{t('contractDetail.conditionType')}</span>
            <select
              name='conditionType'
              value={conditionType}
              onChange={(event) => setConditionType(event.target.value)}
              className={contractInput}
            >
              <ConditionOptions />
            </select>
          </label>
          <ThresholdField type={conditionType} />
          <label className={conditionFieldClass}>
            <span className={conditionFieldLabelClass}>{t('contractDetail.payoutAmount')}</span>
            <input
              name='payoutAmount'
              type='number'
              min={CONTRACT_FIELD_LIMITS.moneyMinimum}
              max={CONTRACT_FIELD_LIMITS.moneyMaximum}
              step={1}
              onChange={(event) => setNewPayoutAmount(event.target.value ? Number(event.target.value) : null)}
              className={contractInput}
            />
            <MoneyInWords amount={newPayoutAmount} locale={i18n.language} />
          </label>
          <label className={conditionFieldClass}>
            <span className={conditionFieldLabelClass}>{t('contractDetail.payoutPct')}</span>
            <input name='payoutPct' type='number' min={1} max={100} step={1} className={contractInput} />
          </label>
          <p className='text-xs text-muted-foreground md:col-span-2'>{t('contractDetail.payoutRequirement')}</p>
          <button className={`${contractDialogButton} bg-primary text-primary-foreground md:col-span-2 md:w-full`}>
            {t('actions.addCondition')}
          </button>
        </fetcher.Form>
        <ContractActionMessage data={fetcher.data} />
      </ContractDialogPanel>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <div className='grid gap-3'>
          {conditions.map((condition) => (
            <article key={condition.id} className='rounded-lg border border-border p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='flex items-center gap-2'>
                    <strong>{t(`contractDetail.conditionTypes.${typeKey(condition.conditionType)}`)}</strong>
                    <span className='rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold'>
                      {t(`filters.paymentConditionStatuses.${condition.status}`)}
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {thresholdText(condition.conditionType, condition.thresholdConfig, t)} ·{' '}
                    {t('contractDetail.payoutAmount')}: {condition.payoutAmount ?? '—'} ·{' '}
                    {t('contractDetail.payoutPct')}: {condition.payoutPct ?? '—'}%
                  </p>
                </div>
                {canManageConditions && condition.status === 'PENDING' && (
                  <fetcher.Form method='post' action={action}>
                    <input type='hidden' name='intent' value='disableCondition' />
                    <input type='hidden' name='conditionId' value={condition.id} />
                    <button className={`${contractDialogButton} border border-destructive/30 text-destructive`}>
                      <Ban className='size-4' />
                      {t('actions.disable')}
                    </button>
                  </fetcher.Form>
                )}
              </div>
              {canManageConditions && condition.status === 'PENDING' && (
                <fetcher.Form
                  method='post'
                  action={action}
                  className='mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-4'
                >
                  <input type='hidden' name='intent' value='updateCondition' />
                  <input type='hidden' name='conditionId' value={condition.id} />
                  <input type='hidden' name='conditionType' value={condition.conditionType} />
                  <ThresholdField type={condition.conditionType} config={condition.thresholdConfig} />
                  <label className={conditionFieldClass}>
                    <span className={conditionFieldLabelClass}>{t('contractDetail.payoutAmount')}</span>
                    <ConditionPayoutAmountField defaultValue={condition.payoutAmount} locale={i18n.language} />
                  </label>
                  <label className={conditionFieldClass}>
                    <span className={conditionFieldLabelClass}>{t('contractDetail.payoutPct')}</span>
                    <input
                      name='payoutPct'
                      type='number'
                      min={1}
                      max={100}
                      step={1}
                      defaultValue={condition.payoutPct ?? ''}
                      className={contractInput}
                    />
                  </label>
                  <button className={`${contractDialogButton} border border-border sm:w-full`}>
                    {t('actions.update')}
                  </button>
                </fetcher.Form>
              )}
            </article>
          ))}
          {!conditions.length && (
            <p className='rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground'>
              {t('contractDetail.emptyConditions')}
            </p>
          )}
        </div>
        <ContractActionMessage data={fetcher.data} />
      </section>
    </div>
  )
}

function ConditionOptions() {
  const { t } = useTranslation('editor')
  return (
    <>
      <option value='CHAPTER_MILESTONE'>{t('contractDetail.conditionTypes.chapter')}</option>
      <option value='RECURRING_CHAPTER'>{t('contractDetail.conditionTypes.recurring')}</option>
      <option value='RANKING_MILESTONE'>{t('contractDetail.conditionTypes.ranking')}</option>
      <option value='TIME_BOUND'>{t('contractDetail.conditionTypes.time')}</option>
    </>
  )
}

function ConditionPayoutAmountField({ defaultValue, locale }: { defaultValue: number | null; locale: string }) {
  const [value, setValue] = useState<number | null>(defaultValue)
  return (
    <>
      <input
        name='payoutAmount'
        type='number'
        min={CONTRACT_FIELD_LIMITS.moneyMinimum}
        max={CONTRACT_FIELD_LIMITS.moneyMaximum}
        step={1}
        defaultValue={defaultValue ?? ''}
        onChange={(event) => setValue(event.target.value ? Number(event.target.value) : null)}
        className={contractInput}
      />
      <MoneyInWords amount={value} locale={locale} />
    </>
  )
}

function ThresholdField({ type, config }: { type: string; config?: unknown }) {
  const { t } = useTranslation('editor')
  const values = record(config)
  if (type === 'RECURRING_CHAPTER')
    return (
      <label className={conditionFieldClass}>
        <span className={conditionFieldLabelClass}>{t('contractDetail.everyChapters')}</span>
        <input
          name='every'
          type='number'
          min={1}
          max={CONTRACT_FIELD_LIMITS.chapterMaximum}
          step={1}
          required
          defaultValue={numeric(values.every)}
          className={contractInput}
        />
      </label>
    )
  if (type === 'RANKING_MILESTONE')
    return (
      <label className={conditionFieldClass}>
        <span className={conditionFieldLabelClass}>{t('contractDetail.topRank')}</span>
        <input
          name='topRank'
          type='number'
          min={1}
          max={CONTRACT_FIELD_LIMITS.rankingMaximum}
          step={1}
          required
          defaultValue={numeric(values.topRank)}
          className={contractInput}
        />
      </label>
    )
  if (type === 'TIME_BOUND')
    return (
      <label className={conditionFieldClass}>
        <span className={conditionFieldLabelClass}>{t('contractDetail.deadline')}</span>
        <input name='deadline' type='date' required defaultValue={text(values.deadline)} className={contractInput} />
      </label>
    )
  return (
    <label className={conditionFieldClass}>
      <span className={conditionFieldLabelClass}>{t('contractDetail.chapterMilestone')}</span>
      <input
        name='chapter'
        type='number'
        min={1}
        max={CONTRACT_FIELD_LIMITS.chapterMaximum}
        step={1}
        required
        defaultValue={numeric(values.chapter)}
        className={contractInput}
      />
    </label>
  )
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
function numeric(value: unknown) {
  return typeof value === 'number' ? value : ''
}
function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}
function typeKey(type: string) {
  return type === 'RECURRING_CHAPTER'
    ? 'recurring'
    : type === 'RANKING_MILESTONE'
      ? 'ranking'
      : type === 'TIME_BOUND'
        ? 'time'
        : 'chapter'
}
function thresholdText(type: string, config: unknown, t: (key: string, options?: Record<string, unknown>) => string) {
  const value = record(config)
  if (type === 'RECURRING_CHAPTER') return t('contractDetail.thresholdEvery', { count: value.every })
  if (type === 'RANKING_MILESTONE') return t('contractDetail.thresholdRank', { rank: value.topRank })
  if (type === 'TIME_BOUND') return t('contractDetail.thresholdDeadline', { date: value.deadline })
  return t('contractDetail.thresholdChapter', { chapter: value.chapter })
}
