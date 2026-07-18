import {
  seriesControllerApproveProposal,
  seriesControllerGetSeries,
  seriesControllerReject,
  seriesControllerRequestProposalRevision
} from '~/api/operations/series/series'
import { nameControllerApprove, nameControllerList, nameControllerRequestRevision } from '~/api/operations/names/names'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
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
    const name = namesResponse.data.items[0] ?? null
    const data: EditorProposalDetailData = {
      series,
      name,
      coverUrl: await signKey(series.coverImage),
      characterDesignUrls: (
        await Promise.all((series.proposal?.characterDesigns ?? []).map((key) => signKey(key)))
      ).filter((url): url is string => Boolean(url)),
      namePageUrls: await Promise.all(
        (name?.pages ?? []).map(async (page) => ({ pageNumber: page.pageNumber, url: await signKey(page.fileUrl) }))
      )
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
    else if (intent === 'reviseProposal') await seriesControllerRequestProposalRevision({ id: seriesId }, { reason })
    else if (intent === 'approveName') await nameControllerApprove({ id: seriesId, nameId })
    else if (intent === 'reviseName') await nameControllerRequestRevision({ id: seriesId, nameId }, { reason })
    else if (intent === 'rejectSeries')
      await seriesControllerReject({ id: seriesId }, { reason: reason ?? 'Rejected by Editor' })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent.startsWith('approve') ? 'approved' : 'revisionRequested' }
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { message?: string } }).data?.message
        : undefined
    const errorKey =
      message === 'Error.NotAssignedEditor'
        ? 'notAssigned'
        : message === 'Error.InvalidProposalState' || message === 'Error.InvalidNameState'
          ? 'invalidState'
          : 'actionFailed'
    return { ok: false, intent, errorKey }
  }
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
