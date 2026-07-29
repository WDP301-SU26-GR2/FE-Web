import { contractControllerGetContractById, contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { BoardContractsPage } from '~/features/board'
import type { Route } from './+types/contracts'

export async function clientLoader() {
  try {
    const response = await contractControllerGetContracts()
    const contracts = await Promise.all(
      response.data.map((contract) =>
        contractControllerGetContractById({ id: contract.id })
          .then((detail) => detail.data)
          .catch(() => null)
      )
    )
    return { contracts: contracts.filter((contract) => contract !== null), hasError: false }
  } catch {
    return { contracts: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardContractsPage {...loaderData} />
}
