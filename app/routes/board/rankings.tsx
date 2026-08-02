import {
  surveyControllerGetBoardRanking,
  surveyControllerGetInternalRankingAggregate,
  surveyControllerGetSurveyPeriods
} from '~/api/operations/survey/survey'
import {
  SurveyControllerGetInternalRankingAggregateLevel,
  SurveyControllerGetInternalRankingAggregatePublicationType
} from '~/api/model/survey'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { BoardRankingsPage } from '~/features/board'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import type { Route } from './+types/rankings'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  try {
    const [periodsResponse, seriesResponse] = await Promise.all([
      surveyControllerGetSurveyPeriods(),
      seriesControllerListSeries({ limit: 100, offset: 0 })
    ])
    const periods =
      periodsResponse.status === 200
        ? periodsResponse.data.items
            .filter((period) => period.status === 'REFLECTED')
            .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime())
        : []
    const search = new URL(request.url).searchParams
    const requestedPeriodId = search.get('surveyPeriodId') ?? ''
    const surveyPeriodId = periods.some((period) => period.id === requestedPeriodId)
      ? requestedPeriodId
      : (periods[0]?.id ?? '')
    const response = surveyPeriodId ? await surveyControllerGetBoardRanking({ surveyPeriodId }) : null
    const aggregateSource = periods.find((period) => period.magazine && period.publicationType)
    const sourceDate = new Date(aggregateSource?.startDate ?? Date.now())
    const requestedPublicationType = search.get('publicationType') ?? ''
    const requestedLevel = search.get('level') ?? ''
    const aggregateQuery = {
      magazine: search.get('magazine')?.trim() || aggregateSource?.magazine || '',
      publicationType: isEnumValue(SurveyControllerGetInternalRankingAggregatePublicationType, requestedPublicationType)
        ? requestedPublicationType
        : aggregateSource?.publicationType || SurveyControllerGetInternalRankingAggregatePublicationType.WEEKLY,
      level: isEnumValue(SurveyControllerGetInternalRankingAggregateLevel, requestedLevel)
        ? requestedLevel
        : SurveyControllerGetInternalRankingAggregateLevel.MONTH,
      year: boundedInteger(search.get('year'), 1970, 9999, sourceDate.getFullYear()),
      month: boundedInteger(search.get('month'), 1, 12, sourceDate.getMonth() + 1)
    }
    const aggregateResponse = aggregateQuery.magazine
      ? await surveyControllerGetInternalRankingAggregate({
          ...aggregateQuery,
          month:
            aggregateQuery.level === SurveyControllerGetInternalRankingAggregateLevel.MONTH
              ? aggregateQuery.month
              : undefined
        }).catch(() => null)
      : null
    return {
      rankings: response?.status === 200 ? response.data.items : [],
      periods,
      seriesTitles: Object.fromEntries(seriesResponse.data.items.map((series) => [series.id, series.title])),
      surveyPeriodId,
      aggregate: aggregateResponse?.data ?? null,
      aggregateQuery,
      aggregateOptions: Array.from(
        new Map(
          periods.flatMap((period) =>
            period.magazine && period.publicationType
              ? [
                  [
                    `${period.magazine}:${period.publicationType}`,
                    { magazine: period.magazine, publicationType: period.publicationType }
                  ]
                ]
              : []
          )
        ).values()
      ),
      hasError: false
    }
  } catch {
    return {
      rankings: [],
      periods: [],
      seriesTitles: {},
      surveyPeriodId: '',
      aggregate: null,
      aggregateQuery: {
        magazine: '',
        publicationType: SurveyControllerGetInternalRankingAggregatePublicationType.WEEKLY,
        level: SurveyControllerGetInternalRankingAggregateLevel.MONTH,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1
      },
      aggregateOptions: [],
      hasError: true
    }
  }
}

function boundedInteger(value: string | null, min: number, max: number, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardRankingsPage {...loaderData} />
}
