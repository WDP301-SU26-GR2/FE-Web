import { boardControllerGetSessionById, boardControllerGetSessions } from '~/api/operations/board/board'
import { BoardSessionsPage } from '~/features/board'
import { mapWithConcurrency } from '~/shared/lib/api/map-with-concurrency'
import type { Route } from './+types/sessions'

const DETAIL_REQUEST_CONCURRENCY = 6

export async function clientLoader() {
  try {
    const response = await boardControllerGetSessions({ mine: 'true' })
    const sessions = await mapWithConcurrency(response.data, DETAIL_REQUEST_CONCURRENCY, (session) =>
      boardControllerGetSessionById({ id: session.id })
        .then((detail) => detail.data)
        .catch(() => null)
    )
    return { sessions: sessions.filter((session) => session !== null), hasError: false }
  } catch {
    return { sessions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionsPage {...loaderData} />
}
