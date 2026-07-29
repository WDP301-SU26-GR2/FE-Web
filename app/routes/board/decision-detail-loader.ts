import {
  boardControllerGetDecisionDetails,
  boardControllerGetDecisionVotes,
  boardControllerGetReports,
  boardControllerGetSessionById
} from '~/api/operations/board/board'
import { seriesControllerGetSeries } from '~/api/operations/series/series'
import { tankobonControllerDashboard } from '~/api/operations/tankobon/tankobon'
import { readBoardSessionPhase } from '~/api/manual/board-meeting'
import { createSeriesBrief } from './series-brief-loader'

export async function loadBoardDecisionDetail(id: string) {
  const decision = await boardControllerGetDecisionDetails({ id })
  if (decision.status !== 200) throw new Response('Not found', { status: 404 })

  const seriesId = decision.data.targetSeriesId ?? undefined
  const [votes, reports, session, series, defense] = await Promise.all([
    boardControllerGetDecisionVotes({ id }),
    boardControllerGetReports({ boardDecisionId: id }),
    boardControllerGetSessionById({ id: decision.data.boardSessionId }),
    seriesId ? seriesControllerGetSeries({ id: seriesId }).catch(() => null) : null,
    seriesId ? tankobonControllerDashboard({ id: seriesId }).catch(() => null) : null
  ])
  if (votes.status !== 200 || session.status !== 200) throw new Response('Not found', { status: 404 })

  const seriesBrief = series?.status === 200 ? await createSeriesBrief(series.data) : null
  return {
    decision: decision.data,
    votes: votes.data,
    reports: reports.data,
    seriesBrief,
    defense: defense?.status === 200 ? defense.data : null,
    sessionStatus: session.data.status,
    sessionPhase: readBoardSessionPhase(session.data),
    sessionTitle: session.data.title,
    allowedEditorIds: session.data.allowedEditorIds
  }
}
