import { contractControllerGetContractVersions } from '~/api/operations/contracts/contracts'
import { EditorContractHistoryPage } from '~/features/editor'
import { loadContractBase } from './contract-route-utils'
import type { Route } from './+types/contract-history'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [base, versions] = await Promise.all([
    loadContractBase(params.id),
    contractControllerGetContractVersions({ id: params.id }).catch(() => null)
  ])
  return { ...base, versions: versions?.status === 200 ? versions.data : [] }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorContractHistoryPage {...loaderData} />
}
