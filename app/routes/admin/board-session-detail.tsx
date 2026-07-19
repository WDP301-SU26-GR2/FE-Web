import { EditorBoardMeetingRoomPage } from '~/features/editor'
import {
  clientAction as editorBoardSessionAction,
  clientLoader as editorBoardSessionLoader
} from '../editor/board-session-detail'
import type { Route } from './+types/board-session-detail'

export const clientLoader = editorBoardSessionLoader
export const clientAction = editorBoardSessionAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorBoardMeetingRoomPage
      {...loaderData}
      manageAll
      backPath='/dashboard/admin/board/sessions'
      decisionBasePath='/dashboard/admin/board/decisions'
    />
  )
}
