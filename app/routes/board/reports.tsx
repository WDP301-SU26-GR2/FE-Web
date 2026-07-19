import { boardControllerGetReports } from '~/api/operations/board/board'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { BoardReportsPage } from '~/features/board'
import type { Route } from './+types/reports'

export async function clientLoader() {
  try {
    const [response, seriesResponse] = await Promise.all([
      boardControllerGetReports(),
      seriesControllerListSeries({ limit: 100, offset: 0 })
    ])
    return {
      reports: response.data,
      seriesTitles: Object.fromEntries(seriesResponse.data.items.map((item) => [item.id, item.title])),
      hasError: false
    }
  } catch {
    return { reports: [], seriesTitles: {}, hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardReportsPage {...loaderData} enableFilters />
}
