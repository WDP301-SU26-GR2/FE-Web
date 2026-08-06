import {
  surveyControllerCreateSurveyPeriod,
  surveyControllerFinalizeRanking,
  surveyControllerGetEligibleSeries,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriods,
  surveyControllerGetSurveyPeriodSurveyData,
  surveyControllerGetSurveyPeriodVotes,
  surveyControllerImportSurveyData,
  surveyControllerGetRankingRecords,
  surveyControllerUpdateSurveyPeriodStatus
} from '~/api/operations/survey/survey'
import { EditorSurveysPage, type EditorActionResult } from '~/features/editor'
import { magazineControllerGetMagazines } from '~/api/operations/magazines/magazines'
import type { SurveyControllerGetEligibleSeriesPublicationType } from '~/api/model/survey'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { loadPublicSeriesCatalog } from '../editor/operations-surveys'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import { date, required } from '../editor/operations-route-utils'
import type { Route } from './+types/operations-surveys'

const PUBLICATION_TYPES = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const focusSurveyId = (searchParams.get('surveyId') || searchParams.get('referenceId') || '').trim()
  try {
    const [series, surveys, eligibleSeriesCandidates] = await Promise.all([
      loadPublicSeriesCatalog(),
      loadSurveyPeriods(),
      loadEligibleSeriesCandidates()
    ])
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

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')

  try {
    let message = ''
    if (intent === 'createSurvey') {
      const issueNumber = positiveInteger(form, 'issueNumber')
      const magazine = required(form, 'magazine').trim()
      const publicationType = publicationTypeValue(form)
      const startDate = date(form, 'startDate')
      const endDate = date(form, 'endDate')
      const eligibleSeriesIds = [...new Set(form.getAll('eligibleSeriesId').map(String).filter(Boolean))]

      if (new Date(endDate) <= new Date(startDate)) return invalid(intent, 'surveyInvalidDates')
      if (eligibleSeriesIds.length === 0) return invalid(intent, 'surveySeriesRequired')

      const [eligibleSeries, periods] = await Promise.all([
        surveyControllerGetEligibleSeries({ magazine, publicationType }),
        surveyControllerGetSurveyPeriods()
      ])
      const candidates = new Map(eligibleSeries.data.items.map((series) => [series.id, series]))
      if (eligibleSeriesIds.some((seriesId) => !candidates.has(seriesId)))
        return invalid(intent, 'surveySeriesScopeMismatch')
      if (
        periods.data.items.some(
          (period) =>
            period.magazine === magazine &&
            period.publicationType === publicationType &&
            period.issueNumber === issueNumber
        )
      )
        return invalid(intent, 'surveyDuplicateScope')

      const response = await surveyControllerCreateSurveyPeriod({
        issueNumber,
        reflectedIssueNumber: issueNumber,
        magazine,
        publicationType,
        eligibleSeriesIds,
        startDate,
        endDate,
        status: 'DRAFT'
      })
      message = extractApiSuccessMessage(response, 'Đã tạo kỳ bình chọn mới.')
    } else if (intent === 'surveyStatus') {
      const surveyId = required(form, 'surveyId')
      const status = required(form, 'status')
      if (status !== 'OPEN' && status !== 'CLOSED') return invalid(intent, 'invalidState')
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      const validTransition =
        (period.data.status === 'DRAFT' && status === 'OPEN') || (period.data.status === 'OPEN' && status === 'CLOSED')
      if (!validTransition) return invalid(intent, 'invalidState')
      const response = await surveyControllerUpdateSurveyPeriodStatus({ id: surveyId }, { status })
      message = extractApiSuccessMessage(response, status === 'OPEN' ? 'Đã mở kỳ bình chọn.' : 'Đã đóng kỳ bình chọn.')
    } else if (intent === 'finalizeRanking') {
      const surveyId = required(form, 'surveyId')
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      if (period.data.status !== 'CLOSED') return invalid(intent, 'surveyFinalizeNotAllowed')
      const response = await surveyControllerFinalizeRanking({ id: surveyId })
      message = extractApiSuccessMessage(response, 'Đã chốt kết quả xếp hạng của kỳ bình chọn.')
    } else if (intent === 'importVotes') {
      const surveyId = required(form, 'surveyId')
      const period = await surveyControllerGetSurveyPeriodById({ id: surveyId })
      if (period.data.status !== 'CLOSED') return invalid(intent, 'surveyImportNotAllowed')

      const eligibleIds = new Set(period.data.eligibleSeriesIds)
      const ids = form.getAll('voteSeriesId').map(String)
      const counts = form.getAll('voteCount').map(Number)
      const totals = new Map<string, number>()
      for (const [index, seriesId] of ids.entries()) {
        const voteCount = counts[index]
        if (!seriesId || !eligibleIds.has(seriesId) || !Number.isInteger(voteCount) || voteCount < 0)
          return invalid(intent, 'surveyImportScopeMismatch')
        totals.set(seriesId, (totals.get(seriesId) ?? 0) + voteCount)
      }
      if (totals.size === 0) return invalid(intent, 'surveyImportNotAllowed')

      const response = await surveyControllerImportSurveyData({
        surveyPeriodId: surveyId,
        entries: [...totals].map(([seriesId, voteCount]) => ({ seriesId, voteCount }))
      })
      message = extractApiSuccessMessage(response, 'Đã nhập dữ liệu phiếu bình chọn ngoại tuyến.')
    } else return invalid(intent, 'invalidAction')

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

function publicationTypeValue(form: FormData) {
  const value = required(form, 'publicationType')
  if (!PUBLICATION_TYPES.includes(value as (typeof PUBLICATION_TYPES)[number]))
    throw new Error('Invalid publication type')
  return value as (typeof PUBLICATION_TYPES)[number]
}

function positiveInteger(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${key}`)
  return value
}

function invalid(intent: string, errorKey: string): EditorActionResult {
  return { ok: false, intent, errorKey }
}

async function loadSurveyPeriods() {
  return loadAllOffsetItems((pagination) =>
    surveyControllerGetSurveyPeriods(pagination).then((response) => response.data)
  )
}

async function loadEligibleSeriesCandidates() {
  const magazinesResponse = await magazineControllerGetMagazines()
  const scopes = magazinesResponse.data.items.flatMap((magazine) =>
    magazine.publicationTypes.map((publicationType) => ({
      magazine: magazine.name,
      publicationType: publicationType as SurveyControllerGetEligibleSeriesPublicationType
    }))
  )
  const responses = await Promise.all(scopes.map((scope) => surveyControllerGetEligibleSeries(scope).catch(() => null)))
  const items = responses.flatMap((response) => response?.data.items ?? [])
  return [...new Map(items.map((item) => [item.id, item])).values()]
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorSurveysPage
      {...loaderData}
      adminMode
      backPath='/dashboard/admin/operations'
      configPath='/dashboard/admin/settings'
    />
  )
}
