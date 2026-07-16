import { chapterControllerListBySeries } from '~/api/operations/chapters/chapters'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { EditorPublicationPage, type EditorChapterItem, type EditorPublicationData } from '~/features/editor'

export function meta() {
  return [{ title: 'Publication Review - MangaStudio Pro' }]
}

export async function clientLoader() {
  try {
    const responses = await Promise.all([
      seriesControllerListSeries({ status: 'SERIALIZED', limit: 100, offset: 0 }),
      seriesControllerListSeries({ status: 'HIATUS', limit: 100, offset: 0 }),
      seriesControllerListSeries({ status: 'COMPLETING', limit: 100, offset: 0 }),
      seriesControllerListSeries({ status: 'CANCELLING', limit: 100, offset: 0 })
    ])
    const series = responses
      .flatMap((response) => response.data.items)
      .filter((item) => Boolean(item.editorId)) as SeriesListResDtoOutputItemsItem[]
    const chapterResponses = await Promise.all(
      series.map(async (item) => ({
        series: item,
        response: await chapterControllerListBySeries({ seriesId: item.id })
      }))
    )
    const chapters: EditorChapterItem[] = chapterResponses.flatMap(({ series: item, response }) =>
      response.data.items.map((chapter) => ({ series: item, chapter }))
    )
    const data: EditorPublicationData = { series, chapters }
    return { data, hasError: false }
  } catch {
    return { data: null, hasError: true }
  }
}

export default function EditorPublicationRoute({
  loaderData
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>
}) {
  return <EditorPublicationPage data={loaderData.data} hasError={loaderData.hasError} />
}
