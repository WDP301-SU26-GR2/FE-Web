import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { ContractResDtoOutput, ContractStatusProgressResDtoOutput } from '~/api/model/contracts'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import { ContractPageLayout, contractInput } from './components/contract-shared'

export function EditorContractPaymentsPage({
  contract,
  progress,
  payments,
  hasError
}: {
  contract: ContractResDtoOutput
  progress: ContractStatusProgressResDtoOutput | null
  payments: PaymentRecordListResDtoOutputDataItem[]
  hasError: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const filtered = payments.filter(
    (payment) => (!status || payment.status === status) && (!type || payment.paymentType === type)
  )
  const types = [...new Set(payments.map((payment) => payment.paymentType))]

  return (
    <ContractPageLayout contract={contract} progress={progress} title={t('contractDetail.sections.payments')}>
      <section className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <select className={contractInput} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value=''>{t('contractDetail.payments.allStatuses')}</option>
            {['TRIGGERED', 'PENDING', 'APPROVED', 'PAID', 'MISSED', 'FAILED', 'CANCELLED'].map((value) => (
              <option key={value} value={value}>
                {t(`contractDetail.payments.statuses.${value}`)}
              </option>
            ))}
          </select>
          <select className={contractInput} value={type} onChange={(event) => setType(event.target.value)}>
            <option value=''>{t('contractDetail.payments.allTypes')}</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {t(`contractDetail.payments.types.${value}`, { defaultValue: value })}
              </option>
            ))}
          </select>
        </div>
      </section>

      {hasError && (
        <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
          {t('contractDetail.payments.loadError')}
        </p>
      )}

      <section className='grid gap-3'>
        {filtered.map((payment) => (
          <article key={payment.id} className='rounded-xl border border-border bg-card p-5 shadow-sm'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h3 className='font-bold text-foreground'>
                  {payment.series?.title ??
                    t(`contractDetail.payments.types.${payment.paymentType}`, { defaultValue: payment.paymentType })}
                </h3>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {t(`contractDetail.payments.types.${payment.paymentType}`, { defaultValue: payment.paymentType })} ·{' '}
                  {t(`contractDetail.payments.sources.${payment.paymentSource}`, {
                    defaultValue: payment.paymentSource
                  })}
                  {payment.period ? ` · ${payment.period}` : ''}
                </p>
              </div>
              <div className='text-right'>
                <span className='rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-secondary-foreground'>
                  {t(`contractDetail.payments.statuses.${payment.status}`)}
                </span>
                <p className='mt-2 font-bold text-foreground'>{formatAmount(payment.amount, i18n.language)}</p>
              </div>
            </div>
            {payment.description && <p className='mt-3 text-sm text-muted-foreground'>{payment.description}</p>}
            <dl className='mt-4 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-2 lg:grid-cols-3'>
              <PaymentFact
                label={t('contractDetail.payments.contract')}
                value={
                  <Link className='text-primary underline' to={`/dashboard/editor/contracts/${payment.contractId}`}>
                    {t('contractDetail.payments.openContract')}
                  </Link>
                }
              />
              <PaymentFact
                label={t('contractDetail.payments.series')}
                value={
                  payment.seriesId ? (
                    <Link className='text-primary underline' to={`/dashboard/editor/proposals/${payment.seriesId}`}>
                      {payment.series?.title ?? t('contractDetail.payments.openSeries')}
                    </Link>
                  ) : (
                    payment.series?.title
                  )
                }
              />
              <PaymentFact
                label={t('contractDetail.payments.condition')}
                value={payment.conditionId ? shortId(payment.conditionId) : null}
              />
              <PaymentFact
                label={t('contractDetail.payments.createdAt')}
                value={formatDate(payment.createdAt, i18n.language)}
              />
              <PaymentFact
                label={t('contractDetail.payments.receiver')}
                value={payment.receiver?.displayName ?? payment.receiverId}
              />
              <PaymentFact
                label={t('contractDetail.payments.approver')}
                value={payment.approver?.displayName}
                emptyValue={payment.status === 'TRIGGERED' ? t('contractDetail.payments.awaitingApproval') : undefined}
              />
              <PaymentFact
                label={t('contractDetail.payments.approvedAt')}
                value={formatDate(payment.approvedAt, i18n.language)}
                emptyValue={payment.status === 'TRIGGERED' ? t('contractDetail.payments.awaitingApproval') : undefined}
              />
              <PaymentFact label={t('contractDetail.payments.method')} value={payment.paymentMethod} />
              <PaymentFact label={t('contractDetail.payments.reference')} value={payment.transactionReference} />
              <PaymentFact
                label={t('contractDetail.payments.paidAt')}
                value={formatDate(payment.paidAt, i18n.language)}
                emptyValue={payment.status === 'APPROVED' ? t('contractDetail.payments.awaitingPayment') : undefined}
              />
              <PaymentFact
                label={t('contractDetail.payments.cancelledAt')}
                value={formatDate(payment.cancelledAt, i18n.language)}
              />
              <PaymentFact label={t('contractDetail.payments.cancelReason')} value={payment.cancelReason} />
              <PaymentFact label={t('contractDetail.payments.note')} value={payment.note} />
            </dl>
          </article>
        ))}
        {!filtered.length && !hasError && (
          <p className='rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground'>
            {t('contractDetail.payments.empty')}
          </p>
        )}
      </section>
    </ContractPageLayout>
  )
}

function PaymentFact({
  label,
  value,
  emptyValue
}: {
  label: string
  value?: ReactNode
  emptyValue?: string
}) {
  const { t } = useTranslation('editor')
  return (
    <div>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words font-semibold text-foreground'>
        {value || emptyValue || t('contractDetail.payments.notAvailable')}
      </dd>
    </div>
  )
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function formatDate(value: string | null, locale: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatAmount(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}
