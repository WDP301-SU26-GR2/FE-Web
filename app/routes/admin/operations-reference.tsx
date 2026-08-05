import { useLoaderData, type ClientActionFunctionArgs, type ClientLoaderFunctionArgs } from 'react-router'
import { chapterControllerListPages, chapterControllerProgress } from '~/api/operations/chapters/chapters'
import { deadlineControllerGetOne } from '~/api/operations/deadline-requests/deadline-requests'
import { productionStageControllerList } from '~/api/operations/production-stages/production-stages'
import {
  reprintRequestControllerFindById,
  reprintRequestControllerGetChapterById,
  reprintRequestControllerGetChapters
} from '~/api/operations/reprint-requests/reprint-requests'
import { seriesControllerGetSeries, seriesControllerListSeries } from '~/api/operations/series/series'
import {
  surveyControllerGetBoardRanking,
  surveyControllerGetSeriesTrend,
  surveyControllerGetSurveyPeriods
} from '~/api/operations/survey/survey'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { taskControllerGetTaskFileDownloadUrl } from '~/api/operations/task/task'
import {
  transferControllerGetSignatures,
  transferControllerGetTransferContractById,
  transferControllerGetTransferRequestById
} from '~/api/operations/transfer/transfer'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { AdminReferencePage } from '~/features/admin'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'

export type AdminReferenceActionResult = {
  ok: boolean
  intent: 'taskDownload'
  downloadUrl?: string
  expiresAt?: string
  message?: string
}

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const seriesId = clean(search.get('seriesId'))
  const seriesNameId = clean(search.get('seriesNameId'))
  const chapterId = clean(search.get('chapterId'))
  const chapterNameId = clean(search.get('chapterNameId'))
  const surveyPeriodId = clean(search.get('surveyPeriodId'))
  const reprintId = clean(search.get('reprintId'))
  const reprintChapterId = clean(search.get('reprintChapterId'))
  const deadlineId = clean(search.get('deadlineId'))
  const transferRequestId = clean(search.get('transferRequestId'))
  const transferContractId = clean(search.get('transferContractId'))

  const [seriesResponse, periods, assistants, mangakas] = await Promise.all([
    loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
    settle(surveyControllerGetSurveyPeriods()),
    loadAllOffsetItems((pagination) => usersControllerListAssistants(pagination).then((response) => response.data)),
    loadAllOffsetItems((pagination) => usersControllerListMangakas(pagination).then((response) => response.data))
  ])

  const [seriesDetail, defense, trend] = seriesId
    ? await Promise.all([
        settle(seriesControllerGetSeries({ id: seriesId })),
        settle(tankobonControllerDashboard({ id: seriesId })),
        settle(surveyControllerGetSeriesTrend({ seriesId, periods: 12 }))
      ])
    : [null, null, null]

  const [pages, progress, stages] = chapterId
    ? await Promise.all([
        settle(chapterControllerListPages({ id: chapterId })),
        settle(chapterControllerProgress({ id: chapterId })),
        settle(productionStageControllerList({ id: chapterId }))
      ])
    : [null, null, null]

  const boardRanking = surveyPeriodId ? await settle(surveyControllerGetBoardRanking({ surveyPeriodId })) : null
  const reprint = reprintId ? await settle(reprintRequestControllerFindById({ id: reprintId })) : null
  const reprintChapters = reprintId ? await settle(reprintRequestControllerGetChapters({ id: reprintId })) : null
  const reprintChapter =
    reprintId && reprintChapterId
      ? await settle(reprintRequestControllerGetChapterById({ id: reprintId, chapterId: reprintChapterId }))
      : null
  const deadline = deadlineId ? await settle(deadlineControllerGetOne({ id: deadlineId })) : null
  const transferRequest = transferRequestId
    ? await settle(transferControllerGetTransferRequestById({ id: transferRequestId }))
    : null
  const discoveredTransferContractId = transferContractId || transferRequest?.transferContractId || ''
  const transferContract = discoveredTransferContractId
    ? await settle(transferControllerGetTransferContractById({ id: discoveredTransferContractId }))
    : null
  const transferSignatures = discoveredTransferContractId
    ? await settle(transferControllerGetSignatures({ id: discoveredTransferContractId }))
    : null

  return {
    series: seriesResponse,
    periods: periods?.items ?? [],
    selected: {
      seriesId,
      seriesNameId,
      chapterId,
      chapterNameId,
      surveyPeriodId,
      reprintId,
      reprintChapterId,
      deadlineId,
      transferRequestId,
      transferContractId: discoveredTransferContractId
    },
    directories: { assistants, mangakas },
    seriesData: { detail: seriesDetail, defense, rankingTrend: trend },
    chapterData: { pages, progress, stages },
    rankingData: { boardRanking },
    workflowData: {
      reprint,
      reprintChapters,
      reprintChapter,
      deadline,
      transferRequest,
      transferContract,
      transferSignatures
    }
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs): Promise<AdminReferenceActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  if (intent !== 'taskDownload') {
    return { ok: false, intent: 'taskDownload', message: 'Unsupported action.' }
  }

  try {
    const taskId = required(form, 'taskId')
    const key = required(form, 'fileKey')
    const response = await taskControllerGetTaskFileDownloadUrl({ id: taskId }, { key })
    return {
      ok: true,
      intent: 'taskDownload',
      downloadUrl: response.data.downloadUrl,
      expiresAt: response.data.expiresAt
    }
  } catch (error) {
    return {
      ok: false,
      intent: 'taskDownload',
      message: extractApiErrorMessage(error, 'Unable to create the protected download link.')
    }
  }
}

async function settle<T>(promise: Promise<{ data: T } | { data: void }>): Promise<T | null> {
  try {
    const data = (await promise).data
    return data === undefined ? null : (data as T)
  } catch {
    return null
  }
}

function clean(value: string | null) {
  return value?.trim() ?? ''
}

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <AdminReferencePage {...loaderData} />
}
