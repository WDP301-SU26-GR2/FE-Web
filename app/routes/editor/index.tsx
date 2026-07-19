import { EditorDashboardPage } from '~/features/editor'
import { dashboardControllerEditor } from '~/api/operations/dashboard/dashboard'
import type { Route } from './+types/index'

export function meta() {
  return [{ title: 'Editor Dashboard - MangaStudio Pro' }]
}

export async function clientLoader() {
  try {
    const response = await dashboardControllerEditor()
    return { dashboard: response.data, hasError: false }
  } catch {
    return { dashboard: null, hasError: true }
  }
}

export default function DashboardEditorRoute({ loaderData }: Route.ComponentProps) {
  return <EditorDashboardPage {...loaderData} />
}
