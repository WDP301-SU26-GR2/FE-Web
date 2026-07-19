import {
  paymentControllerCancelPayment,
  paymentControllerGetPayments,
  paymentControllerPayPayment
} from '~/api/operations/payments/payments'
import { BoardPaymentsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/payments'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusPaymentId = new URL(request.url).searchParams.get('paymentId')?.trim() ?? ''
  try {
    const response = await paymentControllerGetPayments()
    return { payments: response.data.data, focusPaymentId, hasError: false }
  } catch {
    return { payments: [], focusPaymentId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  const id = required(form, 'paymentId')
  try {
    if (intent === 'pay') {
      await paymentControllerPayPayment(
        { id },
        {
          paymentMethod: required(form, 'paymentMethod'),
          transactionReference: required(form, 'transactionReference')
        }
      )
    } else if (intent === 'cancel') {
      await paymentControllerCancelPayment({ id }, { cancelReason: required(form, 'cancelReason') })
    } else return { ok: false, intent }
    return { ok: true, intent }
  } catch {
    return { ok: false, intent }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardPaymentsPage {...loaderData} canApprove={false} backPath='/dashboard/admin/board' enableFilters />
}
