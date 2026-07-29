import { Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'
import { ROLE_DASHBOARD_PATH } from '~/shared/components'

export default function AdminLayout() {
  const { status, session } = useAuth()
  const config = useDashboardNavConfig('SUPER_ADMIN')

  if (status === 'idle') {
    return <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>...</div>
  }
  if (status === 'unauthenticated' || !session) return <Navigate to='/login' replace />
  if (session.user.role !== 'SUPER_ADMIN') {
    return <Navigate to={ROLE_DASHBOARD_PATH[session.user.role] ?? '/'} replace />
  }

  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
