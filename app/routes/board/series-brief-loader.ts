import { nameControllerGetOne } from '~/api/operations/names/names'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import type { BoardMeetingSeriesBrief } from '~/features/board'

export async function createSeriesBrief(series: BoardMeetingSeriesBrief['series']): Promise<BoardMeetingSeriesBrief> {
  const proposalNameResponse = series.proposal?.nameId
    ? await nameControllerGetOne({ id: series.id, nameId: series.proposal.nameId }).catch(() => null)
    : null
  const proposalName = proposalNameResponse?.status === 200 ? proposalNameResponse.data : null
  const [characterDesigns, namePages] = await Promise.all([
    Promise.all((series.proposal?.characterDesigns ?? []).map(signImage)).then(compact),
    Promise.all(
      (proposalName?.pages ?? []).map(async (page) => {
        const image = await signImage(page.fileUrl)
        return image ? { ...image, pageNumber: page.pageNumber } : null
      })
    ).then(compact)
  ])

  return { series, characterDesigns, proposalName: proposalName ? { ...proposalName, pages: namePages } : null }
}

async function signImage(key: string) {
  const response = await storageControllerSignDownload({ key }).catch(() => null)
  return response?.status === 201 ? { key, url: response.data.downloadUrl } : null
}

function compact<T>(items: Array<T | null>): T[] {
  return items.filter((item): item is T => item !== null)
}
