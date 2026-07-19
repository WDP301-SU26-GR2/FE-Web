import { EditorBoardDecisionsPage } from '~/features/editor'
import {
  clientAction as editorBoardDecisionsAction,
  clientLoader as editorBoardDecisionsLoader
} from '../editor/board-decisions'
import type { Route } from './+types/board-decisions'

export const clientLoader = editorBoardDecisionsLoader
export const clientAction = editorBoardDecisionsAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return (
    <EditorBoardDecisionsPage
      {...loaderData}
      backPath='/dashboard/admin/board'
      detailBasePath='/dashboard/admin/board/decisions'
    />
  )
}
