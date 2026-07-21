import { reviewsControllerCreateMangakaReview } from '~/api/operations/reviews/reviews'
import { EditorMangakaReviewsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import type { Route } from './+types/operations-reviews'

export async function clientLoader() {
  try {
    return { series: await loadOperationalSeries(), hasError: false }
  } catch {
    return { series: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent !== 'reviewMangaka') return { ok: false, intent, errorKey: 'invalidAction' }
    await reviewsControllerCreateMangakaReview({
      mangakaId: required(form, 'mangakaId'),
      seriesId: required(form, 'seriesId'),
      rating: Number(required(form, 'rating')),
      comment: String(form.get('comment') ?? '') || undefined
    })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorMangakaReviewsPage {...loaderData} />
}
