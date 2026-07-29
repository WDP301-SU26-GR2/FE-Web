import { useTranslation } from 'react-i18next'

import type { PaymentConditionListResDtoOutputDataItem } from '~/api/model/contracts'

export function PaymentConditionsSummary({
  conditions,
  loadFailed = false
}: {
  conditions: PaymentConditionListResDtoOutputDataItem[]
  loadFailed?: boolean
}) {
  const { t, i18n } = useTranslation()

  if (loadFailed)
    return (
      <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive'>
        {t('contractShared.paymentConditions.loadFailed')}
      </p>
    )

  if (!conditions.length)
    return (
      <p className='rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground'>
        {t('contractShared.paymentConditions.empty')}
      </p>
    )

  return (
    <div className='space-y-3'>
      {conditions.map((condition) => {
        const validPayout = (condition.payoutAmount ?? 0) > 0 || (condition.payoutPct ?? 0) > 0
        return (
          <article key={condition.id} className='rounded-lg border border-border p-4'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <strong className='text-sm text-foreground'>
                {t(`contractShared.paymentConditions.types.${condition.conditionType}`, {
                  defaultValue: condition.conditionType.replaceAll('_', ' ')
                })}
              </strong>
              <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground'>
                {t(`contractShared.paymentConditions.statuses.${condition.status}`, {
                  defaultValue: condition.status.replaceAll('_', ' ')
                })}
              </span>
            </div>
            <dl className='mt-3 grid gap-3 text-xs sm:grid-cols-2'>
              <Fact
                label={t('contractShared.paymentConditions.facts.threshold')}
                value={thresholdLabel(condition.conditionType, condition.thresholdConfig, t, i18n.language)}
              />
              <Fact
                label={t('contractShared.paymentConditions.facts.amount')}
                value={formatAmount(condition.payoutAmount, i18n.language, t('contractShared.notApplicable'))}
              />
              <Fact
                label={t('contractShared.paymentConditions.facts.percent')}
                value={formatPercent(condition.payoutPct, i18n.language, t('contractShared.notApplicable'))}
              />
              <Fact
                label={t('contractShared.paymentConditions.facts.recurring')}
                value={t(
                  condition.isRecurring
                    ? 'contractShared.paymentConditions.recurring.yes'
                    : 'contractShared.paymentConditions.recurring.no'
                )}
              />
              {condition.lastTriggeredValue != null && (
                <Fact
                  label={t('contractShared.paymentConditions.facts.lastTriggered')}
                  value={formatAmount(condition.lastTriggeredValue, i18n.language, t('contractShared.notApplicable'))}
                />
              )}
              {condition.achievedAt && (
                <Fact
                  label={t('contractShared.paymentConditions.facts.achievedAt')}
                  value={formatDate(condition.achievedAt, i18n.language)}
                />
              )}
            </dl>
            {!validPayout && (
              <p className='mt-3 text-xs font-semibold text-destructive'>
                {t('contractShared.paymentConditions.invalidPayout')}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='mt-1 font-semibold text-foreground'>{value}</dd>
    </div>
  )
}

function thresholdLabel(
  type: string,
  rawConfig: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
) {
  const config = asRecord(rawConfig)
  if (type === 'CHAPTER_MILESTONE')
    return t('contractShared.paymentConditions.thresholds.chapter', {
      value: numberValue(config.chapter, locale)
    })
  if (type === 'RECURRING_CHAPTER')
    return t('contractShared.paymentConditions.thresholds.recurringChapter', {
      value: numberValue(config.every, locale)
    })
  if (type === 'RANKING_MILESTONE')
    return t('contractShared.paymentConditions.thresholds.ranking', {
      value: numberValue(config.topRank, locale)
    })
  if (type === 'TIME_BOUND')
    return t('contractShared.paymentConditions.thresholds.deadline', {
      value: textValue(config.deadline)
    })
  return t('contractShared.paymentConditions.thresholds.configured')
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function numberValue(value: unknown, locale: string) {
  return typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(locale).format(value) : '—'
}

function textValue(value: unknown) {
  return typeof value === 'string' && value ? value : '—'
}

function formatAmount(value: number | null, locale: string, notApplicable: string) {
  return value == null ? notApplicable : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null, locale: string, notApplicable: string) {
  return value == null ? notApplicable : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%`
}

function formatDate(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale)
}
