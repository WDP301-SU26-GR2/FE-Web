import {
  paymentControllerApprovePayment,
  paymentControllerCancelPayment,
  paymentControllerGetPayments,
  paymentControllerPayPayment
} from '~/api/operations/payments/payments'
import { BoardPaymentsPage, type BoardActionResult } from '~/features/board'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { paymentQuery } from '~/shared/lib/payments/payment-query'
import type { Route } from './+types/payments'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const response = await paymentControllerGetPayments(paymentQuery(request))
    return { payments: response.data.data, hasError: false }
  } catch {
    return { payments: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  const id = required(form, 'paymentId')
  try {
    if (intent === 'approve') {
      await paymentControllerApprovePayment({ id })
    } else if (intent === 'pay') {
      await paymentControllerPayPayment(
        { id },
        {
          paymentMethod: required(form, 'paymentMethod'),
          transactionReference: required(form, 'transactionReference'),
          ...(String(form.get('note') ?? '').trim() ? { note: String(form.get('note')).trim() } : {})
        }
      )
    } else if (intent === 'cancel') {
      await paymentControllerCancelPayment({ id }, { cancelReason: required(form, 'cancelReason') })
    } else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey: intent === 'approve' ? 'paymentApproved' : intent === 'pay' ? 'paymentPaid' : 'paymentCancelled'
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể cập nhật khoản thanh toán. Vui lòng thử lại.')
    }
  }
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardPaymentsPage {...loaderData} enableFilters contractBasePath='/dashboard/board/contracts' />
}
