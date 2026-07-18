import { Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function AdminLayout() {
  const config = useDashboardNavConfig('SUPER_ADMIN')
  const { session } = useAuth()
  const profile = {
    ...config.profile,
    name: session?.user.displayName ?? session?.user.name ?? config.profile.name
  }

  return (
    <DashboardLayout {...config} profile={profile}>
      <Outlet />
    </DashboardLayout>
  )
}
