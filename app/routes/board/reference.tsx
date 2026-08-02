import {
  chapterControllerListBySeries,
  chapterControllerListPages,
  chapterControllerProgress
} from '~/api/operations/chapters/chapters'
import {
  chapterStoryboardControllerGetOne,
  chapterStoryboardControllerList
} from '~/api/operations/storyboards/storyboards'
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
import { usersControllerListAssistants, usersControllerListMangakas } from '~/api/operations/users/users'
import { BoardReferencePage, type BoardActionResult } from '~/features/board'
import { extractApiErrorCode, extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const search = new URL(request.url).searchParams
  const seriesId = search.get('seriesId')?.trim() ?? ''
  const publicationVersionId = search.get('publicationVersionId')?.trim() ?? ''
  const surveyPeriodId = search.get('surveyPeriodId')?.trim() ?? ''
  const chapterId = search.get('chapterId')?.trim() ?? ''
  const storyboardId = search.get('storyboardId')?.trim() ?? ''

  const [seriesResponse, periodsResponse, assistants, mangakas, revisions] = await Promise.all([
    settle(seriesControllerListSeries({ limit: 100, offset: 0 })),
    settle(surveyControllerGetSurveyPeriods()),
    settle(usersControllerListAssistants({ limit: 100, offset: 0 })),
    settle(usersControllerListMangakas({ limit: 100, offset: 0 })),
    settle(revisionControllerList({ limit: 100, offset: 0 }))
  ])

  const [seriesDetail, defense, publicationVersions, publicationVersion, trend, chapters] = seriesId
    ? await Promise.all([
        settle(seriesControllerGetSeries({ id: seriesId })),
        settle(tankobonControllerDashboard({ id: seriesId })),
        settle(publicationControllerList({ seriesId })),
        publicationVersionId ? settle(publicationControllerGetOne({ id: publicationVersionId })) : null,
        settle(surveyControllerGetSeriesTrend({ seriesId, periods: 12 })),
        settle(chapterControllerListBySeries({ seriesId }))
      ])
    : [null, null, null, null, null, null]

  const [surveyPeriod, rankings, surveyData, readerVotes, boardRanking] = surveyPeriodId
    ? await Promise.all([
        settle(surveyControllerGetSurveyPeriodById({ id: surveyPeriodId })),
        settle(surveyControllerGetRankingRecords({ id: surveyPeriodId })),
        settle(surveyControllerGetSurveyPeriodSurveyData({ id: surveyPeriodId })),
        settle(surveyControllerGetSurveyPeriodVotes({ id: surveyPeriodId })),
        settle(surveyControllerGetBoardRanking({ surveyPeriodId }))
      ])
    : [null, null, null, null, null]

  const [storyboards, selectedStoryboard, pages, progress, stages] = chapterId
    ? await Promise.all([
        settle(chapterStoryboardControllerList({ id: chapterId })),
        storyboardId ? settle(chapterStoryboardControllerGetOne({ id: chapterId, storyboardId })) : null,
        settle(chapterControllerListPages({ id: chapterId })),
        settle(chapterControllerProgress({ id: chapterId })),
        settle(productionStageControllerList({ id: chapterId }))
      ])
    : [null, null, null, null, null]

  return {
    series: seriesResponse?.items ?? [],
    periods: periodsResponse?.items ?? [],
    selected: { seriesId, publicationVersionId, surveyPeriodId, chapterId, storyboardId },
    directories: { assistants, mangakas },
    revisions,
    seriesData: {
      detail: seriesDetail,
      defense,
      publicationVersions,
      selectedPublicationVersion: publicationVersion,
      rankingTrend: trend,
      chapters
    },
    surveyData: { period: surveyPeriod, rankings, offlineData: surveyData, readerVotes, boardRanking },
    chapterData: { storyboards, selectedStoryboard, pages, progress, stages }
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
    return { ok: false, intent }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorCode: extractApiErrorCode(error),
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
