import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetConfig,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { EditorBoardSessionsPage, type EditorActionResult } from '~/features/editor'
import { loadBoardSessionSeries, optionalDate, required } from './board-route-utils'
import type { Route } from './+types/board-sessions'

export async function clientLoader() {
  try {
    const [series, sessions, decisions, configResponse] = await Promise.all([
      loadBoardSessionSeries(),
      boardControllerGetSessions(),
      boardControllerGetDecisions(),
      boardControllerGetConfig()
    ])
    const configuredMemberCount = Math.max(3, Math.trunc(configResponse.data.quorumMin))
    const suggestedMemberCount = configuredMemberCount % 2 === 0 ? configuredMemberCount + 1 : configuredMemberCount
    return {
      series,
      sessions: sessions.data,
      decisions: decisions.data,
      suggestedMemberCount,
      hasError: false
    }
  } catch {
    return {
      series: [],
      sessions: [],
      decisions: [],
      suggestedMemberCount: 3,
      hasError: true
    }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'createSession') {
      const endTime = optionalDate(form, 'endTime')
      await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(required(form, 'startTime')).toISOString(),
        ...(endTime ? { endTime } : {}),
        seriesId: required(form, 'rosterSourceSeriesId')
      })
    } else if (intent === 'startSession') {
      await boardControllerStartSession({ id: required(form, 'sessionId') })
    } else if (intent === 'concludeSession') {
      await boardControllerConcludeSession({ id: required(form, 'sessionId') })
    } else {
      return { ok: false, intent, errorKey: 'invalidAction' }
    }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardSessionsPage {...loaderData} />
}
