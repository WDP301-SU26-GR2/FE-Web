import { chapterControllerListBySeries, chapterControllerListPages } from '~/api/operations/chapters/chapters'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesControllerListSeriesStatus, SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { EditorPublicationPage, type EditorChapterItem, type EditorPublicationData } from '~/features/editor'
import type { Route } from './+types/publication'

export function meta() {
  return [{ title: 'Publication Review - MangaStudio Pro' }]
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const searchParams = new URL(request.url).searchParams
  const referenceId = searchParams.get('referenceId')
  const referenceType = searchParams.get('referenceType')
  try {
    const responses = await Promise.all(
      (['SERIALIZED', 'HIATUS', 'COMPLETING', 'CANCELLING'] as const).map(listAllSeriesByStatus)
    )
    const series = responses.flat().filter((item) => Boolean(item.editorId))
    const chapterResponses = await Promise.all(
      series.map(async (item) => ({
        series: item,
        response: await chapterControllerListBySeries({ seriesId: item.id })
      }))
    )
    const chapters: EditorChapterItem[] = chapterResponses.flatMap(({ series: item, response }) =>
      response.data.items.map((chapter) => ({ series: item, chapter }))
    )
    let focusChapterId = referenceId
    if (referenceId && referenceType === 'PAGE' && !chapters.some(({ chapter }) => chapter.id === referenceId)) {
      const pageResponses = await Promise.all(
        chapters.map(async ({ chapter }) => ({
          chapterId: chapter.id,
          response: await chapterControllerListPages({ id: chapter.id }).catch(() => null)
        }))
      )
      focusChapterId =
        pageResponses.find(({ response }) => response?.data.items.some((page) => page.id === referenceId))?.chapterId ??
        null
    }
    const data: EditorPublicationData = { series, chapters }
    return { data, referenceId: focusChapterId, hasError: false }
  } catch {
    return { data: null, referenceId, hasError: true }
  }
}

async function listAllSeriesByStatus(status: SeriesControllerListSeriesStatus) {
  const items: SeriesListResDtoOutputItemsItem[] = []
  const limit = 100
  let offset = 0
  while (true) {
    const response = await seriesControllerListSeries({ status, limit, offset })
    items.push(...response.data.items)
    offset += response.data.items.length
    if (response.data.items.length < limit || offset >= response.data.total) return items
  }
}

export default function EditorPublicationRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return (
    <EditorPublicationPage
      data={loaderData.data}
      focusReferenceId={loaderData.referenceId}
      hasError={loaderData.hasError}
    />
  )
}
