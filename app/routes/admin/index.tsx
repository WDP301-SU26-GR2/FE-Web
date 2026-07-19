import { dashboardControllerAdmin } from '~/api/operations/dashboard/dashboard'
import { AdminDashboard } from '~/features/admin'

import type { Route } from './+types/index'

export function meta() {
  return [{ title: 'Admin Dashboard - MangaStudio Pro' }]
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  try {
    const response = await dashboardControllerAdmin()
    return { stats: response.data.systemStats, unreadNotifications: response.data.unreadNotifications, hasError: false }
  } catch {
    return { stats: null, unreadNotifications: 0, hasError: true }
  }
}

export default function DashboardAdminRoute({ loaderData }: Route.ComponentProps) {
  return (
    <AdminDashboard
      stats={loaderData.stats}
      unreadNotifications={loaderData.unreadNotifications}
      hasError={loaderData.hasError}
    />
  )
}
