import {
  boardControllerCreateSeriesReport,
  boardControllerGetDecisions,
  boardControllerGetReports
} from '~/api/operations/board/board'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorBoardReportsPage, type EditorActionResult } from '~/features/editor'
import { required } from './board-route-utils'
import type { Route } from './+types/board-reports'

export async function clientLoader() {
  try {
    const [series, decisions, reports] = await Promise.all([
      seriesControllerListSeries({ status: 'PITCHED', limit: 100, offset: 0 }),
      boardControllerGetDecisions(),
      boardControllerGetReports()
    ])
    return { series: series.data.items, decisions: decisions.data, reports: reports.data, hasError: false }
  } catch {
    return { series: [], decisions: [], reports: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'createReport') return { ok: false, intent, errorKey: 'invalidAction' }
    await boardControllerCreateSeriesReport({
      seriesId: required(form, 'seriesId'),
      boardDecisionId: required(form, 'decisionId'),
      reportType: required(form, 'reportType'),
      content: required(form, 'content'),
      attachments: String(form.get('attachments') ?? '')
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardReportsPage {...loaderData} />
}
