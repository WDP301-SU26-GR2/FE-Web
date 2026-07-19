import { EditorPublicationVersionsPage } from '~/features/editor'
import {
  clientAction as editorPublicationVersionAction,
  clientLoader as editorPublicationVersionLoader
} from '../editor/operations-versions'
import type { Route } from './+types/operations-versions'

export const clientLoader = editorPublicationVersionLoader
export const clientAction = editorPublicationVersionAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorPublicationVersionsPage {...loaderData} backPath='/dashboard/admin/operations' />
}
