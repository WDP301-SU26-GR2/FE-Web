import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetConfig,
  boardControllerGetDecisions,
  boardControllerGetSessions,
  boardControllerSuggestMembers,
  boardControllerStartSession
} from '~/api/operations/board/board'
import { EditorBoardSessionsPage, type EditorActionResult } from '~/features/editor'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import {
  hydrateBoardDecisions,
  hydrateBoardSessions,
  loadBoardSessionSeries,
  optionalDate,
  required
} from './board-route-utils'
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
      sessions: await hydrateBoardSessions(sessions.data),
      decisions: await hydrateBoardDecisions(decisions.data),
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
    let message = ''
    if (intent === 'createSession') {
      const endTime = optionalDate(form, 'endTime')
      const seriesId = required(form, 'rosterSourceSeriesId')
      const suggested = await boardControllerSuggestMembers({ seriesId })
      const response = await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(required(form, 'startTime')).toISOString(),
        ...(endTime ? { endTime } : {}),
        seriesId,
        allowedEditorIds: suggested.data.items.map((member) => member.userId)
      })
      message = extractApiSuccessMessage(response, 'Đã tạo phiên họp Hội đồng.')
    } else if (intent === 'startSession') {
      const response = await boardControllerStartSession({ id: required(form, 'sessionId') })
      message = extractApiSuccessMessage(response, 'Đã bắt đầu phiên họp Hội đồng.')
    } else if (intent === 'concludeSession') {
      const response = await boardControllerConcludeSession({ id: required(form, 'sessionId') })
      message = extractApiSuccessMessage(response, 'Đã kết thúc phiên họp Hội đồng.')
    } else {
      return { ok: false, intent, errorKey: 'invalidAction' }
    }
    return { ok: true, intent, messageKey: intent, message }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: 'actionFailed',
      message: extractApiErrorMessage(error, 'Không thể cập nhật phiên họp Hội đồng.')
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardSessionsPage {...loaderData} />
}
