import {
  surveyControllerCreateSurveyPeriod,
  surveyControllerFinalizeRanking,
  surveyControllerGetRankingRecords,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriodSurveyData,
  surveyControllerGetSurveyPeriodVotes,
  surveyControllerGetSurveyPeriods,
  surveyControllerImportSurveyData,
  surveyControllerUpdateSurveyPeriodStatus
} from '~/api/operations/survey/survey'
import { publicControllerListSeries } from '~/api/operations/public/public'
import { EditorSurveysPage, type EditorActionResult } from '~/features/editor'
import { date, optionalNumber, required } from './operations-route-utils'
import type { Route } from './+types/operations-surveys'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSurveyId = (searchParams.get('surveyId') || searchParams.get('referenceId') || '').trim()
  try {
    const [seriesResponse, surveys] = await Promise.all([loadPublicSeriesCatalog(), surveyControllerGetSurveyPeriods()])
    const series = seriesResponse
    const orderedSurveys = [...surveys.data].sort(
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

async function loadPublicSeriesCatalog() {
  const pageSize = 50
  const firstPage = await publicControllerListSeries({ limit: pageSize, offset: 0 })
  if (firstPage.status !== 200) return []

  const offsets = Array.from(
    { length: Math.max(0, Math.ceil(firstPage.data.total / pageSize) - 1) },
    (_, index) => (index + 1) * pageSize
  )
  const remainingPages = await Promise.all(
    offsets.map((offset) => publicControllerListSeries({ limit: pageSize, offset }))
  )

  return [
    ...firstPage.data.items,
    ...remainingPages.flatMap((response) => (response.status === 200 ? response.data.items : []))
  ]
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createSurvey') {
      const startDate = date(form, 'startDate')
      const endDate = date(form, 'endDate')
      if (new Date(endDate) <= new Date(startDate)) return { ok: false, intent, errorKey: 'invalidState' }
      await surveyControllerCreateSurveyPeriod({
        issueNumber: optionalNumber(form, 'issueNumber'),
        reflectedIssueNumber: optionalNumber(form, 'reflectedIssueNumber'),
        startDate,
        endDate,
        status: 'DRAFT'
      })
    } else if (intent === 'surveyStatus') {
      const status = required(form, 'status')
      if (status !== 'OPEN' && status !== 'CLOSED') return { ok: false, intent, errorKey: 'invalidState' }
      const response = await surveyControllerUpdateSurveyPeriodStatus({ id: required(form, 'surveyId') }, { status })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'surveyNotFound' }
    } else if (intent === 'finalizeRanking') {
      const response = await surveyControllerFinalizeRanking({ id: required(form, 'surveyId') })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'surveyFinalizeNotAllowed' }
    } else if (intent === 'importVotes') {
      const ids = form.getAll('voteSeriesId').map(String)
      const counts = form.getAll('voteCount').map(Number)
      const response = await surveyControllerImportSurveyData({
        surveyPeriodId: required(form, 'surveyId'),
        entries: ids
          .map((seriesId, index) => ({ seriesId, voteCount: counts[index] }))
          .filter((item) => item.seriesId && Number.isFinite(item.voteCount))
      })
      if (response.status !== 201) return { ok: false, intent, errorKey: 'surveyImportNotAllowed' }
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSurveysPage {...loaderData} />
}
