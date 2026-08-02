import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetConfig,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerStartSession,
  boardControllerSuggestMembers
} from '~/api/operations/board/board'
import {
  BOARD_SESSION_INTENTS,
  BOARD_ROSTER_MODES,
  EditorBoardSessionsPage,
  getBoardMaximumMemberCount,
  isValidBoardSessionTimeRange,
  isValidManualBoardRoster,
  mapBoardSessionError,
  normalizeBoardRosterSize,
  parseManualBoardMemberIds,
  type EditorActionResult
} from '~/features/editor'
import { hydrateBoardDecisions, hydrateBoardSessions, loadBoardSessionSeries, required } from './board-route-utils'
import type { Route } from './+types/board-sessions'

export async function loadBoardSessionsPage(manageAll = false) {
  const [seriesResult, sessionsResult, decisionsResult, configResult] = await Promise.allSettled([
    loadBoardSessionSeries(),
    boardControllerGetSessions(manageAll ? undefined : { mine: 'true' }),
    boardControllerGetDecisions(),
    boardControllerGetConfig()
  ])
  const suggestedMemberCount =
    configResult.status === 'fulfilled'
      ? normalizeBoardRosterSize(configResult.value.data.quorumMin, configResult.value.data.boardTotalMembers)
      : 3
  const maximumMemberCount =
    configResult.status === 'fulfilled' ? getBoardMaximumMemberCount(configResult.value.data.boardTotalMembers) : 0
  const [sessions, decisions] = await Promise.all([
    sessionsResult.status === 'fulfilled' ? hydrateBoardSessions(sessionsResult.value.data) : [],
    decisionsResult.status === 'fulfilled' ? hydrateBoardDecisions(decisionsResult.value.data) : []
  ])

  return {
    series: seriesResult.status === 'fulfilled' ? seriesResult.value : [],
    sessions,
    decisions,
    suggestedMemberCount,
    maximumMemberCount,
    hasError: [seriesResult, sessionsResult, decisionsResult, configResult].some(
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
    if (intent === BOARD_SESSION_INTENTS.suggestMembers) {
      const response = await boardControllerSuggestMembers({
        seriesId: required(form, 'seriesId'),
        size: Number(required(form, 'rosterSize'))
      })
      return {
        ok: true,
        intent,
        messageKey: 'suggestMembersLoaded',
        suggestedMembers: response.data.items,
        suggestedSize: response.data.size
      }
    }
    if (intent === BOARD_SESSION_INTENTS.create) {
      const startTime = required(form, 'startTime')
      const endTime = String(form.get('endTime') ?? '').trim() || undefined
      if (!isValidBoardSessionTimeRange(startTime, endTime)) {
        return { ok: false, intent, errorKey: 'invalidSessionTime' }
      }
      const rosterMode = String(form.get('rosterMode') ?? '')
      const seriesId = String(form.get('rosterSourceSeriesId') ?? '').trim()
      const manualMemberIds = parseManualBoardMemberIds(String(form.get('manualRosterIds') ?? ''))
      if (rosterMode !== BOARD_ROSTER_MODES.automatic && rosterMode !== BOARD_ROSTER_MODES.manual) {
        return { ok: false, intent, errorKey: 'invalidAction' }
      }
      if (rosterMode === BOARD_ROSTER_MODES.automatic && !seriesId) {
        return { ok: false, intent, errorKey: 'rosterSourceRequired' }
      }
      if (rosterMode === BOARD_ROSTER_MODES.manual) {
        const config = await boardControllerGetConfig()
        const maximumMemberCount = getBoardMaximumMemberCount(config.data.boardTotalMembers)
        if (!isValidManualBoardRoster(manualMemberIds, maximumMemberCount)) {
          return { ok: false, intent, errorKey: 'invalidBoardMembers' }
        }
      }
      await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(startTime).toISOString(),
        ...(endTime ? { endTime: new Date(endTime).toISOString() } : {}),
        ...(rosterMode === BOARD_ROSTER_MODES.manual
          ? { allowedEditorIds: manualMemberIds }
          : { seriesId, rosterSize: Number(required(form, 'rosterSize')) })
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
