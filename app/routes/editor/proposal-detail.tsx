import { redirect } from 'react-router'

import {
  seriesControllerApproveProposal,
  seriesControllerGetSeries,
  seriesControllerRelease,
  seriesControllerReopenReview,
  seriesControllerReject,
  seriesControllerRequestProposalRevision,
  seriesControllerPitch
} from '~/api/operations/series/series'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import { SITE } from '~/shared/config/site'
import {
  EDITOR_PROPOSAL_INTENTS,
  EDITOR_PROPOSAL_ROUTES,
  EditorProposalDetailPage,
  isEditorProposalIntent,
  mapEditorProposalError,
  type EditorActionResult,
  type EditorProposalDetailData
} from '~/features/editor'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'

import type { Route } from './+types/proposal-detail'

const DETAIL_REQUEST_CONCURRENCY = 6

export function meta({ data }: Route.MetaArgs) {
  return [{ title: data?.data?.series.title ? `${data.data.series.title} | ${SITE.shortName}` : SITE.shortName }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.id) return { data: null, hasError: true }
  try {
    const seriesResponse = await seriesControllerGetSeries({ id: params.id })
    if (seriesResponse.status !== 200) return { data: null, hasError: true }

    const series = seriesResponse.data
    const [coverUrl, characterDesigns, storyboardPages] = await Promise.all([
      signKey(series.coverImage),
      mapWithConcurrency(series.proposal?.characterDesigns ?? [], DETAIL_REQUEST_CONCURRENCY, async (key) => ({
        key,
        url: await signKey(key)
      })),
      mapWithConcurrency(
        [...(series.proposal?.storyboardPages ?? [])].sort((left, right) => left.pageNumber - right.pageNumber),
        DETAIL_REQUEST_CONCURRENCY,
        async (page) => ({
          pageNumber: page.pageNumber,
          key: page.fileUrl,
          url: await signKey(page.fileUrl)
        })
      )
    ])
    const data: EditorProposalDetailData = {
      series,
      coverUrl,
      characterDesigns,
      storyboardPages
    }
    return { data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult | Response> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  const seriesId = String(formData.get('seriesId') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim() || undefined
  if (!seriesId || !isEditorProposalIntent(intent) || intent === EDITOR_PROPOSAL_INTENTS.claim)
    return { ok: false, intent, errorKey: 'invalidAction' }

  try {
    if (intent === EDITOR_PROPOSAL_INTENTS.approve) await seriesControllerApproveProposal({ id: seriesId })
    else if (intent === EDITOR_PROPOSAL_INTENTS.requestRevision) {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await seriesControllerRequestProposalRevision({ id: seriesId }, { reason })
    } else if (intent === EDITOR_PROPOSAL_INTENTS.reject) {
      if (!reason) return { ok: false, intent, errorKey: 'rejectionReasonRequired' }
      await seriesControllerReject({ id: seriesId }, { reason })
    } else if (intent === EDITOR_PROPOSAL_INTENTS.reopen) {
      if (!reason) return { ok: false, intent, errorKey: 'revisionReasonRequired' }
      await seriesControllerReopenReview({ id: seriesId }, { reason })
    } else if (intent === EDITOR_PROPOSAL_INTENTS.release) {
      await seriesControllerRelease({ id: seriesId })
      return redirect(EDITOR_PROPOSAL_ROUTES.list)
    } else if (intent === EDITOR_PROPOSAL_INTENTS.pitch) await seriesControllerPitch({ id: seriesId })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    const messageKey = intent.startsWith('approve')
      ? 'approved'
      : intent === EDITOR_PROPOSAL_INTENTS.reject
        ? 'rejected'
        : intent === EDITOR_PROPOSAL_INTENTS.reopen
          ? 'reviewReopened'
          : intent === EDITOR_PROPOSAL_INTENTS.pitch
            ? 'pitch'
            : 'revisionRequested'
    return { ok: true, intent, messageKey }
  } catch (error) {
    return { ok: false, intent, errorKey: mapEditorProposalError(error) }
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
