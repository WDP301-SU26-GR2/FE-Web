import { useLoaderData, type ClientActionFunctionArgs, type ClientLoaderFunctionArgs } from 'react-router'
import { chapterControllerListPages, chapterControllerProgress } from '~/api/operations/chapters/chapters'
import { deadlineControllerGetOne } from '~/api/operations/deadline-requests/deadline-requests'
import {
  chapterNameControllerGetOne,
  chapterNameControllerList,
  nameControllerGetOne,
  nameControllerList
} from '~/api/operations/names/names'
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
  transferControllerGetTransferRequestById
} from '~/api/operations/transfer/transfer'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { AdminReferencePage, type AdminReferenceActionResult } from '~/features/admin'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

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
    settle(seriesControllerListSeries({ limit: 100, offset: 0 })),
    settle(surveyControllerGetSurveyPeriods()),
    settle(usersControllerListAssistants({ limit: 100, offset: 0 })),
    settle(usersControllerListMangakas({ limit: 100, offset: 0 }))
  ])

  const [seriesDetail, defense, seriesNames, seriesName, trend] = seriesId
    ? await Promise.all([
        settle(seriesControllerGetSeries({ id: seriesId })),
        settle(tankobonControllerDashboard({ id: seriesId })),
        settle(nameControllerList({ id: seriesId })),
        seriesNameId ? settle(nameControllerGetOne({ id: seriesId, nameId: seriesNameId })) : null,
        settle(surveyControllerGetSeriesTrend({ seriesId, periods: 12 }))
      ])
    : [null, null, null, null, null]

  const [chapterNames, chapterName, pages, progress, stages] = chapterId
    ? await Promise.all([
        settle(chapterNameControllerList({ id: chapterId })),
        chapterNameId ? settle(chapterNameControllerGetOne({ id: chapterId, nameId: chapterNameId })) : null,
        settle(chapterControllerListPages({ id: chapterId })),
        settle(chapterControllerProgress({ id: chapterId })),
        settle(productionStageControllerList({ id: chapterId }))
      ])
    : [null, null, null, null, null]

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
  const transferSignatures = transferContractId
    ? await settle(transferControllerGetSignatures({ id: transferContractId }))
    : null

  return {
    series: seriesResponse?.items ?? [],
    periods: periods ?? [],
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
      transferContractId
    },
    directories: { assistants, mangakas },
    seriesData: { detail: seriesDetail, defense, names: seriesNames, selectedName: seriesName, rankingTrend: trend },
    chapterData: { names: chapterNames, selectedName: chapterName, pages, progress, stages },
    rankingData: { boardRanking },
    workflowData: { reprint, reprintChapters, reprintChapter, deadline, transferRequest, transferSignatures }
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs): Promise<AdminReferenceActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent !== 'downloadTaskFile') return { ok: false, intent }
    const response = await taskControllerGetTaskFileDownloadUrl(
      { id: required(form, 'taskId') },
      { key: required(form, 'key') }
    )
    return {
      ok: true,
      intent,
      downloadUrl: response.data.downloadUrl,
      expiresAt: response.data.expiresAt
    }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể tạo liên kết tải file tác vụ.')
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
