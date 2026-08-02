import {
  paymentControllerCancelPayment,
  paymentControllerGetPaymentById,
  paymentControllerGetPayments,
  paymentControllerGetPaymentsByContract,
  paymentControllerGetPaymentsBySeries,
  paymentControllerGetPaymentsByUser,
  paymentControllerPayPayment
} from '~/api/operations/payments/payments'
import { BoardPaymentsPage, type BoardActionResult } from '~/features/board'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { paymentQuery } from '~/shared/lib/payments/payment-query'
import type { Route } from './+types/payments'
import { PayPaymentBodyDtoPaymentMethod } from '~/api/model/payments'
import { isEnumValue } from '~/shared/lib/is-enum-value'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusPaymentId = new URL(request.url).searchParams.get('paymentId')?.trim() ?? ''
  try {
    const query = paymentQuery(request)
    const response = query.contractId
      ? await paymentControllerGetPaymentsByContract({ id: query.contractId })
      : query.seriesId
        ? await paymentControllerGetPaymentsBySeries({ id: query.seriesId })
        : query.receiverId
          ? await paymentControllerGetPaymentsByUser({ id: query.receiverId })
          : await paymentControllerGetPayments(query)
    const payments = await Promise.all(
      response.data.data.map((payment) =>
        paymentControllerGetPaymentById({ id: payment.id })
          .then((detail) => detail.data)
          .catch(() => null)
      )
    )
    return {
      payments: payments.filter((payment) => payment !== null),
      focusPaymentId,
      hasError: false
    }
  } catch {
    return { payments: [], focusPaymentId, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  const id = required(form, 'paymentId')
  try {
    let message = ''
    if (intent === 'pay') {
      const paymentMethod = required(form, 'paymentMethod')
      if (!isEnumValue(PayPaymentBodyDtoPaymentMethod, paymentMethod)) return { ok: false, intent }
      const response = await paymentControllerPayPayment(
        { id },
        {
          paymentMethod,
          transactionReference: required(form, 'transactionReference'),
          ...(String(form.get('note') ?? '').trim() ? { note: String(form.get('note')).trim() } : {})
        }
      )
      message = extractApiSuccessMessage(response, 'Đã xác nhận khoản thanh toán được chi trả.')
    } else if (intent === 'cancel') {
      const response = await paymentControllerCancelPayment({ id }, { cancelReason: required(form, 'cancelReason') })
      message = extractApiSuccessMessage(response, 'Đã hủy khoản thanh toán.')
    } else return { ok: false, intent }
    return {
      ok: true,
      intent,
      messageKey: intent === 'pay' ? 'paymentPaid' : 'paymentCancelled',
      message
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
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardPaymentsPage {...loaderData} canApprove={false} backPath='/dashboard/admin/board' enableFilters />
}
