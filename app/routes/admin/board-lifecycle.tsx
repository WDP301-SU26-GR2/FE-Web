import { EditorBoardLifecyclePage } from '~/features/editor'
import {
  clientAction as editorBoardLifecycleAction,
  clientLoader as editorBoardLifecycleLoader
} from '../editor/board-lifecycle'
import type { Route } from './+types/board-lifecycle'

export const clientLoader = editorBoardLifecycleLoader
export const clientAction = editorBoardLifecycleAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorBoardLifecyclePage {...loaderData} backPath='/dashboard/admin/board' />
}
