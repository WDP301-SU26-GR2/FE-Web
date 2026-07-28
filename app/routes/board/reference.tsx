import { chapterControllerListPages, chapterControllerProgress } from '~/api/operations/chapters/chapters'
import {
  chapterNameControllerGetOne,
  chapterNameControllerList,
  nameControllerGetOne,
  nameControllerList
} from '~/api/operations/names/names'
import {
  publicationControllerGetOne,
  publicationControllerList
} from '~/api/operations/publication-versions/publication-versions'
import { productionStageControllerList } from '~/api/operations/production-stages/production-stages'
import { revisionControllerList } from '~/api/operations/revision/revision'
import { seriesControllerGetSeries, seriesControllerListSeries } from '~/api/operations/series/series'
import {
  surveyControllerGetBoardRanking,
  surveyControllerGetRankingRecords,
  surveyControllerGetSeriesTrend,
  surveyControllerGetSurveyPeriodById,
  surveyControllerGetSurveyPeriods,
  surveyControllerGetSurveyPeriodSurveyData,
  surveyControllerGetSurveyPeriodVotes
} from '~/api/operations/survey/survey'
import { tankobonControllerCreate, tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { taskControllerGetTaskFileDownloadUrl } from '~/api/operations/task/task'
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { BoardReferencePage, type BoardActionResult } from '~/features/board'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const seriesId = search.get('seriesId')?.trim() ?? ''
  const seriesNameId = search.get('seriesNameId')?.trim() ?? ''
  const publicationVersionId = search.get('publicationVersionId')?.trim() ?? ''
  const surveyPeriodId = search.get('surveyPeriodId')?.trim() ?? ''
  const chapterId = search.get('chapterId')?.trim() ?? ''
  const chapterNameId = search.get('chapterNameId')?.trim() ?? ''

  const [seriesResponse, periodsResponse, assistants, mangakas, revisions] = await Promise.all([
    settle(seriesControllerListSeries({ limit: 100, offset: 0 })),
    settle(surveyControllerGetSurveyPeriods()),
    settle(usersControllerListAssistants({ limit: 100, offset: 0 })),
    settle(usersControllerListMangakas({ limit: 100, offset: 0 })),
    settle(revisionControllerList({ limit: 100, offset: 0 }))
  ])

  const [seriesDetail, defense, seriesNames, seriesName, publicationVersions, publicationVersion, trend] = seriesId
    ? await Promise.all([
        settle(seriesControllerGetSeries({ id: seriesId })),
        settle(tankobonControllerDashboard({ id: seriesId })),
        settle(nameControllerList({ id: seriesId })),
        seriesNameId ? settle(nameControllerGetOne({ id: seriesId, nameId: seriesNameId })) : null,
        settle(publicationControllerList({ seriesId })),
        publicationVersionId ? settle(publicationControllerGetOne({ id: publicationVersionId })) : null,
        settle(surveyControllerGetSeriesTrend({ seriesId, periods: 12 }))
      ])
    : [null, null, null, null, null, null, null]

  const [surveyPeriod, rankings, surveyData, readerVotes, boardRanking] = surveyPeriodId
    ? await Promise.all([
        settle(surveyControllerGetSurveyPeriodById({ id: surveyPeriodId })),
        settle(surveyControllerGetRankingRecords({ id: surveyPeriodId })),
        settle(surveyControllerGetSurveyPeriodSurveyData({ id: surveyPeriodId })),
        settle(surveyControllerGetSurveyPeriodVotes({ id: surveyPeriodId })),
        settle(surveyControllerGetBoardRanking({ surveyPeriodId }))
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

  return {
    series: seriesResponse?.items ?? [],
    periods: periodsResponse ?? [],
    selected: { seriesId, seriesNameId, publicationVersionId, surveyPeriodId, chapterId, chapterNameId },
    directories: { assistants, mangakas },
    revisions,
    seriesData: {
      detail: seriesDetail,
      defense,
      names: seriesNames,
      selectedName: seriesName,
      publicationVersions,
      selectedPublicationVersion: publicationVersion,
      rankingTrend: trend
    },
    surveyData: { period: surveyPeriod, rankings, offlineData: surveyData, readerVotes, boardRanking },
    chapterData: { names: chapterNames, selectedName: chapterName, pages, progress, stages }
  }
}

export async function clientAction({ request }: ClientActionFunctionArgs): Promise<BoardActionResult> {
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')
  try {
    if (intent === 'recordTankobonSales') {
      await tankobonControllerCreate({
        seriesId: required(form, 'seriesId'),
        volumeNumber: positiveInteger(form, 'volumeNumber'),
        unitsSold: nonNegativeInteger(form, 'unitsSold'),
        period: required(form, 'period')
      })
      return { ok: true, intent, messageKey: 'tankobonSalesRecorded' }
    }
    if (intent === 'downloadTaskFile') {
      const response = await taskControllerGetTaskFileDownloadUrl(
        { id: required(form, 'taskId') },
        { key: required(form, 'key') }
      )
      return {
        ok: true,
        intent,
        messageKey: 'taskDownloadReady',
        downloadUrl: response.data.downloadUrl,
        expiresAt: response.data.expiresAt
      }
    }
    return { ok: false, intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      message: extractApiErrorMessage(error, 'Không thể thực hiện thao tác tham chiếu.')
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

function required(form: FormData, key: string) {
  const value = String(form.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function positiveInteger(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid ${key}`)
  return value
}

function nonNegativeInteger(form: FormData, key: string) {
  const value = Number(required(form, key))
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${key}`)
  return value
}

export default function RouteComponent() {
  const loaderData = useLoaderData<typeof clientLoader>()
  return <BoardReferencePage {...loaderData} />
}
import { useLoaderData, type ClientActionFunctionArgs, type ClientLoaderFunctionArgs } from 'react-router'
