import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerGetDecisions,
  boardControllerGetDecisionDetails,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages
} from '~/api/operations/board/board'
import { BoardSessionDetailPage } from '~/features/board'
import type { Route } from './+types/session-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [session, decisions, messages] = await Promise.all([
    boardControllerGetSessionById({ id: params.id }),
    boardControllerGetDecisions({ boardSessionId: params.id }),
    boardControllerGetSessionMessages({ id: params.id }, { limit: 200, offset: 0 }).catch(() => null)
  ])
  if (session.status !== 200) throw new Response('Not found', { status: 404 })
  const decisionDetails = await Promise.all(
    decisions.data.map((decision) =>
      boardControllerGetDecisionDetails({ id: decision.id })
        .then((response) => response.data)
        .catch(() => null)
    )
  )
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    messages: messages?.status === 200 ? messages.data.items : [],
    decisions: decisionDetails.filter((decision) => decision !== null)
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionDetailPage {...loaderData} />
}
