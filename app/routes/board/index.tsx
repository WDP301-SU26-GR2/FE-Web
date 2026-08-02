import { BoardDashboardPage } from '~/features/board'
import { boardControllerGetConfig } from '~/api/operations/board/board'
import { boardDashboardControllerBoard } from '~/api/operations/dashboard/dashboard'
import type { Route } from './+types/index'

export async function clientLoader() {
  try {
    const [response, config] = await Promise.all([
      boardDashboardControllerBoard(),
      boardControllerGetConfig().catch(() => null)
    ])
    return { dashboard: response.data, config: config?.status === 200 ? config.data : null, hasError: false }
  } catch {
    return { dashboard: null, config: null, hasError: true }
  }
}

export default function DashboardBoardRoute({ loaderData }: Route.ComponentProps) {
  return <BoardDashboardPage {...loaderData} />
}
