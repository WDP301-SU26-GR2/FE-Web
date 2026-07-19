import { Navigate, Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, ROLE_DASHBOARD_PATH, useDashboardNavConfig } from '~/shared/components'

export default function AdminLayout() {
  const config = useDashboardNavConfig('SUPER_ADMIN')
  const { status, session } = useAuth()

  if (status === 'idle') {
    return <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>...</div>
  }
  if (status === 'unauthenticated' || !session) return <Navigate to='/login' replace />
  if (session.user.role !== 'SUPER_ADMIN') {
    return <Navigate to={ROLE_DASHBOARD_PATH[session.user.role] ?? '/'} replace />
  }

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
