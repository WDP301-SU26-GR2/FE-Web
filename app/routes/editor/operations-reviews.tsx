import { reviewsControllerCreateMangakaReview } from '~/api/operations/reviews/reviews'
import { EditorMangakaReviewsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, required } from './operations-route-utils'
import { usersControllerListMangakas } from '~/api/operations/users/users'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import type { Route } from './+types/operations-reviews'

export async function clientLoader() {
  try {
    const [series, mangakas] = await Promise.all([
      loadOperationalSeries(),
      loadAllOffsetItems((pagination) => usersControllerListMangakas(pagination).then((response) => response.data))
    ])
    return { series, mangakas, hasError: false }
  } catch {
    return { series: [], mangakas: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent !== 'reviewMangaka') return { ok: false, intent, errorKey: 'invalidAction' }
    const rating = Number(required(form, 'rating'))
    const comment = String(form.get('comment') ?? '').trim()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 1000)
      return { ok: false, intent, errorKey: 'invalidAction' }
    await reviewsControllerCreateMangakaReview({
      mangakaId: required(form, 'mangakaId'),
      seriesId: String(form.get('seriesId') ?? '').trim() || undefined,
      rating,
      comment: comment || undefined
    })
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorMangakaReviewsPage {...loaderData} />
}
