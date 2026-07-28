import {
  seriesControllerApproveProposal,
  seriesControllerGetSeries,
  seriesControllerReopenReview,
  seriesControllerReject,
  seriesControllerRequestProposalRevision,
  seriesControllerUpdateSeriesMetadata
} from '~/api/operations/series/series'
import {
  nameControllerApprove,
  nameControllerGetOne,
  nameControllerList,
  nameControllerRequestRevision
} from '~/api/operations/names/names'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import {
  annotationControllerCreate,
  annotationControllerList,
  annotationControllerRemove,
  annotationControllerResolve
} from '~/api/operations/annotations/annotations'
import { EditorProposalDetailPage, type EditorActionResult, type EditorProposalDetailData } from '~/features/editor'

import type { Route } from './+types/proposal-detail'

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data?.data?.series.title ? `${data.data.series.title} - Editorial Review` : 'Editorial Review' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.id) return { data: null, hasError: true }
  try {
    const [seriesResponse, namesResponse] = await Promise.all([
      seriesControllerGetSeries({ id: params.id }),
      nameControllerList({ id: params.id })
    ])
    if (seriesResponse.status !== 200 || namesResponse.status !== 200) {
      return { data: null, hasError: true }
    }
    const series = seriesResponse.data
    const nameListItem = namesResponse.data.items[0] ?? null
    const nameResponse = nameListItem
      ? await nameControllerGetOne({ id: params.id, nameId: nameListItem.id }).catch(() => null)
      : null
    const name = nameResponse?.status === 200 ? nameResponse.data : nameListItem
    const annotationsResponse = name
      ? await annotationControllerList({ targetType: 'NAME', targetId: name.id }).catch(() => null)
      : null
    const data: EditorProposalDetailData = {
      series,
      name,
      coverUrl: await signKey(series.coverImage),
      characterDesigns: await Promise.all(
        (series.proposal?.characterDesigns ?? []).map(async (key) => ({ key, url: await signKey(key) }))
      ),
      namePageUrls: await Promise.all(
        (name?.pages ?? []).map(async (page) => ({ pageNumber: page.pageNumber, url: await signKey(page.fileUrl) }))
      ),
      nameAnnotations: annotationsResponse?.status === 200 ? annotationsResponse.data.items : []
    }
    return { data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  const seriesId = String(formData.get('seriesId') ?? '')
  const nameId = String(formData.get('nameId') ?? '')
  const reason = String(formData.get('reason') ?? '').trim() || undefined
  try {
    if (intent === 'approveProposal') await seriesControllerApproveProposal({ id: seriesId })
    else if (intent === 'reviseProposal') {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await seriesControllerRequestProposalRevision({ id: seriesId }, { reason })
    } else if (intent === 'approveName') await nameControllerApprove({ id: seriesId, nameId })
    else if (intent === 'reviseName') {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await nameControllerRequestRevision({ id: seriesId, nameId }, { reason })
    } else if (intent === 'createNameAnnotation')
      await annotationControllerCreate({
        targetType: 'NAME',
        targetId: nameId,
        annotationType: 'TEXT',
        reviewStage: 'EDITOR',
        content: required(formData, 'content'),
        coordinates: readCoordinates(formData)
      })
    else if (intent === 'resolveNameAnnotation')
      await annotationControllerResolve({ id: required(formData, 'annotationId') })
    else if (intent === 'removeNameAnnotation')
      await annotationControllerRemove({ id: required(formData, 'annotationId') })
    else if (intent === 'rejectSeries')
      await seriesControllerReject({ id: seriesId }, { reason: reason ?? 'Rejected by Editor' })
    else if (intent === 'reopenReview')
      await seriesControllerReopenReview({ id: seriesId }, { reason: required(formData, 'reason') })
    else if (intent === 'updateMetadata') {
      const currentSeries = await seriesControllerGetSeries({ id: seriesId })
      if (currentSeries.status !== 200 || currentSeries.data.status !== 'IN_REVIEW') {
        return { ok: false, intent, errorKey: 'metadataLocked' }
      }
      await seriesControllerUpdateSeriesMetadata(
        { id: seriesId },
        {
          title: required(formData, 'title'),
          synopsis: String(formData.get('synopsis') ?? '').trim(),
          coverImage: String(formData.get('coverImage') ?? '').trim(),
          characterDesigns: String(formData.get('characterDesigns') ?? '')
            .split(/[\n,]/)
            .map((key) => key.trim())
            .filter(Boolean)
        }
      )
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    const messageKey = intent.startsWith('approve')
      ? 'approved'
      : intent === 'rejectSeries'
        ? 'rejected'
        : intent === 'reopenReview'
          ? 'reviewReopened'
          : intent === 'updateMetadata'
            ? 'updated'
            : intent.includes('Annotation')
              ? 'annotationUpdated'
              : 'revisionRequested'
    return { ok: true, intent, messageKey }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { code?: string } }).data?.code
        : undefined
    const errorKey =
      code === 'Error.NotAssignedEditor'
        ? 'notAssigned'
        : code === 'Error.InvalidProposalState' ||
            code === 'Error.InvalidNameState' ||
            code === 'Error.InvalidSeriesTransition'
          ? 'invalidState'
          : 'actionFailed'
    return { ok: false, intent, errorKey }
  }
}

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`Missing ${key}`)
  return value
}

function readCoordinates(formData: FormData) {
  const rawValues = ['x', 'y', 'width', 'height'].map((key) => String(formData.get(key) ?? '').trim())
  if (rawValues.some((value) => !value)) return undefined
  const values = rawValues.map(Number)
  if (values.some((value) => !Number.isFinite(value))) return undefined
  const [x, y, width, height] = values
  return { x, y, width, height }
}

export default function EditorProposalDetailRoute({ loaderData }: Route.ComponentProps) {
  return <EditorProposalDetailPage data={loaderData.data} hasError={loaderData.hasError} />
}

async function signKey(key: string | null | undefined): Promise<string | null> {
  if (!key) return null
  try {
    const response = await storageControllerSignDownload({ key })
    return response.status === 201 ? response.data.downloadUrl : null
  } catch {
    return null
  }
}
