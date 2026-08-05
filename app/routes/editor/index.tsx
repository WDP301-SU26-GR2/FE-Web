import { EditorDashboardPage } from '~/features/editor'
import { editorDashboardControllerEditor } from '~/api/operations/dashboard/dashboard'
import type { Route } from './+types/index'
import { SITE } from '~/shared/config/site'

export function meta() {
  return [{ title: SITE.name }]
}

export async function clientLoader() {
  try {
    const response = await editorDashboardControllerEditor()
    return { dashboard: response.data, hasError: false }
  } catch {
    return { dashboard: null, hasError: true }
  }
}

export default function DashboardEditorRoute({ loaderData }: Route.ComponentProps) {
  return <EditorDashboardPage {...loaderData} />
}
