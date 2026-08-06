import {
  publicationControllerCreate,
  publicationControllerGetOne,
  publicationControllerList,
  publicationControllerRemove,
  publicationControllerUpdate
} from '~/api/operations/publication-versions/publication-versions'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorPublicationVersionsPage, type EditorActionResult } from '~/features/editor'
import { loadAllOffsetItems } from '~/shared/lib/api/load-all-offset-items'
import {
  CreatePublicationVersionBodyDtoReadingDirection,
  CreatePublicationVersionBodyDtoVersionType,
  UpdatePublicationVersionBodyDtoReadingDirection,
  UpdatePublicationVersionBodyDtoVersionType
} from '~/api/model/publication-versions'
import { isEnumValue } from '~/shared/lib/is-enum-value'
import { optional, required } from './operations-route-utils'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import type { Route } from './+types/operations-versions'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusSeriesId = new URL(request.url).searchParams.get('seriesId') ?? ''
  try {
    const [series, response] = await Promise.all([
      loadAllOffsetItems((pagination) => seriesControllerListSeries(pagination).then((response) => response.data)),
      focusSeriesId ? publicationControllerList({ seriesId: focusSeriesId }).catch(() => null) : null
    ])
    const listItems = response?.status === 200 ? response.data.items : []
    const versions = await mapWithConcurrency(listItems, DETAIL_REQUEST_CONCURRENCY, async (item) => {
      const detail = await publicationControllerGetOne({ id: item.id }).catch(() => null)
      return detail?.status === 200 ? detail.data : item
    })
    return { series, focusSeriesId, versions, hasError: false }
  } catch {
    return { series: [], focusSeriesId, versions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    if (intent === 'createPublicationVersion') {
      const language = required(form, 'language').trim()
      const readingDirection = required(form, 'readingDirection')
      const versionType = required(form, 'versionType')
      const notes = optional(form, 'notes') ?? null
      if (
        language.length > 20 ||
        (notes?.length ?? 0) > 2000 ||
        !isEnumValue(CreatePublicationVersionBodyDtoReadingDirection, readingDirection) ||
        !isEnumValue(CreatePublicationVersionBodyDtoVersionType, versionType)
      )
        return { ok: false, intent, errorKey: 'invalidAction' }
      await publicationControllerCreate(
        { seriesId: required(form, 'seriesId') },
        {
          language,
          readingDirection,
          versionType,
          notes
        }
      )
    } else if (intent === 'updatePublicationVersion') {
      const language = form.get('clearLanguage') === 'on' ? null : optional(form, 'language')
      const readingDirection = nullableEnumField(
        form,
        'readingDirection',
        UpdatePublicationVersionBodyDtoReadingDirection
      )
      const versionType = nullableEnumField(form, 'versionType', UpdatePublicationVersionBodyDtoVersionType)
      const notes = form.get('clearNotes') === 'on' ? null : optional(form, 'notes')
      if ((language != null && language.length > 20) || (notes != null && notes.length > 2000))
        return { ok: false, intent, errorKey: 'invalidAction' }
      await publicationControllerUpdate(
        { id: required(form, 'versionId') },
        { language, readingDirection, versionType, notes }
      )
    } else if (intent === 'removePublicationVersion') {
      await publicationControllerRemove({ id: required(form, 'versionId') })
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent }
  } catch {
    return { ok: false, intent, errorKey: 'actionFailed' }
  }
}

function nullableEnumField<T extends string>(form: FormData, key: string, values: Record<string, T>) {
  const value = String(form.get(key) ?? '')
  if (!value) return undefined
  if (value === '__CLEAR__') return null
  if (!isEnumValue(values, value)) throw new Error(`Invalid ${key}`)
  return value
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorPublicationVersionsPage {...loaderData} />
}
