import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { BoardActionDialog, boardInput, BoardFeedback, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardPaymentsPage({
  payments,
  hasError,
  canApprove = true,
  focusPaymentId = '',
  backPath,
  enableFilters = false
}: {
  payments: PaymentRecordListResDtoOutputDataItem[]
  hasError: boolean
  canApprove?: boolean
  focusPaymentId?: string
  backPath?: string
  enableFilters?: boolean
}) {
  const { t } = useTranslation('board')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [paymentType, setPaymentType] = useState('')
  const [search, setSearch] = useState('')
  const paymentTypes = [...new Set(payments.map((payment) => payment.paymentType))]
  const filteredPayments = payments.filter(
    (payment) =>
      (!paymentStatus || payment.status === paymentStatus) &&
      (!paymentType || payment.paymentType === paymentType) &&
      (!search || `${payment.series?.title ?? ''} ${payment.receiver?.displayName ?? ''} ${payment.receiverId}`.toLowerCase().includes(search.toLowerCase()))
  )
  const orderedPayments = focusPaymentId
    ? [...filteredPayments].sort((left, right) => Number(right.id === focusPaymentId) - Number(left.id === focusPaymentId))
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
        <div className='grid gap-2 rounded-xl border border-border bg-card p-4 md:grid-cols-3'>
          <input className={boardInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.searchPayments')} />
          <select className={boardInput} value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
            <option value=''>{t('filters.allStatuses')}</option>
            {['PENDING', 'TRIGGERED', 'APPROVED', 'PAID', 'MISSED', 'FAILED', 'CANCELLED'].map((value) => (
              <option key={value} value={value}>{t(`filters.paymentStatuses.${value}`, { defaultValue: value })}</option>
            ))}
          </select>
          <select className={boardInput} value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
            <option value=''>{t('filters.allPaymentTypes')}</option>
            {paymentTypes.map((value) => (
              <option key={value} value={value}>{t(`filters.paymentTypes.${value}`, { defaultValue: value })}</option>
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
          />
        ))}
      </div>
      {!orderedPayments.length && <EmptyState text={t('payments.empty')} />}
    </div>
  )
}

function PaymentCard({
  payment,
  canApprove,
  focused
}: {
  payment: PaymentRecordListResDtoOutputDataItem
  canApprove: boolean
  focused: boolean
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
            {payment.paymentType} · {payment.receiver?.displayName ?? payment.receiverId}
          </p>
          {payment.description ? <p className='mt-1 text-xs text-muted-foreground'>{payment.description}</p> : null}
        </div>
        <div className='text-right'>
          <StatusBadge value={payment.status} />
          <p className='mt-2 font-bold'>{new Intl.NumberFormat().format(payment.amount)}</p>
        </div>
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        {canApprove && (payment.status === 'TRIGGERED' || payment.status === 'PENDING') && (
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
            <input className={boardInput} name='transactionReference' placeholder={t('payments.reference')} required />
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
