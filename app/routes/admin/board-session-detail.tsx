import { EditorBoardMeetingRoomPage } from '~/features/editor'
import { runBoardSessionAction, clientLoader as editorBoardSessionLoader } from '../editor/board-session-detail'
import type { Route } from './+types/board-session-detail'

export const clientLoader = editorBoardSessionLoader
export const clientAction = (args: Route.ClientActionArgs) => runBoardSessionAction(args)

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorBoardMeetingRoomPage
      {...loaderData}
      series={loaderData.series.filter((item) => item.status !== 'READY_TO_PITCH')}
      manageAll
      allowChat={false}
      backPath='/dashboard/admin/board/sessions'
      decisionBasePath='/dashboard/admin/board/decisions'
    />
  )
}
