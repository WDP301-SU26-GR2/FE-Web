import {
  surveyControllerGetRankingRecords,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriodSurveyData,
  surveyControllerGetSurveyPeriodVotes,
  surveyControllerGetSurveyPeriods
} from '~/api/operations/survey/survey'
import { publicControllerListSeries } from '~/api/operations/public/public'
import { EditorSurveysPage } from '~/features/editor'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import type { Route } from './+types/operations-surveys'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSurveyId = (searchParams.get('surveyId') || searchParams.get('referenceId') || '').trim()
  try {
    const [series, surveys] = await Promise.all([loadPublicSeriesCatalog(), loadSurveyPeriods()])
    const eligibleSeriesCandidates = series.filter((item) => item.status === 'SERIALIZED')
    const uniqueSurveys = [...new Map(surveys.map((survey) => [survey.id, survey])).values()]
    const orderedSurveys = uniqueSurveys.sort(
      (left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
    )
    const selectedSurveyId = orderedSurveys.some((survey) => survey.id === focusSurveyId)
      ? focusSurveyId
      : (orderedSurveys.find((survey) => survey.status === 'OPEN')?.id ??
        orderedSurveys.find((survey) => survey.status === 'CLOSED')?.id ??
        orderedSurveys[0]?.id ??
        '')
    if (!selectedSurveyId) {
      return {
        series,
        eligibleSeriesCandidates,
        surveys: orderedSurveys,
        selectedSurvey: null,
        votes: [],
        surveyData: [],
        rankings: [],
        selectedSurveyId: '',
        hasError: false
      }
    }
    const selected = orderedSurveys.find((survey) => survey.id === selectedSurveyId)
    const [detail, votes, surveyData, rankings] = await Promise.all([
      surveyControllerGetSurveyPeriodById({ id: selectedSurveyId }),
      surveyControllerGetSurveyPeriodVotes({ id: selectedSurveyId }).catch(() => null),
      surveyControllerGetSurveyPeriodSurveyData({ id: selectedSurveyId }).catch(() => null),
      selected?.status === 'REFLECTED'
        ? surveyControllerGetRankingRecords({ id: selectedSurveyId }).catch(() => null)
        : Promise.resolve(null)
    ])
    return {
      series,
      eligibleSeriesCandidates,
      surveys: orderedSurveys,
      selectedSurvey: detail.data,
      votes: votes?.data ?? [],
      surveyData: surveyData?.data ?? [],
      rankings: rankings?.data.items ?? [],
      selectedSurveyId,
      hasError: false
    }
  } catch {
    return {
      series: [],
      eligibleSeriesCandidates: [],
      surveys: [],
      selectedSurvey: null,
      votes: [],
      surveyData: [],
      rankings: [],
      selectedSurveyId: '',
      hasError: true
    }
  }
}

async function loadSurveyPeriods() {
  return loadAllOffsetItems((pagination) =>
    surveyControllerGetSurveyPeriods(pagination).then((response) => response.data)
  )
}

export async function loadPublicSeriesCatalog(status?: 'SERIALIZED') {
  const pageSize = 50
  const firstPage = await publicControllerListSeries({ status, limit: pageSize, offset: 0 })
  if (firstPage.status !== 200) return []

  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(firstPage.data.total / pageSize) - 1) },
    (_, index) => (index + 1) * pageSize
  )
  const remainingPages = await Promise.all(
    offsets.map((offset) => publicControllerListSeries({ status, limit: pageSize, offset }))
  )

  return [
    ...firstPage.data.items,
    ...remainingPages.flatMap((response) => (response.status === 200 ? response.data.items : []))
  ]
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSurveysPage {...loaderData} />
}
