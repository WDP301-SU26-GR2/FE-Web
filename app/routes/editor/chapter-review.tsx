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
  chapterNameControllerApprove,
  chapterNameControllerList,
  chapterNameControllerRequestRevision
} from '~/api/operations/names/names'
import {
  annotationControllerCreate,
  annotationControllerList,
  annotationControllerRemove,
  annotationControllerResolve
} from '~/api/operations/annotations/annotations'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { contractControllerGetContracts } from '~/api/operations/contracts/contracts'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import {
  EditorChapterReviewPage,
  type EditorActionResult,
  type EditorChapterReviewData,
  type SignedPage
} from '~/features/editor'

import type { Route } from './+types/chapter-review'

export function meta() {
  return [{ title: 'Chapter Review - MangaStudio Pro' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.seriesId || !params.chapterId) return { data: null, hasError: true }
  try {
    const [
      seriesResponse,
      chapterResponse,
      pagesResponse,
      namesResponse,
      progressResponse,
      annotationsResponse,
      contractsResponse
    ] = await Promise.all([
      seriesControllerGetSeries({ id: params.seriesId }),
      chapterControllerGetOne({ id: params.chapterId }),
      chapterControllerListPages({ id: params.chapterId }),
      chapterNameControllerList({ id: params.chapterId }),
      chapterControllerProgress({ id: params.chapterId }).catch(() => null),
      annotationControllerList({ targetType: 'MANUSCRIPT', targetId: params.chapterId }).catch(() => null),
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
    const name = namesResponse.status === 200 ? (namesResponse.data.items[0] ?? null) : null
    const nameAnnotationsResponse = name
      ? await annotationControllerList({ targetType: 'NAME', targetId: name.id }).catch(() => null)
      : null
    const namePages = await Promise.all(
      (name?.pages ?? []).map(async (page) => ({ pageNumber: page.pageNumber, url: await signKey(page.fileUrl) }))
    )
    const data: EditorChapterReviewData = {
      series: seriesResponse.data,
      chapter: chapterResponse.data,
      contract:
        contractsResponse?.data.find(
          (contract) => contract.seriesId === params.seriesId && contract.status === 'FULLY_EXECUTED'
        ) ??
        contractsResponse?.data.find((contract) => contract.seriesId === params.seriesId) ??
        null,
      pages,
      name,
      namePages,
      progress: progressResponse?.status === 200 ? progressResponse.data : null,
      annotations: annotationsResponse?.status === 200 ? annotationsResponse.data.items : [],
      nameAnnotations: nameAnnotationsResponse?.status === 200 ? nameAnnotationsResponse.data.items : []
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
    } else if (intent === 'approveChapterName')
      await chapterNameControllerApprove({ id: chapterId, nameId: required(formData, 'nameId') })
    else if (intent === 'reviseChapterName')
      await chapterNameControllerRequestRevision({ id: chapterId, nameId: required(formData, 'nameId') }, { reason })
    else if (intent === 'setSchedule') {
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
          reason: reason ?? 'Editorial hold',
          ...(formData.get('expectedReturnDate')
            ? { expectedReturnDate: new Date(String(formData.get('expectedReturnDate'))).toISOString() }
            : {})
        }
      )
    else if (intent === 'resumeChapter') await chapterControllerResume({ id: chapterId })
    else if (intent === 'createAnnotation')
      await annotationControllerCreate({
        targetType: formData.get('annotationTarget') === 'NAME' ? 'NAME' : 'MANUSCRIPT',
        targetId: formData.get('annotationTarget') === 'NAME' ? required(formData, 'nameId') : chapterId,
        annotationType: 'TEXT',
        reviewStage: 'EDITOR',
        content: required(formData, 'content'),
        coordinates: readCoordinates(formData)
      })
    else if (intent === 'resolveAnnotation')
      await annotationControllerResolve({ id: required(formData, 'annotationId') })
    else if (intent === 'removeAnnotation') await annotationControllerRemove({ id: required(formData, 'annotationId') })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return {
      ok: true,
      intent,
      messageKey:
        intent === 'approveManuscript'
          ? 'manuscriptApproved'
          : intent === 'approveChapterName'
            ? 'approved'
            : intent === 'publishChapter'
              ? publishAwaitingCoOwner
                ? 'awaitingCoOwnerApproval'
                : 'published'
              : intent.toLowerCase().includes('annotation')
                ? 'annotationUpdated'
                : intent === 'reviseManuscript' || intent === 'reviseChapterName'
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
            : ['Error.InvalidManuscriptState', 'Error.InvalidManuscriptTransition', 'Error.InvalidNameState'].includes(
                  code ?? ''
                )
              ? 'invalidState'
              : 'actionFailed'
    return { ok: false, intent, errorKey }
  }
}

function readCoordinates(formData: FormData) {
  const rawValues = ['x', 'y', 'width', 'height'].map((key) => String(formData.get(key) ?? '').trim())
  if (rawValues.some((value) => !value)) return undefined
  const values = rawValues.map(Number)
  if (values.some((value) => !Number.isFinite(value))) return undefined
  const [x, y, width, height] = values
  return { x, y, width, height }
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
