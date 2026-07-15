import { usersControllerGetUser } from '~/api/operations/users/users'
import { AdminUserDetailPage } from '~/features/admin'

import type { Route } from './+types/user-detail'

export function meta({ data }: Route.MetaArgs) {
  const name = data?.user?.displayName ?? data?.user?.name
  return [{ title: name ? `${name} - User Management` : 'User Details - MangaStudio Pro' }]
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  if (!params.id) return { user: null, hasError: true }

  try {
    const response = await usersControllerGetUser({ id: params.id })
    if (response.status !== 200) return { user: null, hasError: true }
    return { user: response.data, hasError: false }
  } catch {
    return { user: null, hasError: true }
  }
}

export default function DashboardAdminUserDetailRoute({ loaderData }: Route.ComponentProps) {
  return <AdminUserDetailPage user={loaderData.user} hasError={loaderData.hasError} />
}
