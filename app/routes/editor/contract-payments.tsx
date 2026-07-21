import { paymentControllerGetPaymentsByContract } from '~/api/operations/payments/payments'
import { EditorContractPaymentsPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-payments'

export function meta() {
  return [{ title: 'Lịch sử thanh toán hợp đồng - Mangaka Studio' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, response] = await Promise.all([
    loadContractBase(params.id),
    paymentControllerGetPaymentsByContract({ id: params.id }).catch(() => null)
  ])
  return {
    ...base,
    payments: response?.status === 200 ? response.data.data : [],
    hasError: response == null
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractPaymentsPage {...loaderData} />
}
