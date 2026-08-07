import {
  boardControllerGetConfig,
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerStartSession
} from '~/api/operations/board/board'
import {
  BOARD_SESSION_INTENTS,
  EditorBoardSessionsPage,
  isValidBoardSessionTimeRange,
  mapBoardSessionError,
  type EditorActionResult
} from '~/features/editor'
import { hydrateBoardDecisions, hydrateBoardSessions, loadBoardSessionSeries, required } from './board-route-utils'
import type { Route } from './+types/board-sessions'

export async function loadBoardSessionsPage(manageAll = false) {
  const [seriesResult, sessionsResult, decisionsResult, boardConfigResult] = await Promise.allSettled([
    loadBoardSessionSeries(),
    boardControllerGetSessions(manageAll ? undefined : { mine: 'true' }),
    boardControllerGetDecisions(),
    boardControllerGetConfig()
  ])
  const [sessions, decisions] = await Promise.all([
    sessionsResult.status === 'fulfilled' ? hydrateBoardSessions(sessionsResult.value.data) : [],
    decisionsResult.status === 'fulfilled' ? hydrateBoardDecisions(decisionsResult.value.data) : []
  ])

  return {
    series: seriesResult.status === 'fulfilled' ? seriesResult.value : [],
    sessions,
    decisions,
    boardConfig: boardConfigResult.status === 'fulfilled' ? boardConfigResult.value.data : null,
    hasError: [seriesResult, sessionsResult, decisionsResult, boardConfigResult].some(
      (result) => result.status === 'rejected'
    )
  }
}

export async function clientLoader() {
  return loadBoardSessionsPage()
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === BOARD_SESSION_INTENTS.create) {
      const startTime = required(form, 'startTime')
      const endTime = String(form.get('endTime') ?? '').trim() || undefined
      if (!isValidBoardSessionTimeRange(startTime, endTime)) {
        return { ok: false, intent, errorKey: 'invalidSessionTime' }
      }
      const allowedEditorIds = form
        .getAll('allowedEditorIds')
        .map((value) => String(value).trim())
        .filter(Boolean)
      await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(startTime).toISOString(),
        ...(endTime ? { endTime: new Date(endTime).toISOString() } : {}),
        seriesId: required(form, 'seriesId'),
        allowedEditorIds
      })
    } else if (intent === BOARD_SESSION_INTENTS.start) {
      await boardControllerStartSession({ id: required(form, 'sessionId') })
    } else if (intent === BOARD_SESSION_INTENTS.conclude) {
      await boardControllerConcludeSession({ id: required(form, 'sessionId') })
    } else {
      return { ok: false, intent, errorKey: 'invalidAction' }
    }
    return { ok: true, intent, messageKey: intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: mapBoardSessionError(error)
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardSessionsPage {...loaderData} />
}
