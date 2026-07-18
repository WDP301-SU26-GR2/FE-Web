import {
  seriesControllerClaim,
  seriesControllerListSeries,
  seriesControllerRelease
} from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { EditorProposalsPage, type EditorActionResult } from '~/features/editor'

import type { Route } from './+types/proposals'

export function meta() {
  return [{ title: 'Series Submissions - MangaStudio Pro' }]
}

export async function clientLoader() {
  try {
    const response = await seriesControllerListSeries({ limit: 100, offset: 0 })
    return {
      items: response.data.items as SeriesListResDtoOutputItemsItem[],
      hasError: false
    }
  } catch {
    return { items: [] as SeriesListResDtoOutputItemsItem[], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  const seriesId = String(formData.get('seriesId') ?? '')
  if (!seriesId || !['claim', 'release'].includes(intent)) return { ok: false, intent, errorKey: 'invalidAction' }
  try {
    if (intent === 'claim') await seriesControllerClaim({ id: seriesId })
    else await seriesControllerRelease({ id: seriesId })
    return { ok: true, intent, messageKey: intent === 'claim' ? 'claimed' : 'released' }
  } catch (error) {
    return { ok: false, intent, errorKey: mapError(error) }
  }
}

export default function EditorProposalsRoute({ loaderData }: Route.ComponentProps) {
  return <EditorProposalsPage items={loaderData.items} hasError={loaderData.hasError} />
}

function mapError(error: unknown): string {
  const message = getErrorMessage(error)
  if (message === 'Error.SeriesAlreadyClaimed') return 'alreadyClaimed'
  if (message === 'Error.ReviewAlreadyStarted') return 'reviewStarted'
  if (message === 'Error.NotAssignedEditor') return 'notAssigned'
  return 'actionFailed'
}

function getErrorMessage(error: unknown) {
  return error && typeof error === 'object' && 'data' in error
    ? (error as { data?: { message?: string } }).data?.message
    : undefined
}
