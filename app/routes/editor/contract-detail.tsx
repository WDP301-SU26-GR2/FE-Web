import { contractControllerGetPaymentConditions } from '~/api/operations/contracts/contracts'
import { EditorContractDetailPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, conditions] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetPaymentConditions({ contractId: params.id }).catch(() => null)
  ])
  return {
    ...base,
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    versions: [],
    amendments: []
  }
}

export default function EditorContractDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractDetailPage data={loaderData} />
}
