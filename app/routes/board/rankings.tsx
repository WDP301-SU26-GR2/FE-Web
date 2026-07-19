import { surveyControllerGetBoardRanking, surveyControllerGetSurveyPeriods } from '~/api/operations/survey/survey'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { BoardRankingsPage } from '~/features/board'
import type { Route } from './+types/rankings'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const [periodsResponse, seriesResponse] = await Promise.all([
      surveyControllerGetSurveyPeriods(),
      seriesControllerListSeries({ limit: 100, offset: 0 })
    ])
    const periods = periodsResponse.status === 200 ? periodsResponse.data : []
    const requestedPeriodId = new URL(request.url).searchParams.get('surveyPeriodId') ?? ''
    const surveyPeriodId = requestedPeriodId || periods.find((period) => period.status === 'REFLECTED')?.id || periods[0]?.id || ''
    const response = surveyPeriodId ? await surveyControllerGetBoardRanking({ surveyPeriodId }) : null
    return {
      rankings: response?.status === 200 ? response.data.items : [],
      periods,
      seriesTitles: Object.fromEntries(seriesResponse.data.items.map((series) => [series.id, series.title])),
      surveyPeriodId,
      hasError: false
    }
  } catch {
    return { rankings: [], periods: [], seriesTitles: {}, surveyPeriodId: '', hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardRankingsPage {...loaderData} />
}
