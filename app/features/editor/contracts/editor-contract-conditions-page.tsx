import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Ban } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
  ContractResDtoOutput,
  ContractStatusProgressResDtoOutput,
  PaymentConditionListResDtoOutputDataItem
} from '~/api/model/contracts'
import type { EditorActionResult } from '../types'
import { ContractActionMessage, ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractConditionsPage({
  contract,
  progress,
  conditions
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  conditions: PaymentConditionListResDtoOutputDataItem[]
}) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
  const [conditionType, setConditionType] = useState('CHAPTER_MILESTONE')
  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.conditions')}>
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <fetcher.Form method='post' className='grid gap-3 md:grid-cols-2'>
          <input type='hidden' name='intent' value='createCondition' />
          <select
            name='conditionType'
            value={conditionType}
            onChange={(event) => setConditionType(event.target.value)}
            className={contractInput}
          >
            <ConditionOptions />
          </select>
          <ThresholdField type={conditionType} />
          <input
            name='payoutAmount'
            type='number'
            min={0}
            className={contractInput}
            placeholder={t('contractDetail.payoutAmount')}
          />
          <input
            name='payoutPct'
            type='number'
            min={0}
            max={100}
            className={contractInput}
            placeholder={t('contractDetail.payoutPct')}
          />
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground md:col-span-2'>
            {t('actions.addCondition')}
          </button>
        </fetcher.Form>
        <ContractActionMessage data={fetcher.data} />
        <div className='mt-5 grid gap-3'>
          {conditions.map((condition) => (
            <article key={condition.id} className='rounded-lg border border-border p-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <div className='flex items-center gap-2'>
                    <strong>{t(`contractDetail.conditionTypes.${typeKey(condition.conditionType)}`)}</strong>
                    <span className='rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold'>
                      {condition.status}
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    {thresholdText(condition.conditionType, condition.thresholdConfig, t)} ·{' '}
                    {t('contractDetail.payoutAmount')}: {condition.payoutAmount ?? '—'} ·{' '}
                    {t('contractDetail.payoutPct')}: {condition.payoutPct ?? '—'}%
                  </p>
                </div>
                {condition.status !== 'DISABLED' && (
                  <fetcher.Form method='post'>
                    <input type='hidden' name='intent' value='disableCondition' />
                    <input type='hidden' name='conditionId' value={condition.id} />
                    <button className='inline-flex h-9 items-center gap-2 rounded-md border border-destructive/30 px-3 text-sm font-bold text-destructive'>
                      <Ban className='size-4' />
                      {t('actions.disable')}
                    </button>
                  </fetcher.Form>
                )}
              </div>
              {condition.status === 'PENDING' && (
                <fetcher.Form method='post' className='mt-3 grid gap-2 border-t border-border pt-3 sm:grid-cols-4'>
                  <input type='hidden' name='intent' value='updateCondition' />
                  <input type='hidden' name='conditionId' value={condition.id} />
                  <input type='hidden' name='conditionType' value={condition.conditionType} />
                  <ThresholdField type={condition.conditionType} config={condition.thresholdConfig} />
                  <input
                    name='payoutAmount'
                    type='number'
                    min={0}
                    defaultValue={condition.payoutAmount ?? ''}
                    className={contractInput}
                  />
                  <input
                    name='payoutPct'
                    type='number'
                    min={0}
                    max={100}
                    defaultValue={condition.payoutPct ?? ''}
                    className={contractInput}
                  />
                  <button className='rounded-md border border-border px-3 text-sm font-bold'>
                    {t('actions.update')}
                  </button>
                </fetcher.Form>
              )}
            </article>
          ))}
          {!conditions.length && (
            <p className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
              {t('contractDetail.emptyConditions')}
            </p>
          )}
        </div>
      </section>
    </ContractPageLayout>
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

function ThresholdField({ type, config }: { type: string; config?: unknown }) {
  const { t } = useTranslation('editor')
  const values = record(config)
  if (type === 'RECURRING_CHAPTER')
    return (
      <input
        name='every'
        type='number'
        min={1}
        required
        defaultValue={numeric(values.every)}
        className={contractInput}
        placeholder={t('contractDetail.everyChapters')}
      />
    )
  if (type === 'RANKING_MILESTONE')
    return (
      <input
        name='topRank'
        type='number'
        min={1}
        required
        defaultValue={numeric(values.topRank)}
        className={contractInput}
        placeholder={t('contractDetail.topRank')}
      />
    )
  if (type === 'TIME_BOUND')
    return <input name='deadline' type='date' required defaultValue={text(values.deadline)} className={contractInput} />
  return (
    <input
      name='chapter'
      type='number'
      min={1}
      required
      defaultValue={numeric(values.chapter)}
      className={contractInput}
      placeholder={t('contractDetail.chapterMilestone')}
    />
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
