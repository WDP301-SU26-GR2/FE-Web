import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { PaymentRecordListResDtoOutputDataItem } from '~/api/model/payments'
import { boardInput, BoardFeedback, BoardHeader, EmptyState, StatusBadge } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardPaymentsPage({
  payments,
  hasError
}: {
  payments: PaymentRecordListResDtoOutputDataItem[]
  hasError: boolean
}) {
  const { t } = useTranslation('board')
  return (
    <div className='space-y-6 pb-12'>
      <BoardHeader title={t('payments.title')} description={t('payments.description')} />
      {hasError && <p className='text-sm text-destructive'>{t('common.loadError')}</p>}
      <div className='grid gap-4'>
        {payments.map((payment) => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </div>
      {!payments.length && <EmptyState text={t('payments.empty')} />}
    </div>
  )
}

function PaymentCard({ payment }: { payment: PaymentRecordListResDtoOutputDataItem }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <article className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex flex-wrap justify-between gap-3'>
        <div>
          <strong>{payment.paymentType}</strong>
          <p className='mt-1 text-xs text-muted-foreground'>{payment.description || payment.receiverId}</p>
        </div>
        <div className='text-right'>
          <StatusBadge value={payment.status} />
          <p className='mt-2 font-bold'>{new Intl.NumberFormat().format(payment.amount)}</p>
        </div>
      </div>
      <fetcher.Form method='post' className='mt-4 grid gap-3 sm:grid-cols-3'>
        <input type='hidden' name='paymentId' value={payment.id} />
        {(payment.status === 'TRIGGERED' || payment.status === 'PENDING') && (
          <button
            name='intent'
            value='approve'
            className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
          >
            {t('payments.approve')}
          </button>
        )}
        {payment.status === 'APPROVED' && (
          <>
            <input className={boardInput} name='paymentMethod' placeholder={t('payments.method')} required />
            <input className={boardInput} name='transactionReference' placeholder={t('payments.reference')} required />
            <button
              name='intent'
              value='pay'
              className='h-10 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground'
            >
              {t('payments.pay')}
            </button>
          </>
        )}{' '}
        {!['PAID', 'CANCELLED'].includes(payment.status) && (
          <>
            <input className={boardInput} name='cancelReason' placeholder={t('payments.cancelReason')} />
            <button
              name='intent'
              value='cancel'
              className='h-10 rounded-md border border-destructive px-3 text-sm font-bold text-destructive'
            >
              {t('payments.cancel')}
            </button>
          </>
        )}
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </article>
  )
}
