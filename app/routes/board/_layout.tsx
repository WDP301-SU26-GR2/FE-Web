import { Navigate, Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'
import { ROLE_DASHBOARD_PATH } from '~/shared/components'

export default function BoardLayout() {
  const { status, session } = useAuth()
  const baseConfig = useDashboardNavConfig('BOARD')

  if (status === 'idle') {
    return <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>...</div>
  }
  if (status === 'unauthenticated' || !session) return <Navigate to='/login' replace />
  if (session.user.role !== 'BOARD_MEMBER') {
    return <Navigate to={ROLE_DASHBOARD_PATH[session.user.role] ?? '/'} replace />
  }

  const config = {
    ...baseConfig,
    profileFallback: {
      ...baseConfig.profileFallback,
      name: session.user.displayName || session.user.name
    }
  }
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
