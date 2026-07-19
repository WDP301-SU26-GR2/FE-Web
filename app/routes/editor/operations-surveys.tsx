import {
  surveyControllerCreateSurveyPeriod,
  surveyControllerFinalizeRanking,
  surveyControllerGetSurveyPeriods,
  surveyControllerImportSurveyData,
  surveyControllerUpdateSurveyPeriodStatus
} from '~/api/operations/survey/survey'
import { EditorSurveysPage, type EditorActionResult } from '~/features/editor'
import { date, loadOperationalSeries, optionalNumber, required } from './operations-route-utils'
import type { Route } from './+types/operations-surveys'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusSurveyId = new URL(request.url).searchParams.get('surveyId')?.trim() ?? ''
  try {
    const [series, surveys] = await Promise.all([loadOperationalSeries(), surveyControllerGetSurveyPeriods()])
    return { series, surveys: surveys.data, focusSurveyId, hasError: false }
  } catch {
    return { series: [], surveys: [], focusSurveyId, hasError: true }
  }
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
        issueNumber: Number(required(form, 'issueNumber')),
        reflectedIssueNumber: optionalNumber(form, 'reflectedIssueNumber'),
        startDate,
        endDate,
        status: 'DRAFT'
      })
    } else if (intent === 'surveyStatus') {
      const status = required(form, 'status')
      if (status !== 'OPEN' && status !== 'CLOSED') return { ok: false, intent, errorKey: 'invalidState' }
      await surveyControllerUpdateSurveyPeriodStatus(
        { id: required(form, 'surveyId') },
        { status }
      )
    } else if (intent === 'finalizeRanking') await surveyControllerFinalizeRanking({ id: required(form, 'surveyId') })
    else if (intent === 'importVotes') {
      const ids = form.getAll('voteSeriesId').map(String)
      const counts = form.getAll('voteCount').map(Number)
      await surveyControllerImportSurveyData({
        surveyPeriodId: required(form, 'surveyId'),
        entries: ids
          .map((seriesId, index) => ({ seriesId, voteCount: counts[index] }))
          .filter((item) => item.seriesId && Number.isFinite(item.voteCount))
      })
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSurveysPage {...loaderData} />
}
