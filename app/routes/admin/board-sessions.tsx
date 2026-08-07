import { EditorBoardSessionsPage } from '~/features/editor'
import { clientAction as editorBoardSessionsAction, loadBoardSessionsPage } from '../editor/board-sessions'
import type { Route } from './+types/board-sessions'

export async function clientLoader() {
  return loadBoardSessionsPage(true)
}
export const clientAction = editorBoardSessionsAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorBoardSessionsPage
      {...loaderData}
      manageAll
      hideCreateButton
      backPath='/dashboard/admin/board'
      detailBasePath='/dashboard/admin/board/sessions'
    />
  )
}
