import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerSuggestMembers,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorBoardSessionsPage, type EditorActionResult } from '~/features/editor'
import { optionalDate, required } from './board-route-utils'
import type { Route } from './+types/board-sessions'

export async function clientLoader() {
  try {
    const [seriesResponse, sessions, decisions] = await Promise.all([
      seriesControllerListSeries({ status: 'READY_TO_PITCH', limit: 100, offset: 0 }),
      boardControllerGetSessions(),
      boardControllerGetDecisions()
    ])
    const series = seriesResponse.data.items
    const suggestionEntries = await Promise.all(
      series.map(async (item) => {
        const response = await boardControllerSuggestMembers({ seriesId: item.id, size: 3 }).catch(() => null)
        return [item.id, response?.status === 200 ? response.data.items : []] as const
      })
    )
    return {
      series,
      sessions: sessions.data,
      decisions: decisions.data,
      suggestions: Object.fromEntries(suggestionEntries),
      hasError: false
    }
  } catch {
    return { series: [], sessions: [], decisions: [], suggestions: {}, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'createSession') {
      const endTime = optionalDate(form, 'endTime')
      const allowedEditorIds = String(form.get('allowedEditorIds') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(required(form, 'startTime')).toISOString(),
        ...(endTime ? { endTime } : {}),
        seriesId: required(form, 'seriesId'),
        allowedEditorIds
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
