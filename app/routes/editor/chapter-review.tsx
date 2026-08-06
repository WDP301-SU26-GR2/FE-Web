import {
  chapterControllerApprove,
  chapterControllerExtend,
  chapterControllerGetOne,
  chapterControllerHold,
  chapterControllerListPages,
  chapterControllerPublish,
  chapterControllerProgress,
  chapterControllerRequestRevision,
  chapterControllerResume,
  chapterControllerSetSchedule
} from '~/api/operations/chapters/chapters'
import {
  chapterStoryboardControllerApprove,
  chapterStoryboardControllerGetOne,
  chapterStoryboardControllerList,
  chapterStoryboardControllerRequestRevision
} from '~/api/operations/storyboards/storyboards'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { contractControllerGetContractById, contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import {
  productionStageControllerList,
  productionStageControllerListPages
} from '~/api/operations/production-stages/production-stages'
import { taskControllerListRegions } from '~/api/operations/task/task'
import {
  EditorChapterReviewPage,
  type EditorActionResult,
  type EditorChapterReviewData,
  type SignedPage
} from '~/features/editor'

import type { Route } from './+types/chapter-review'
import { SITE } from '~/shared/config/site'

export function meta() {
  return [{ title: SITE.name }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.seriesId || !params.chapterId) return { data: null, hasError: true }
  try {
    const [
      seriesResponse,
      chapterResponse,
      pagesResponse,
      storyboardsResponse,
      progressResponse,
      contractsResponse
    ] = await Promise.all([
      seriesControllerGetSeries({ id: params.seriesId }),
      chapterControllerGetOne({ id: params.chapterId }),
      chapterControllerListPages({ id: params.chapterId }),
      chapterStoryboardControllerList({ id: params.chapterId }),
      chapterControllerProgress({ id: params.chapterId }).catch(() => null),
      contractControllerGetContracts().catch(() => null)
    ])
    if (seriesResponse.status !== 200 || chapterResponse.status !== 200 || pagesResponse.status !== 200) {
      return { data: null, hasError: true }
    }
    if (chapterResponse.data.seriesId !== params.seriesId) return { data: null, hasError: true }
    const pages: SignedPage[] = await Promise.all(
      pagesResponse.data.items
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .map(async (page) => ({
          id: page.id,
          pageNumber: page.pageNumber,
          status: page.status,
          url: await signKey(page.compositeFile ?? page.originalFile)
        }))
    )
    const storyboard = storyboardsResponse.status === 200 ? (storyboardsResponse.data.items[0] ?? null) : null
    const storyboardDetailResponse = storyboard
      ? await chapterStoryboardControllerGetOne({ id: params.chapterId, storyboardId: storyboard.id }).catch(() => null)
      : null
    const detailedStoryboard = storyboardDetailResponse?.status === 200 ? storyboardDetailResponse.data : storyboard
    const storyboardPages = await Promise.all(
      (detailedStoryboard?.pages ?? []).map(async (page) => ({
        pageNumber: page.pageNumber,
        url: await signKey(page.fileUrl)
      }))
    )
    const stagesResponse = await productionStageControllerList({ id: params.chapterId }).catch(() => null)
    const stagePageResponses =
      stagesResponse?.status === 200
        ? await Promise.all(
            stagesResponse.data.stages.map((stage) =>
              productionStageControllerListPages({ id: params.chapterId, stageId: stage.id }).catch(() => null)
            )
          )
        : []
    const stagePages = stagePageResponses.flatMap((response) => (response?.status === 200 ? response.data.items : []))
    const regionEntries = await Promise.all(
      pagesResponse.data.items.map(async (page) => {
        const response = await taskControllerListRegions({ id: page.id }).catch(() => null)
        return [page.id, response?.status === 200 ? response.data.items : []] as const
      })
    )
    const contractListItem =
      contractsResponse?.data.find(
        (contract) => contract.seriesId === params.seriesId && contract.status === 'FULLY_EXECUTED'
      ) ?? contractsResponse?.data.find((contract) => contract.seriesId === params.seriesId)
    const contractResponse = contractListItem
      ? await contractControllerGetContractById({ id: contractListItem.id }).catch(() => null)
      : null
    const data: EditorChapterReviewData = {
      series: seriesResponse.data,
      chapter: chapterResponse.data,
      contract: contractResponse?.status === 200 ? contractResponse.data : null,
      pages,
      storyboard: detailedStoryboard,
      storyboardPages,
      progress: progressResponse?.status === 200 ? progressResponse.data : null,
      stages: stagesResponse?.status === 200 ? stagesResponse.data : null,
      stagePages,
      regionsByPage: Object.fromEntries(regionEntries)
    }
    return { data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  const chapterId = String(formData.get('chapterId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim() || undefined
  let publishAwaitingCoOwner = false
  try {
    if (intent === 'approveManuscript') await chapterControllerApprove({ id: chapterId })
    else if (intent === 'reviseManuscript') {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await chapterControllerRequestRevision({ id: chapterId }, { reason })
    } else if (intent === 'publishChapter') {
      const response = await chapterControllerPublish({ id: chapterId })
      publishAwaitingCoOwner =
        response.status === 201 && response.data.manuscriptStatus === 'AWAITING_CO_OWNER_APPROVAL'
    } else if (intent === 'approveStoryboard')
      await chapterStoryboardControllerApprove({
        id: chapterId,
        storyboardId: required(formData, 'storyboardId')
      })
    else if (intent === 'reviseStoryboard') {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await chapterStoryboardControllerRequestRevision(
        { id: chapterId, storyboardId: required(formData, 'storyboardId') },
        { reason }
      )
    } else if (intent === 'setSchedule') {
      const deadline = new Date(required(formData, 'deadline')).toISOString()
      await chapterControllerSetSchedule({ id: chapterId }, { originalDeadline: deadline, currentDeadline: deadline })
    } else if (intent === 'extendSchedule')
      await chapterControllerExtend(
        { id: chapterId },
        { newDeadline: new Date(required(formData, 'deadline')).toISOString(), reason }
      )
    else if (intent === 'holdChapter')
      await chapterControllerHold(
        { id: chapterId },
        {
          reason: required(formData, 'reason'),
          ...(formData.get('expectedReturnDate')
            ? { expectedReturnDate: new Date(String(formData.get('expectedReturnDate'))).toISOString() }
            : {})
        }
      )
    else if (intent === 'resumeChapter') await chapterControllerResume({ id: chapterId })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'approveManuscript'
          ? 'manuscriptApproved'
          : intent === 'approveStoryboard'
            ? 'approved'
            : intent === 'publishChapter'
              ? publishAwaitingCoOwner
                ? 'awaitingCoOwnerApproval'
                : 'published'
              : intent === 'reviseManuscript' || intent === 'reviseStoryboard'
                ? 'revisionRequested'
                : intent
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { code?: string } }).data?.code
        : undefined
    const errorKey =
      code === 'Error.NotAssignedEditor' || code === 'Error.NotSeriesEditor'
        ? 'notAssigned'
        : code === 'Error.ContractNotExecuted' || code === 'Error.ContractNotFullyExecuted'
          ? 'contractRequired'
          : code === 'Error.PagesNotReadyForPublish'
            ? 'pagesNotReadyForPublish'
            : [
                  'Error.InvalidManuscriptState',
                  'Error.InvalidManuscriptTransition',
                  'Error.InvalidStoryboardState'
                ].includes(code ?? '')
              ? 'invalidState'
              : 'actionFailed'
    return { ok: false, intent, errorKey }
  }
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '')
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

export default function EditorChapterReviewRoute({ loaderData }: Route.ComponentProps) {
  return <EditorChapterReviewPage data={loaderData.data} hasError={loaderData.hasError} />
}

async function signKey(key: string | null): Promise<string | null> {
  if (!key) return null
  try {
    const response = await storageControllerSignDownload({ key })
    return response.status === 201 ? response.data.downloadUrl : null
  } catch {
    return null
  }
}
