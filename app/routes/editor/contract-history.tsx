import {
  contractControllerGetContractVersionById,
  contractControllerGetContractVersions
} from '~/api/operations/contracts/contracts'
import { EditorContractHistoryPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import type { Route } from './+types/contract-history'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, versions] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  const items = versions?.status === 200 ? versions.data : []
  const details = await mapWithConcurrency(items, DETAIL_REQUEST_CONCURRENCY, async (version) => {
    const detail = await contractControllerGetContractVersionById({
      id: params.id,
      versionId: version.id
    }).catch(() => null)
    return detail?.status === 200 ? detail.data : version
  })
  return { ...base, versions: details }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractHistoryPage {...loaderData} />
}
