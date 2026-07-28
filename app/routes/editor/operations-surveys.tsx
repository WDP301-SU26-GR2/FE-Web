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
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { date, optionalNumber, required } from './operations-route-utils'
import type { Route } from './+types/operations-surveys'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSurveyId = (searchParams.get('surveyId') || searchParams.get('referenceId') || '').trim()
  try {
    const [seriesResponse, surveys] = await Promise.all([loadPublicSeriesCatalog(), surveyControllerGetSurveyPeriods()])
    const series = seriesResponse
    const uniqueSurveys = [
      ...new Map(
        surveys.data.map((survey) => [
          [
            survey.issueNumber ?? '',
            survey.reflectedIssueNumber ?? '',
            survey.status,
            survey.startDate,
            survey.endDate
          ].join('|'),
          survey
        ])
      ).values()
    ]
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
    let message = ''
    if (intent === 'createSurvey') {
      const startDate = date(form, 'startDate')
      const endDate = date(form, 'endDate')
      const eligibleSeriesIds = form.getAll('eligibleSeriesId').map(String).filter(Boolean)
      if (new Date(endDate) <= new Date(startDate)) return { ok: false, intent, errorKey: 'invalidState' }
      if (eligibleSeriesIds.length === 0) return { ok: false, intent, errorKey: 'invalidState' }
      const response = await surveyControllerCreateSurveyPeriod({
        issueNumber: Number(required(form, 'issueNumber')),
        reflectedIssueNumber: optionalNumber(form, 'reflectedIssueNumber'),
        magazine: required(form, 'magazine'),
        publicationType: required(form, 'publicationType') as 'WEEKLY' | 'MONTHLY' | 'IRREGULAR',
        eligibleSeriesIds,
        startDate,
        endDate,
        status: 'DRAFT'
      })
      message = extractApiSuccessMessage(response, 'Đã tạo kỳ bình chọn mới.')
    } else if (intent === 'surveyStatus') {
      const status = required(form, 'status')
      if (status !== 'OPEN' && status !== 'CLOSED') return { ok: false, intent, errorKey: 'invalidState' }
      const response = await surveyControllerUpdateSurveyPeriodStatus({ id: required(form, 'surveyId') }, { status })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'surveyNotFound' }
      message = extractApiSuccessMessage(response, status === 'OPEN' ? 'Đã mở kỳ bình chọn.' : 'Đã đóng kỳ bình chọn.')
    } else if (intent === 'finalizeRanking') {
      const response = await surveyControllerFinalizeRanking({ id: required(form, 'surveyId') })
      if (response.status !== 200) return { ok: false, intent, errorKey: 'surveyFinalizeNotAllowed' }
      message = extractApiSuccessMessage(response, 'Đã chốt kết quả xếp hạng của kỳ bình chọn.')
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
      message = extractApiSuccessMessage(response, 'Đã nhập dữ liệu phiếu bình chọn ngoại tuyến.')
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent, message }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: 'actionFailed',
      message: extractApiErrorMessage(error, 'Không thể cập nhật kỳ bình chọn.')
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSurveysPage {...loaderData} />
}
