import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import {
  boardControllerGetDecisions,
  boardControllerGetSessionById,
  boardControllerGetSessionMessages
} from '~/api/operations/board/board'
import { nameControllerGetOne } from '~/api/operations/names/names'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'
import { BoardSessionDetailPage, type BoardMeetingSeriesBrief } from '~/features/board'
import type { Route } from './+types/session-detail'

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const [session, decisions, messages] = await Promise.all([
    boardControllerGetSessionById({ id: params.id }),
    boardControllerGetDecisions({ boardSessionId: params.id }),
    boardControllerGetSessionMessages({ id: params.id }, { limit: 200, offset: 0 }).catch(() => null)
  ])
  if (session.status !== 200) throw new Response('Not found', { status: 404 })
  const seriesIds = [
    ...new Set(decisions.data.flatMap((decision) => (decision.targetSeriesId ? [decision.targetSeriesId] : [])))
  ]
  const seriesResponses = await Promise.all(seriesIds.map((id) => seriesControllerGetSeries({ id }).catch(() => null)))
  const seriesDetails = seriesResponses.flatMap((response) => (response?.status === 200 ? [response.data] : []))
  const seriesBriefs = await Promise.all(seriesDetails.map(createSeriesBrief))
  return {
    session: session.data,
    phase: readBoardSessionPhase(session.data),
    messages: messages?.status === 200 ? messages.data.items : [],
    decisions: decisions.data,
    seriesBriefs
  }
}

async function createSeriesBrief(series: BoardMeetingSeriesBrief['series']): Promise<BoardMeetingSeriesBrief> {
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

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionDetailPage {...loaderData} />
}
