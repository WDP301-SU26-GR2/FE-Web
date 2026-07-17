import { boardControllerGetDecisions, boardControllerGetSessionById } from '~/api/operations/board/board'
import { getBoardSessionMessages, readBoardSessionPhase } from '~/api/manual/board-meeting'
import { BoardSessionDetailPage } from '~/features/board'
import type { Route } from './+types/session-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [session, decisions, messages] = await Promise.all([
    boardControllerGetSessionById({ id: params.id }),
    boardControllerGetDecisions(),
    getBoardSessionMessages(params.id).catch(() => null)
  ])
  if (session.status !== 200) throw new Response('Not found', { status: 404 })
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    messages: messages?.status === 200 ? messages.data.items : [],
    decisions: decisions.data.filter((item) => item.boardSessionId === params.id)
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionDetailPage {...loaderData} />
}
