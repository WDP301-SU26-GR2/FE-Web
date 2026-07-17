import { boardControllerGetSessions } from '~/api/operations/board/board'
import { BoardSessionsPage } from '~/features/board'
import type { Route } from './+types/sessions'

export async function clientLoader() {
  try {
    const response = await boardControllerGetSessions()
    return { sessions: response.data, hasError: false }
  } catch {
    return { sessions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionsPage {...loaderData} />
}
