import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerAdvancePhase,
  boardControllerConcludeSession,
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { EditorBoardMeetingRoomPage, type EditorActionResult } from '~/features/editor'
import type { Route } from './+types/board-session-detail'

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
    decisions: decisions.data,
    messages: messages?.status === 200 ? messages.data.items : []
  }
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'startSession') {
      const response = await boardControllerStartSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return { ok: true, intent, messageKey: intent }
    }
    if (intent === 'concludeSession') {
      const response = await boardControllerConcludeSession({ id: params.id })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
      return { ok: true, intent, messageKey: intent }
    }
    if (intent !== 'advancePhase') return { ok: false, intent, errorKey: 'invalidAction' }
    const phase = String(form.get('phase') ?? '')
    if (phase !== 'QA' && phase !== 'VOTING') return { ok: false, intent, errorKey: 'invalidAction' }
    const response = await boardControllerAdvancePhase({ id: params.id }, { phase })
    if (response.status !== 200) return { ok: false, intent, errorKey: 'actionFailed' }
    return { ok: true, intent, messageKey: 'advancePhase', phase: response.data.phase }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardMeetingRoomPage {...loaderData} />
}
