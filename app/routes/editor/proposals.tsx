import { seriesControllerClaim, seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { SITE } from '~/shared/config/site'
import {
  EDITOR_PROPOSAL_INTENTS,
  EDITOR_PROPOSALS_PAGE_SIZE,
  EditorProposalsPage,
  mapEditorProposalError,
  type EditorActionResult
} from '~/features/editor'

import type { Route } from './+types/proposals'

export function meta() {
  return [{ title: SITE.shortName }]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const requestedOffset = Number(new URL(request.url).searchParams.get('offset') ?? 0)
  const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0
  try {
    const response = await seriesControllerListSeries({ limit: EDITOR_PROPOSALS_PAGE_SIZE, offset })
    return {
      items: response.data.items as SeriesListResDtoOutputItemsItem[],
      total: response.data.total,
      limit: response.data.limit,
      offset: response.data.offset,
      hasError: false
    }
  } catch {
    return {
      items: [] as SeriesListResDtoOutputItemsItem[],
      total: 0,
      limit: EDITOR_PROPOSALS_PAGE_SIZE,
      offset,
      hasError: true
    }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')
  const seriesId = String(formData.get('seriesId') ?? '')
  if (!seriesId || intent !== EDITOR_PROPOSAL_INTENTS.claim) return { ok: false, intent, errorKey: 'invalidAction' }
  try {
    await seriesControllerClaim({ id: seriesId })
    return { ok: true, intent, messageKey: 'claimed' }
  } catch (error) {
    return { ok: false, intent, errorKey: mapEditorProposalError(error) }
  }
}

export default function EditorProposalsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <EditorProposalsPage
      items={loaderData.items}
      total={loaderData.total}
      limit={loaderData.limit}
      offset={loaderData.offset}
      hasError={loaderData.hasError}
    />
  )
}
