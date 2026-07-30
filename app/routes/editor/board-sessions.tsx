import {
  boardControllerConcludeSession,
  boardControllerCreateSession,
  boardControllerGetConfig,
  boardControllerGetDecisions,
  boardControllerGetSessions,
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
  const [seriesResult, sessionsResult, decisionsResult, configResult] = await Promise.allSettled([
    loadBoardSessionSeries(),
    boardControllerGetSessions(),
    boardControllerGetDecisions(),
    boardControllerGetConfig()
  ])
  const configuredMemberCount =
    configResult.status === 'fulfilled' ? Math.max(3, Math.trunc(configResult.value.data.quorumMin)) : 3
  const suggestedMemberCount = configuredMemberCount % 2 === 0 ? configuredMemberCount + 1 : configuredMemberCount
  const [sessions, decisions] = await Promise.all([
    sessionsResult.status === 'fulfilled' ? hydrateBoardSessions(sessionsResult.value.data) : [],
    decisionsResult.status === 'fulfilled' ? hydrateBoardDecisions(decisionsResult.value.data) : []
  ])

  return {
    series: seriesResult.status === 'fulfilled' ? seriesResult.value : [],
    sessions,
    decisions,
    suggestedMemberCount,
    hasError: [seriesResult, sessionsResult, decisionsResult, configResult].some(
      (result) => result.status === 'rejected'
    )
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    let message = ''
    if (intent === 'createSession') {
      const endTime = optionalDate(form, 'endTime')
      const rosterMode = String(form.get('rosterMode') ?? 'automatic')
      const seriesId = String(form.get('rosterSourceSeriesId') ?? '').trim()
      const manualMemberIds = [
        ...new Set(
          String(form.get('manualRosterIds') ?? '')
            .split(/[\s,;]+/)
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ]
      if (rosterMode === 'automatic' && !seriesId) {
        throw new Error('Hãy chọn bộ truyện dùng làm ngữ cảnh gợi ý thành viên.')
      }
      if (
        rosterMode === 'manual' &&
        (manualMemberIds.length < 3 ||
          manualMemberIds.length % 2 === 0 ||
          manualMemberIds.some((id) => !/^[0-9a-fA-F]{24}$/.test(id)))
      ) {
        throw new Error('Roster thủ công phải có ít nhất 3 mã thành viên hợp lệ và tổng số phải là số lẻ.')
      }
      const response = await boardControllerCreateSession({
        title: required(form, 'title'),
        description: String(form.get('description') ?? '') || null,
        startTime: new Date(required(form, 'startTime')).toISOString(),
        ...(endTime ? { endTime } : {}),
        ...(rosterMode === 'manual'
          ? { allowedEditorIds: manualMemberIds }
          : { seriesId, rosterSize: Number(form.get('rosterSize') ?? 3) })
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
