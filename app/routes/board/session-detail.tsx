import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerGetDecisions,
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
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    messages: messages?.status === 200 ? messages.data.items : [],
    decisions: decisions.data
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionDetailPage {...loaderData} />
}
