import {
  boardControllerGetDecisionDetails,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessions
} from '~/api/operations/board/board'
import { BoardDecisionsPage } from '~/features/board'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import type { Route } from './+types/decisions'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader() {
  try {
    const sessions = await boardControllerGetSessions({ mine: 'true' })
    const sessionDetails = await mapWithConcurrency(sessions.data, DETAIL_REQUEST_CONCURRENCY, (session) =>
      boardControllerGetSessionById({ id: session.id })
        .then((response) => response.data)
        .catch(() => null)
    )
    const responses = await mapWithConcurrency(sessions.data, DETAIL_REQUEST_CONCURRENCY, (session) =>
      boardControllerGetDecisions({ boardSessionId: session.id })
    )
    const decisionItems = [
      ...new Map(responses.flatMap((response) => response.data).map((item) => [item.id, item])).values()
    ]
    const decisions = await mapWithConcurrency(decisionItems, DETAIL_REQUEST_CONCURRENCY, (decision) =>
      boardControllerGetDecisionDetails({ id: decision.id })
        .then((response) => response.data)
        .catch(() => null)
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
