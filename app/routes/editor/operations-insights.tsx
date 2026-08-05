import { paymentControllerGetPaymentsBySeries } from '~/api/operations/payments/payments'
import { revisionControllerList } from '~/api/operations/revision/revision'
import {
  surveyControllerGetBoardRanking,
  surveyControllerGetInternalRankingAggregate,
  surveyControllerGetSeriesTrend,
  surveyControllerGetSurveyPeriods
} from '~/api/operations/survey/survey'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { EditorInsightsPage } from '~/features/editor'
import { loadOperationalSeries } from './operations-route-utils'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import type { LoaderFunctionArgs } from 'react-router'

export async function clientLoader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams
  const seriesId = searchParams.get('seriesId') ?? ''
  const surveyPeriodId = searchParams.get('surveyPeriodId') ?? ''
  const revisionId = searchParams.get('revisionId') ?? ''
  const aggregateLevel: 'MONTH' | 'YEAR' = searchParams.get('aggregateLevel') === 'YEAR' ? 'YEAR' : 'MONTH'
  const now = new Date()
  const requestedYear = Number(searchParams.get('aggregateYear') ?? now.getFullYear())
  const aggregateYear = Number.isInteger(requestedYear) && requestedYear >= 1970 ? requestedYear : now.getFullYear()
  const requestedMonth = Number(searchParams.get('aggregateMonth') ?? now.getMonth() + 1)
  const aggregateMonth =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
      ? requestedMonth
      : now.getMonth() + 1
  try {
    const [series, periods, assistants, mangakas, revisions, trend, boardRanking, payments] = await Promise.all([
      loadOperationalSeries(),
      loadAllOffsetItems((pagination) =>
        surveyControllerGetSurveyPeriods(pagination).then((response) => response.data)
      ),
      loadAllOffsetItems((pagination) => usersControllerListAssistants(pagination).then((response) => response.data)),
      loadAllOffsetItems((pagination) => usersControllerListMangakas(pagination).then((response) => response.data)),
      revisionControllerList({ limit: 100, offset: 0 }),
      seriesId ? surveyControllerGetSeriesTrend({ seriesId, periods: 12 }).catch(() => null) : null,
      surveyPeriodId ? surveyControllerGetBoardRanking({ surveyPeriodId }).catch(() => null) : null,
      seriesId ? paymentControllerGetPaymentsBySeries({ id: seriesId }).catch(() => null) : null
    ])
    const selectedPeriod = periods.find((period) => period.id === surveyPeriodId)
    const aggregate =
      selectedPeriod?.magazine && selectedPeriod.publicationType
        ? await surveyControllerGetInternalRankingAggregate({
            magazine: selectedPeriod.magazine,
            publicationType: selectedPeriod.publicationType,
            level: aggregateLevel,
            year: aggregateYear,
            ...(aggregateLevel === 'MONTH' ? { month: aggregateMonth } : {})
          }).catch(() => null)
        : null
    return {
      series,
      periods,
      seriesId,
      surveyPeriodId,
      revisionId,
      assistants,
      mangakas,
      revisions: revisions.status === 200 ? revisions.data.items : [],
      trend: trend?.status === 200 ? trend.data.items : [],
      boardRanking: boardRanking?.status === 200 ? boardRanking.data.items : [],
      payments: payments?.status === 200 ? payments.data.data : [],
      aggregate: aggregate?.status === 200 ? aggregate.data : null,
      aggregateLevel,
      aggregateYear,
      aggregateMonth,
      hasError: false
    }
  } catch {
    return {
      series: [],
      periods: [],
      seriesId,
      surveyPeriodId,
      revisionId,
      assistants: [],
      mangakas: [],
      revisions: [],
      trend: [],
      boardRanking: [],
      payments: [],
      aggregate: null,
      aggregateLevel,
      aggregateYear,
      aggregateMonth,
      hasError: true
    }
  }
}

export default function RouteComponent({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  return <EditorInsightsPage {...loaderData} />
}
