import { Link, useFetcher, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import { ArrowLeft } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  BoardActionDialog,
  boardInput,
  BoardFeedback,
  BoardHeader,
  EmptyState,
  StatusBadge
} from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardPaymentsPage({
  payments,
  hasError,
  canApprove = true,
  focusPaymentId = '',
  backPath,
  enableFilters = false,
  contractBasePath,
  seriesBasePath
}: {
  payments: PaymentRecordListResDtoOutputDataItem[]
  hasError: boolean
  canApprove?: boolean
  focusPaymentId?: string
  backPath?: string
  enableFilters?: boolean
  contractBasePath?: string
  seriesBasePath?: string
}) {
  const { t } = useTranslation('board')
  const [searchParams, setSearchParams] = useSearchParams()
  const paymentStatus = searchParams.get('status') ?? ''
  const paymentType = searchParams.get('paymentType') ?? ''
  const paymentSource = searchParams.get('paymentSource') ?? ''
  const [search, setSearch] = useState('')
  const paymentTypes = [...new Set(payments.map((payment) => payment.paymentType))]
  const filteredPayments = payments.filter(
    (payment) =>
      (!paymentStatus || payment.status === paymentStatus) &&
      (!paymentType || payment.paymentType === paymentType) &&
      (!paymentSource || payment.paymentSource === paymentSource) &&
      (!search ||
        `${payment.series?.title ?? ''} ${payment.receiver?.displayName ?? ''} ${payment.receiverId}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  )
  const orderedPayments = focusPaymentId
    ? [...filteredPayments].sort(
        (left, right) => Number(right.id === focusPaymentId) - Number(left.id === focusPaymentId)
      )
    : filteredPayments
  return (
    <div className='space-y-6 pb-12'>
      {backPath && (
        <Link to={backPath} className='inline-flex items-center gap-2 text-sm font-bold text-primary'>
          <ArrowLeft className='size-4' />
          {t('common.back')}
        </Link>
      )}
      <BoardHeader title={t('payments.title')} description={t('payments.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      {enableFilters && (
        <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-4'>
          <input
            className={boardInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('filters.searchPayments')}
          />
          <select
            className={boardInput}
            value={paymentStatus}
            onChange={(event) => updateFilter('status', event.target.value)}
          >
            <option value=''>{t('filters.allStatuses')}</option>
            {['PENDING', 'TRIGGERED', 'APPROVED', 'PAID', 'MISSED', 'FAILED', 'CANCELLED'].map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentStatuses.${value}`, { defaultValue: value })}
              </option>
            ))}
          </select>
          <select
            className={boardInput}
            value={paymentType}
            onChange={(event) => updateFilter('paymentType', event.target.value)}
          >
            <option value=''>{t('filters.allPaymentTypes')}</option>
            {paymentTypes.map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentTypes.${value}`, { defaultValue: value })}
              </option>
            ))}
          </select>
          <select
            className={boardInput}
            value={paymentSource}
            onChange={(event) => updateFilter('paymentSource', event.target.value)}
          >
            <option value=''>{t('filters.allPaymentSources')}</option>
            {['CONTRACT', 'REPRINT', 'TRANSFER', 'TERMINATION', 'MANUAL'].map((value) => (
              <option key={value} value={value}>
                {t(`filters.paymentSources.${value}`)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className='grid gap-4'>
        {orderedPayments.map((payment) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            canApprove={canApprove}
            focused={payment.id === focusPaymentId}
            contractBasePath={contractBasePath}
            seriesBasePath={seriesBasePath}
          />
        ))}
      </div>
      {!orderedPayments.length && <EmptyState text={t('payments.empty')} />}
    </div>
  )

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
}

function PaymentCard({
  payment,
  canApprove,
  focused,
  contractBasePath,
  seriesBasePath
}: {
  payment: PaymentRecordListResDtoOutputDataItem
  canApprove: boolean
  focused: boolean
  contractBasePath?: string
  seriesBasePath?: string
}) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <article
      id={`payment-${payment.id}`}
      className={`rounded-xl border bg-card p-5 shadow-sm ${focused ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
    >
      <div className='flex flex-wrap justify-between gap-3'>
        <div>
          <strong>{payment.series?.title ?? payment.paymentType}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>
            {t(`filters.paymentTypes.${payment.paymentType}`, { defaultValue: payment.paymentType })} ·{' '}
            {payment.receiver?.displayName ?? payment.receiverId}
          </p>
          {payment.description ? <p className='mt-1 text-xs text-muted-foreground'>{payment.description}</p> : null}
        </div>
        <div className='text-right'>
          <StatusBadge value={payment.status} />
          <p className='mt-2 font-bold'>{new Intl.NumberFormat().format(payment.amount)}</p>
        </div>
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        <BoardActionDialog title={t('payments.details')}>
          <div className='grid gap-4 text-xs'>
            <section className='rounded-lg border border-border p-4'>
              <h4 className='mb-3 text-sm font-bold text-foreground'>{t('payments.originDetails')}</h4>
              <dl className='grid gap-3 sm:grid-cols-2'>
                <PaymentFact
                  label={t('payments.series')}
                  value={
                    payment.seriesId && seriesBasePath ? (
                      <Link className='text-primary underline' to={`${seriesBasePath}/${payment.seriesId}`}>
                        {payment.series?.title ?? t('payments.openSeries')}
                      </Link>
                    ) : (
                      payment.series?.title
                    )
                  }
                />
                <PaymentFact
                  label={t('payments.contract')}
                  value={
                    contractBasePath ? (
                      <Link className='text-primary underline' to={`${contractBasePath}/${payment.contractId}`}>
                        {t('payments.openContract')}
                      </Link>
                    ) : (
                      shortId(payment.contractId)
                    )
                  }
                />
                <PaymentFact
                  label={t('payments.type')}
                  value={t(`filters.paymentTypes.${payment.paymentType}`, { defaultValue: payment.paymentType })}
                />
                <PaymentFact
                  label={t('payments.source')}
                  value={t(`filters.paymentSources.${payment.paymentSource}`, { defaultValue: payment.paymentSource })}
                />
                <PaymentFact label={t('payments.amount')} value={new Intl.NumberFormat().format(payment.amount)} />
                <PaymentFact label={t('payments.period')} value={payment.period} />
                <PaymentFact
                  label={t('payments.receiver')}
                  value={payment.receiver?.displayName ?? payment.receiverId}
                />
                <PaymentFact label={t('payments.condition')} value={payment.conditionId && shortId(payment.conditionId)} />
                <PaymentFact label={t('payments.createdAt')} value={formatDate(payment.createdAt)} />
                <PaymentFact label={t('payments.descriptionLabel')} value={payment.description} />
              </dl>
            </section>
            <section className='rounded-lg border border-border p-4'>
              <h4 className='mb-3 text-sm font-bold text-foreground'>{t('payments.processingDetails')}</h4>
              <dl className='grid gap-3 sm:grid-cols-2'>
                <PaymentFact label={t('payments.status')} value={<StatusBadge value={payment.status} />} />
                <PaymentFact
                  label={t('payments.approver')}
                  value={payment.approver?.displayName}
                  emptyValue={payment.status === 'TRIGGERED' ? t('payments.awaitingApproval') : undefined}
                />
                <PaymentFact
                  label={t('payments.approvedAt')}
                  value={formatDate(payment.approvedAt)}
                  emptyValue={payment.status === 'TRIGGERED' ? t('payments.awaitingApproval') : undefined}
                />
                <PaymentFact
                  label={t('payments.paidAt')}
                  value={formatDate(payment.paidAt)}
                  emptyValue={payment.status === 'APPROVED' ? t('payments.awaitingPayment') : undefined}
                />
                <PaymentFact label={t('payments.method')} value={payment.paymentMethod} />
                <PaymentFact label={t('payments.reference')} value={payment.transactionReference} />
                <PaymentFact label={t('payments.cancelledAt')} value={formatDate(payment.cancelledAt)} />
                <PaymentFact label={t('payments.cancelReason')} value={payment.cancelReason} />
                <PaymentFact label={t('payments.note')} value={payment.note} />
              </dl>
            </section>
          </div>
        </BoardActionDialog>
        {canApprove && payment.status === 'TRIGGERED' && (
          <fetcher.Form method='post'>
            <input type='hidden' name='paymentId' value={payment.id} />
            <button
              name='intent'
              value='approve'
              className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
            >
              {t('payments.approve')}
            </button>
          </fetcher.Form>
        )}
        {payment.status === 'APPROVED' && (
          <BoardActionDialog title={t('payments.pay')}>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='paymentId' value={payment.id} />
              <input className={boardInput} name='paymentMethod' placeholder={t('payments.method')} required />
              <input
                className={boardInput}
                name='transactionReference'
                placeholder={t('payments.reference')}
                required
              />
              <textarea className={`${boardInput} h-20 py-2`} name='note' placeholder={t('payments.noteOptional')} />
              <button
                name='intent'
                value='pay'
                className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
              >
                {t('payments.pay')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        )}{' '}
        {!['PAID', 'CANCELLED'].includes(payment.status) && (
          <BoardActionDialog title={t('payments.cancel')}>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='paymentId' value={payment.id} />
              <input className={boardInput} name='cancelReason' placeholder={t('payments.cancelReason')} required />
              <button
                name='intent'
                value='cancel'
                className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'
              >
                {t('payments.cancel')}
              </button>
            </fetcher.Form>
            <BoardFeedback data={fetcher.data} />
          </BoardActionDialog>
        )}
      </div>
      <BoardFeedback data={fetcher.data} />
    </article>
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
  const { t } = useTranslation('board')
  return (
    <div>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='mt-1 break-words font-semibold text-foreground'>
        {value || emptyValue || t('payments.notAvailable')}
      </dd>
    </div>
  )
}

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function formatDate(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
