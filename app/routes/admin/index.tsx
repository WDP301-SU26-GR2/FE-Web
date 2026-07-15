import { usersControllerGetAdminStats } from '~/api/operations/users/users'
import { AdminDashboard } from '~/features/admin'

import type { Route } from './+types/index'

export function meta() {
  return [{ title: 'Admin Dashboard - MangaStudio Pro' }]
}

export async function clientLoader({}: Route.ClientLoaderArgs) {
  try {
    const response = await usersControllerGetAdminStats()
    return { stats: response.data, hasError: false }
  } catch {
    return { stats: null, hasError: true }
  }
}

export default function DashboardAdminRoute({ loaderData }: Route.ComponentProps) {
  return <AdminDashboard stats={loaderData.stats} hasError={loaderData.hasError} />
}
