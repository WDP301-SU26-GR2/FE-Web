import { ArrowRight, WalletCards } from 'lucide-react'
import { Form, Link, useNavigation } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { MangakaEarningsResDtoOutput } from '~/api/model/dashboard'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import type { ContractListItemDtoOutput } from '~/api/model/contracts'
import { paymentStatusClass } from './payment-status'
import { formatPaymentAmount, formatPaymentDate } from './payment-formatters'

interface MangakaFinancePageProps {
  earnings: MangakaEarningsResDtoOutput | null
  payments: PaymentRecordListResDtoOutputDataItem[]
  earningsLoadFailed: boolean
  paymentsLoadFailed: boolean
  contracts: ContractListItemDtoOutput[]
  selectedView: string
  filtersLoadFailed: boolean
}

export function MangakaFinancePage({
  earnings,
  payments,
  earningsLoadFailed,
  paymentsLoadFailed,
  contracts,
  selectedView,
  filtersLoadFailed
}: MangakaFinancePageProps) {
  const { t, i18n } = useTranslation('mangaka')
  const language = i18n.resolvedLanguage ?? i18n.language
  const navigation = useNavigation()
  const isFiltering = navigation.state !== 'idle'
  const seriesOptions = uniqueSeries(contracts)

  return (
    <div className='mx-auto max-w-6xl space-y-6 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-sm font-semibold text-primary'>
          <WalletCards className='size-5' aria-hidden='true' />
          {t('finance.eyebrow')}
        </p>
        <h1 className='mt-2 text-2xl font-bold tracking-tight text-foreground'>{t('finance.title')}</h1>
        <p className='mt-2 max-w-3xl text-sm text-muted-foreground'>{t('finance.description')}</p>
      </header>

      {earningsLoadFailed ? (
        <LoadError message={t('finance.errors.earnings')} />
      ) : earnings ? (
        <>
          <section className='grid gap-4 sm:grid-cols-3' aria-label={t('finance.summary.label')}>
            <SummaryCard label={t('finance.summary.paid')} value={formatPaymentAmount(earnings.totalPaid, language)} />
            <SummaryCard
              label={t('finance.summary.pending')}
              value={formatPaymentAmount(earnings.totalPending, language)}
            />
            <SummaryCard
              label={t('finance.summary.missed')}
              value={formatPaymentAmount(earnings.totalMissed, language)}
            />
          </section>

          <section className='grid gap-6 lg:grid-cols-2'>
            <Breakdown
              title={t('finance.breakdown.byStatus')}
              entries={earnings.byStatus}
              empty={t('finance.breakdown.empty')}
              label={(key) => paymentStatusLabel(t, key)}
              language={language}
            />
            <Breakdown
              title={t('finance.breakdown.byType')}
              entries={earnings.byType}
              empty={t('finance.breakdown.empty')}
              label={(key) => paymentTypeLabel(t, key)}
              language={language}
            />
          </section>
        </>
      ) : null}

      <section className='rounded-xl border border-border bg-card shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4'>
          <div>
            <h2 className='font-semibold text-foreground'>{t('finance.records.title')}</h2>
            <p className='mt-1 text-sm text-muted-foreground'>{t('finance.records.description')}</p>
          </div>
          <span className='rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground'>
            {t('finance.records.count', { count: payments.length })}
          </span>
        </div>
        <Form method='get' className='grid gap-3 border-b border-border bg-muted/40 px-5 py-4 sm:grid-cols-[1fr_auto]'>
          <label className='grid gap-1.5 text-sm font-semibold text-foreground'>
            {t('finance.filters.label')}
            <select
              key={selectedView}
              name='view'
              defaultValue={selectedView}
              disabled={filtersLoadFailed || isFiltering}
              className='h-10 rounded-md border border-input bg-background px-3 text-sm font-normal text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
            >
              <option value='user'>{t('finance.filters.all')}</option>
              {contracts.length ? (
                <optgroup label={t('finance.filters.byContract')}>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={`contract:${contract.id}`}>
                      {contract.series?.title ?? t('finance.filters.unknownContract')} · {shortId(contract.id)}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {seriesOptions.length ? (
                <optgroup label={t('finance.filters.bySeries')}>
                  {seriesOptions.map((series) => (
                    <option key={series.id} value={`series:${series.id}`}>
                      {series.title}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <button
            type='submit'
            disabled={filtersLoadFailed || isFiltering}
            className='min-h-10 self-end rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isFiltering ? t('finance.filters.loading') : t('finance.filters.apply')}
          </button>
          {filtersLoadFailed ? (
            <p role='alert' className='text-sm text-destructive sm:col-span-2'>
              {t('finance.errors.filters')}
            </p>
          ) : (
            <p className='text-xs text-muted-foreground sm:col-span-2'>{filterDescription(t, selectedView)}</p>
          )}
        </Form>
        {paymentsLoadFailed ? (
          <LoadError message={t('finance.errors.records')} />
        ) : payments.length ? (
          <ul className='divide-y divide-border'>
            {payments.map((payment) => (
              <li key={payment.id}>
                <Link
                  to={`/dashboard/mangaka/payments/${payment.id}`}
                  className='flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
                >
                  <span className='min-w-0'>
                    <span className='block truncate text-sm font-semibold text-foreground'>
                      {payment.series?.title ?? paymentTypeLabel(t, payment.paymentType)}
                    </span>
                    <span className='mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground'>
                      <span>{paymentTypeLabel(t, payment.paymentType)}</span>
                      {payment.period ? <span>{payment.period}</span> : null}
                      <span>
                        {formatPaymentDate(payment.paidAt ?? payment.createdAt, language) ?? t('finance.unknown')}
                      </span>
                    </span>
                  </span>
                  <span className='flex shrink-0 items-center gap-3'>
                    <span className='text-right'>
                      <span className='block text-sm font-bold text-foreground'>
                        {formatPaymentAmount(payment.amount, language)}
                      </span>
                      <span className={paymentStatusClass}>{paymentStatusLabel(t, payment.status)}</span>
                    </span>
                    <ArrowRight className='size-4 text-muted-foreground' aria-hidden='true' />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className='px-5 py-10 text-center text-sm text-muted-foreground'>{t('finance.records.empty')}</p>
        )}
      </section>
    </div>
  )
}

function uniqueSeries(contracts: ContractListItemDtoOutput[]) {
  const series = new Map<string, { id: string; title: string }>()
  for (const contract of contracts) {
    if (!series.has(contract.seriesId)) {
      series.set(contract.seriesId, {
        id: contract.seriesId,
        title: contract.series?.title ?? contract.seriesId
      })
    }
  }
  return [...series.values()]
}

function shortId(value: string): string {
  return value.length > 8 ? value.slice(-8) : value
}

function filterDescription(t: (key: string) => string, selectedView: string): string {
  if (selectedView.startsWith('contract:')) return t('finance.filters.contractDescription')
  if (selectedView.startsWith('series:')) return t('finance.filters.seriesDescription')
  return t('finance.filters.allDescription')
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <p className='text-sm text-muted-foreground'>{label}</p>
      <p className='mt-2 text-2xl font-bold tracking-tight text-foreground'>{value}</p>
    </article>
  )
}

function Breakdown({
  title,
  entries,
  empty,
  label,
  language
}: {
  title: string
  entries: Record<string, { count: number; amount: number }>
  empty: string
  label: (key: string) => string
  language: string
}) {
  const values = Object.entries(entries).filter(([, value]) => value.count > 0 || value.amount > 0)
  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <h2 className='font-semibold text-foreground'>{title}</h2>
      {values.length ? (
        <dl className='mt-4 divide-y divide-border'>
          {values.map(([key, value]) => (
            <div key={key} className='flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0'>
              <dt className='text-sm text-muted-foreground'>{label(key)}</dt>
              <dd className='text-right text-sm font-semibold text-foreground'>
                <span className='block'>{formatPaymentAmount(value.amount, language)}</span>
                <span className='text-xs font-normal text-muted-foreground'>{value.count}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className='mt-4 text-sm text-muted-foreground'>{empty}</p>
      )}
    </section>
  )
}

function LoadError({ message }: { message: string }) {
  return (
    <p
      role='alert'
      className='rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive'
    >
      {message}
    </p>
  )
}

function paymentStatusLabel(t: (key: string, options?: Record<string, unknown>) => string, status: string): string {
  return t(`finance.status.${status}`, { defaultValue: t('finance.unknown') })
}

function paymentTypeLabel(t: (key: string, options?: Record<string, unknown>) => string, type: string): string {
  return t(`finance.type.${type}`, { defaultValue: t('finance.unknown') })
}
