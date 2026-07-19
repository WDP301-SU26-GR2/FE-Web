import { EditorBoardSessionsPage } from '~/features/editor'
import {
  clientAction as editorBoardSessionsAction,
  clientLoader as editorBoardSessionsLoader
} from '../editor/board-sessions'
import type { Route } from './+types/board-sessions'

export const clientLoader = editorBoardSessionsLoader
export const clientAction = editorBoardSessionsAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorBoardSessionsPage
      {...loaderData}
      manageAll
      backPath='/dashboard/admin/board'
      detailBasePath='/dashboard/admin/board/sessions'
    />
  )
}
