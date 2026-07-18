import { surveyControllerGetBoardRanking } from '~/api/operations/survey/survey'
import { BoardRankingsPage } from '~/features/board'
import type { Route } from './+types/rankings'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const surveyPeriodId = new URL(request.url).searchParams.get('surveyPeriodId') ?? ''
  if (!surveyPeriodId) return { rankings: [], surveyPeriodId, hasError: false }
  try {
    const response = await surveyControllerGetBoardRanking({ surveyPeriodId })
    return { rankings: response.status === 200 ? response.data.items : [], surveyPeriodId, hasError: false }
  } catch {
    return { rankings: [], surveyPeriodId, hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardRankingsPage {...loaderData} />
}
