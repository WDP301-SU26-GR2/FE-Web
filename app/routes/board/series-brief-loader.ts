import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import type { BoardMeetingSeriesBrief } from '~/features/board'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function createSeriesBrief(series: BoardMeetingSeriesBrief['series']): Promise<BoardMeetingSeriesBrief> {
  const [characterDesigns, proposalStoryboardPages] = await Promise.all([
    mapWithConcurrency(series.proposal?.characterDesigns ?? [], DETAIL_REQUEST_CONCURRENCY, signImage).then(compact),
    mapWithConcurrency(series.proposal?.storyboardPages ?? [], DETAIL_REQUEST_CONCURRENCY, async (page) => {
      const image = await signImage(page.fileUrl)
      return image ? { ...image, pageNumber: page.pageNumber } : null
    }).then(compact)
  ])

  return { series, characterDesigns, proposalStoryboardPages }
}

async function signImage(key: string) {
  const response = await storageControllerSignDownload({ key }).catch(() => null)
  return response?.status === 201 ? { key, url: response.data.downloadUrl } : null
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null)
}
