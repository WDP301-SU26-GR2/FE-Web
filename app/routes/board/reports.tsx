import { boardControllerGetReports } from '~/api/operations/board/board'
import { BoardReportsPage } from '~/features/board'
import type { Route } from './+types/reports'

export async function clientLoader() {
  try {
    const response = await boardControllerGetReports()
    return { reports: response.data, hasError: false }
  } catch {
    return { reports: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardReportsPage {...loaderData} enableFilters />
}
