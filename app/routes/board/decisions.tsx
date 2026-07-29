import {
  boardControllerGetDecisionDetails,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessions
} from '~/api/operations/board/board'
import { BoardDecisionsPage } from '~/features/board'
import type { Route } from './+types/decisions'

export async function clientLoader() {
  try {
    const sessions = await boardControllerGetSessions({ mine: 'true' })
    const sessionDetails = await Promise.all(
      sessions.data.map((session) =>
        boardControllerGetSessionById({ id: session.id })
          .then((response) => response.data)
          .catch(() => null)
      )
    )
    const responses = await Promise.all(
      sessions.data.map((session) => boardControllerGetDecisions({ boardSessionId: session.id }))
    )
    const decisionItems = [
      ...new Map(responses.flatMap((response) => response.data).map((item) => [item.id, item])).values()
    ]
    const decisions = await Promise.all(
      decisionItems.map((decision) =>
        boardControllerGetDecisionDetails({ id: decision.id })
          .then((response) => response.data)
          .catch(() => null)
      )
    )
    return {
      sessions: sessionDetails.filter((session) => session !== null),
      decisions: decisions.filter((decision) => decision !== null),
      hasError: false
    }
  } catch {
    return { sessions: [], decisions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardDecisionsPage {...loaderData} />
}
