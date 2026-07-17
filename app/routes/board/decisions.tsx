import { boardControllerGetDecisions } from '~/api/operations/board/board'
import { BoardDecisionsPage } from '~/features/board'
import type { Route } from './+types/decisions'

export async function clientLoader() {
  try {
    const response = await boardControllerGetDecisions()
    return { decisions: response.data, hasError: false }
  } catch {
    return { decisions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardDecisionsPage {...loaderData} />
}
