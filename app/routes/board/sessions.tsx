import { boardControllerGetSessionById, boardControllerGetSessions } from '~/api/operations/board/board'
import { BoardSessionsPage } from '~/features/board'
import type { Route } from './+types/sessions'

export async function clientLoader() {
  try {
    const response = await boardControllerGetSessions({ mine: 'true' })
    const sessions = await Promise.all(
      response.data.map((session) =>
        boardControllerGetSessionById({ id: session.id })
          .then((detail) => detail.data)
          .catch(() => null)
      )
    )
    return { sessions: sessions.filter((session) => session !== null), hasError: false }
  } catch {
    return { sessions: [], hasError: true }
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <BoardSessionsPage {...loaderData} />
}
