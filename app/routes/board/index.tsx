import { BoardDashboardPage } from '~/features/board'
import { dashboardControllerBoard } from '~/api/operations/dashboard/dashboard'
import type { Route } from './+types/index'

export function meta() {
  return [{ title: 'Board Dashboard - MangaStudio Pro' }]
}

export async function clientLoader() {
  try {
    const response = await dashboardControllerBoard()
    return { dashboard: response.data, hasError: false }
  } catch {
    return { dashboard: null, hasError: true }
  }
}

export default function DashboardBoardRoute({ loaderData }: Route.ComponentProps) {
  return <BoardDashboardPage {...loaderData} />
}
