import {
  publicationControllerCreate,
  publicationControllerGetOne,
  publicationControllerList,
  publicationControllerRemove,
  publicationControllerUpdate
} from '~/api/operations/publication-versions/publication-versions'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { EditorPublicationVersionsPage, type EditorActionResult } from '~/features/editor'
import { extractApiErrorMessage, extractApiSuccessMessage } from '~/shared/lib/api/extract-api-error'
import { optional, required } from './operations-route-utils'
import type { Route } from './+types/operations-versions'

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const focusSeriesId = new URL(request.url).searchParams.get('seriesId') ?? ''
  try {
    const [series, response] = await Promise.all([
      seriesControllerListSeries({ limit: 100, offset: 0 }).then((response) => response.data.items),
      focusSeriesId ? publicationControllerList({ seriesId: focusSeriesId }).catch(() => null) : null
    ])
    const listItems = response?.status === 200 ? response.data.items : []
    const versions = await Promise.all(
      listItems.map(async (item) => {
        const detail = await publicationControllerGetOne({ id: item.id }).catch(() => null)
        return detail?.status === 200 ? detail.data : item
      })
    )
    return { series, focusSeriesId, versions, hasError: false }
  } catch {
    return { series: [], focusSeriesId, versions: [], hasError: true }
  }
}

export async function clientAction({ request }: Route.ClientActionArgs): Promise<EditorActionResult> {
  const form = await request.formData()
  const intent = required(form, 'intent')
  try {
    let message = ''
    if (intent === 'createPublicationVersion') {
      const response = await publicationControllerCreate(
        { seriesId: required(form, 'seriesId') },
        {
          language: required(form, 'language'),
          readingDirection: required(form, 'readingDirection') as 'RTL' | 'LTR',
          versionType: required(form, 'versionType') as 'ORIGINAL' | 'DIGITAL' | 'FLIPPED',
          notes: optional(form, 'notes') ?? null
        }
      )
      message = extractApiSuccessMessage(response, 'Đã tạo phiên bản xuất bản.')
    } else if (intent === 'updatePublicationVersion') {
      const response = await publicationControllerUpdate(
        { id: required(form, 'versionId') },
        {
          language: optional(form, 'language'),
          readingDirection: optional(form, 'readingDirection') as 'RTL' | 'LTR' | undefined,
          versionType: optional(form, 'versionType') as 'ORIGINAL' | 'DIGITAL' | 'FLIPPED' | undefined,
          notes: optional(form, 'notes')
        }
      )
      message = extractApiSuccessMessage(response, 'Đã cập nhật phiên bản xuất bản.')
    } else if (intent === 'removePublicationVersion') {
      const response = await publicationControllerRemove({ id: required(form, 'versionId') })
      message = extractApiSuccessMessage(response, 'Đã xóa phiên bản xuất bản.')
    } else return { ok: false, intent, errorKey: 'invalidAction' }
    return { ok: true, intent, messageKey: intent, message }
  } catch (error) {
    return {
      ok: false,
      intent,
      errorKey: 'actionFailed',
      message: extractApiErrorMessage(error, 'Không thể cập nhật phiên bản xuất bản.')
    }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorPublicationVersionsPage {...loaderData} />
}
