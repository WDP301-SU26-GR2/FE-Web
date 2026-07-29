import { boardControllerGetReportById, boardControllerGetReports } from '~/api/operations/board/board'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { BoardReportsPage } from '~/features/board'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import type { Route } from './+types/reports'

export async function clientLoader() {
  try {
    const [response, seriesItems] = await Promise.all([
      boardControllerGetReports(),
      loadAllOffsetItems((pagination) =>
        seriesControllerListSeries(pagination).then((seriesResponse) => seriesResponse.data)
      )
    ])
    const reports = await Promise.all(
      response.data.map((report) =>
        boardControllerGetReportById({ id: report.id })
          .then((detail) => detail.data)
          .catch(() => null)
      )
    )
    return {
      reports: reports.filter((report) => report !== null),
      seriesTitles: Object.fromEntries(seriesItems.map((item) => [item.id, item.title])),
      hasError: false
    }
  } catch {
    return { reports: [], seriesTitles: {}, hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardReportsPage {...loaderData} enableFilters backPath='/dashboard/board' />
}
