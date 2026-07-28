import {
  contractControllerGetContractVersionById,
  contractControllerGetContractVersions
} from '~/api/operations/contracts/contracts'
import { EditorContractHistoryPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-history'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, versions] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  const items = versions?.status === 200 ? versions.data : []
  const details = await Promise.all(
    items.map(async (version) => {
      const detail = await contractControllerGetContractVersionById({
        id: params.id,
        versionId: version.id
      }).catch(() => null)
      return detail?.status === 200 ? detail.data : version
    })
  )
  return { ...base, versions: details }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractHistoryPage {...loaderData} />
}
