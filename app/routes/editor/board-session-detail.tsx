import { getBoardSessionMessages, readBoardSessionPhase, advanceBoardSessionPhase } from '~/api/manual/board-meeting'
import { boardControllerGetDecisions, boardControllerGetSessionById } from '~/api/operations/board/board'
import { EditorBoardMeetingRoomPage, type EditorActionResult } from '~/features/editor'
import type { Route } from './+types/board-session-detail'

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
    decisions: decisions.data.filter((decision) => decision.boardSessionId === params.id),
    messages: messages?.status === 200 ? messages.data.items : []
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'advancePhase') return { ok: false, intent, errorKey: 'invalidAction' }
    const phase = String(form.get('phase') ?? '')
    if (phase !== 'QA' && phase !== 'VOTING') return { ok: false, intent, errorKey: 'invalidAction' }
    await advanceBoardSessionPhase(params.id, phase)
    return { ok: true, intent, messageKey: 'advancePhase' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardMeetingRoomPage {...loaderData} />
}
