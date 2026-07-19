import {
  paymentControllerApprovePayment,
  paymentControllerCancelPayment,
  paymentControllerGetPayments,
  paymentControllerPayPayment
} from '~/api/operations/payments/payments'
import { usersControllerGetMe } from '~/api/operations/users/users'
import { BoardPaymentsPage, type BoardActionResult } from '~/features/board'
import type { Route } from './+types/payments'

export async function clientLoader() {
  try {
    const response = await paymentControllerGetPayments()
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
      const me = await usersControllerGetMe()
      if (me.status !== 200) throw new Error('User not found')
      await paymentControllerApprovePayment({ id }, { approvedBy: me.data.id })
    } else if (intent === 'pay') {
      await paymentControllerPayPayment(
        { id },
        { paymentMethod: required(form, 'paymentMethod'), transactionReference: required(form, 'transactionReference') }
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
  const value = String(form.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardPaymentsPage {...loaderData} enableFilters />
}
