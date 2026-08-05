import {
  paymentControllerGetPaymentById,
  paymentControllerGetPaymentsByContract
} from '~/api/operations/payments/payments'
import { EditorContractPaymentsPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-payments'
import { SITE } from '~/shared/config/site'

export function meta() {
  return [{ title: SITE.name }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, response] = await Promise.all([
    loadContractBase(params.id),
    paymentControllerGetPaymentsByContract({ id: params.id }).catch(() => null)
  ])
  const paymentItems = response?.status === 200 ? response.data.data : []
  const paymentDetails = await Promise.all(
    paymentItems.map(async (payment) => {
      const detail = await paymentControllerGetPaymentById({ id: payment.id }).catch(() => null)
      return detail?.status === 200 ? detail.data : null
    })
  )
  return {
    ...base,
    payments: paymentDetails.filter((payment) => payment != null),
    hasError: response == null
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractPaymentsPage {...loaderData} />
}
