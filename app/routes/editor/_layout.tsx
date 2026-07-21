import { Navigate, Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'
import { ROLE_DASHBOARD_PATH } from '~/shared/components'

export default function EditorLayout() {
  const { status, session } = useAuth()
  const config = useDashboardNavConfig('EDITOR')

  if (status === 'idle') {
    return <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>...</div>
  }
  if (status === 'unauthenticated' || !session) return <Navigate to='/login' replace />
  if (session.user.role !== 'EDITOR') {
    return <Navigate to={ROLE_DASHBOARD_PATH[session.user.role] ?? '/'} replace />
  }

  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
