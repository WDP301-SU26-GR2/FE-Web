import {
  publicationControllerCreate,
  publicationControllerList,
  publicationControllerRemove,
  publicationControllerUpdate
} from '~/api/operations/publication-versions/publication-versions'
import { EditorPublicationVersionsPage, type EditorActionResult } from '~/features/editor'
import { loadOperationalSeries, optional, required } from './operations-route-utils'
import type { Route } from './+types/operations-versions'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusSeriesId = new URL(request.url).searchParams.get('seriesId') ?? ''
  try {
    const [series, response] = await Promise.all([
      loadOperationalSeries(),
      focusSeriesId ? publicationControllerList({ seriesId: focusSeriesId }).catch(() => null) : null
    ])
    return { series, focusSeriesId, versions: response?.status === 200 ? response.data.items : [], hasError: false }
  } catch {
    return { series: [], focusSeriesId, versions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createPublicationVersion')
      await publicationControllerCreate(
        { seriesId: required(form, 'seriesId') },
        {
          language: required(form, 'language'),
          readingDirection: required(form, 'readingDirection') as 'RTL' | 'LTR',
          versionType: required(form, 'versionType') as 'ORIGINAL' | 'DIGITAL' | 'FLIPPED',
          notes: optional(form, 'notes') ?? null
        }
      )
    else if (intent === 'updatePublicationVersion')
      await publicationControllerUpdate(
        { id: required(form, 'versionId') },
        {
          language: optional(form, 'language'),
          readingDirection: optional(form, 'readingDirection') as 'RTL' | 'LTR' | undefined,
          versionType: optional(form, 'versionType') as 'ORIGINAL' | 'DIGITAL' | 'FLIPPED' | undefined,
          notes: optional(form, 'notes')
        }
      )
    else if (intent === 'removePublicationVersion')
      await publicationControllerRemove({ id: required(form, 'versionId') })
    else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: 'operationCompleted' }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorPublicationVersionsPage {...loaderData} />
}
