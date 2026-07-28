import {
  contractAmendmentControllerListAmendments,
  contractControllerGetContractVersions,
  paymentConditionControllerGetPaymentConditions
} from '~/api/operations/contracts/contracts'
import { EditorContractDetailPage } from '~/features/editor'
import { hydrateAmendments, loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, conditions, versions, amendments] = await Promise.all([
    loadContractBase(params.id),
    paymentConditionControllerGetPaymentConditions({ contractId: params.id }).catch(() => null),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null),
    contractAmendmentControllerListAmendments({ contractId: params.id }).catch(() => null)
  ])
  return {
    ...base,
    conditions: conditions?.status === 200 ? conditions.data.data : [],
    versions: versions?.status === 200 ? versions.data : [],
    amendments: amendments?.status === 200 ? await hydrateAmendments(params.id, amendments.data) : []
  }
}

export default function EditorContractDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorContractDetailPage data={loaderData} />
}
