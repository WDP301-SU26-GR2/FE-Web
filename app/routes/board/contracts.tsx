import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { BoardContractsPage } from '~/features/board'
import type { Route } from './+types/contracts'

export async function clientLoader() {
  try {
    const response = await contractControllerGetContracts()
    return { contracts: response.data, hasError: false }
  } catch {
    return { contracts: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardContractsPage {...loaderData} />
}
