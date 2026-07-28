import { paymentControllerGetPaymentsBySeries } from '~/api/operations/payments/payments'
import { revisionControllerList } from '~/api/operations/revision/revision'
import { surveyControllerGetBoardRanking, surveyControllerGetSeriesTrend } from '~/api/operations/survey/survey'
import { usersControllerListAssistants } from '~/api/operations/users/users'
import { EditorInsightsPage } from '~/features/editor'
import { loadOperationalSeries } from './operations-route-utils'
import type { LoaderFunctionArgs } from 'react-router'

export async function clientLoader({ request }: LoaderFunctionArgs) {
  const searchParams = new URL(request.url).searchParams
  const seriesId = searchParams.get('seriesId') ?? ''
  const surveyPeriodId = searchParams.get('surveyPeriodId') ?? ''
  try {
    const [series, assistants, revisions, trend, boardRanking, payments] = await Promise.all([
      loadOperationalSeries(),
      usersControllerListAssistants({ limit: 100, offset: 0 }),
      revisionControllerList({ limit: 100, offset: 0 }),
      seriesId ? surveyControllerGetSeriesTrend({ seriesId, periods: 12 }).catch(() => null) : null,
      surveyPeriodId ? surveyControllerGetBoardRanking({ surveyPeriodId }).catch(() => null) : null,
      seriesId ? paymentControllerGetPaymentsBySeries({ id: seriesId }).catch(() => null) : null
    ])
    return {
      series,
      seriesId,
      surveyPeriodId,
      assistants: assistants.data.items,
      revisions: revisions.status === 200 ? revisions.data.items : [],
      trend: trend?.status === 200 ? trend.data.items : [],
      boardRanking: boardRanking?.status === 200 ? boardRanking.data.items : [],
      payments: payments?.status === 200 ? payments.data.data : [],
      hasError: false
    }
  } catch {
    return {
      series: [],
      seriesId,
      surveyPeriodId,
      assistants: [],
      revisions: [],
      trend: [],
      boardRanking: [],
      payments: [],
      hasError: true
    }
  }
}

export default function RouteComponent({ loaderData }: { loaderData: Awaited<ReturnType<typeof clientLoader>> }) {
  return <EditorInsightsPage {...loaderData} />
}
