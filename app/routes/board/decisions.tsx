import { boardControllerGetDecisions, boardControllerGetSessions } from '~/api/operations/board/board'
import { BoardDecisionsPage } from '~/features/board'
import type { Route } from './+types/decisions'

export async function clientLoader() {
  try {
    const sessions = await boardControllerGetSessions({ mine: 'true' })
    const responses = await Promise.all(
      sessions.data.map((session) => boardControllerGetDecisions({ boardSessionId: session.id }))
    )
    const decisions = [
      ...new Map(responses.flatMap((response) => response.data).map((item) => [item.id, item])).values()
    ]
    return { sessions: sessions.data, decisions, hasError: false }
  } catch {
    return { sessions: [], decisions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardDecisionsPage {...loaderData} />
}
