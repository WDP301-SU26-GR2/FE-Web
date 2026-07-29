import {
  surveyControllerCreateSurveyPeriod,
  surveyControllerFinalizeRanking,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriods,
  surveyControllerImportSurveyData,
  surveyControllerUpdateSurveyPeriodStatus
} from '~/api/operations/survey/survey'
import { EditorSurveysPage, type EditorActionResult } from '~/features/editor'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { clientLoader as surveyWorkspaceLoader, loadPublicSeriesCatalog } from '../editor/operations-surveys'
import { date, required } from '../editor/operations-route-utils'
import type { Route } from './+types/operations-surveys'

const PUBLICATION_TYPES = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

export const clientLoader = surveyWorkspaceLoader

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

      const [serializedSeries, periods] = await Promise.all([
        loadPublicSeriesCatalog('SERIALIZED'),
        surveyControllerGetSurveyPeriods()
      ])
      const candidates = new Map(
        serializedSeries
          .filter((series) => series.magazine === magazine && series.publicationType === publicationType)
          .map((series) => [series.id, series])
      )
      if (eligibleSeriesIds.some((seriesId) => !candidates.has(seriesId)))
        return invalid(intent, 'surveySeriesScopeMismatch')
      if (
        periods.data.some(
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
