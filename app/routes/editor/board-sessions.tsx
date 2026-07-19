import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetConfig,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorBoardSessionsPage, type EditorActionResult } from '~/features/editor'
import { optionalDate, required } from './board-route-utils'
import type { Route } from './+types/board-sessions'

export async function clientLoader() {
  try {
    const [readySeriesResponse, pitchedSeriesResponse, sessions, decisions, configResponse] = await Promise.all([
      seriesControllerListSeries({ status: 'READY_TO_PITCH', limit: 100, offset: 0 }),
      seriesControllerListSeries({ status: 'PITCHED', limit: 100, offset: 0 }),
      boardControllerGetSessions(),
      boardControllerGetDecisions(),
      boardControllerGetConfig()
    ])
    const configuredMemberCount = Math.max(3, Math.trunc(configResponse.data.quorumMin))
    const suggestedMemberCount = configuredMemberCount % 2 === 0 ? configuredMemberCount + 1 : configuredMemberCount
    const series = [
      ...new Map(
        [...readySeriesResponse.data.items, ...pitchedSeriesResponse.data.items].map((item) => [item.id, item])
      ).values()
    ]
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
