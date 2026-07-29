import { isFetchError } from '~/api/mutator/custom-fetch'
import { seriesControllerFranchiseConsent } from '~/api/operations/series/series'
import { FranchiseConsentPage, mangakaRouteMeta, type FranchiseConsentActionResult } from '~/features/mangaka'
import type { Route } from './+types/franchise-consent'

export function meta() {
  return mangakaRouteMeta('routeMeta.franchiseConsent.title', 'routeMeta.franchiseConsent.description')
}

export async function clientAction({ request, params }: Route.ClientActionArgs): Promise<FranchiseConsentActionResult> {
  const form = await request.formData()
  const approveValue = form.get('approve')

  if (!params.id || (approveValue !== 'true' && approveValue !== 'false')) {
    return { ok: false, error: 'invalidRequest' }
  }

  const approve = approveValue === 'true'

  try {
    await seriesControllerFranchiseConsent({ id: params.id }, { approve })
    return { ok: true, approve }
  } catch (error: unknown) {
    if (isFetchError(error)) {
      if (error.status === 403 || error.data.code === 'Error.NotOriginalMangaka') {
        return { ok: false, error: 'permission' }
      }
      if (error.status === 404 || error.data.code === 'Error.SeriesNotFound') {
        return { ok: false, error: 'notFound' }
      }
      if (error.status === 409 || error.data.code === 'Error.NotFranchiseConsentTarget') {
        return { ok: false, error: 'notPending' }
      }
    }

    return { ok: false, error: 'generic' }
  }
}

export default function MangakaFranchiseConsentRoute({ params }: Route.ComponentProps) {
  return <FranchiseConsentPage targetSeriesId={params.id} />
}
