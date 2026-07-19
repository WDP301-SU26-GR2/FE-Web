import { EditorSurveysPage } from '~/features/editor'
import {
  clientAction as editorSurveyAction,
  clientLoader as editorSurveyLoader
} from '../editor/operations-surveys'
import type { Route } from './+types/operations-surveys'

export const clientLoader = editorSurveyLoader
export const clientAction = editorSurveyAction

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  return <EditorSurveysPage {...loaderData} backPath='/dashboard/admin/operations' />
}
