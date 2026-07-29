import { Outlet } from 'react-router'

import { useAuth } from '~/features/auth/context/auth-context'
import { DashboardLayout, RoleDashboardGuard, useDashboardNavConfig } from '~/shared/components'

export default function BoardLayout() {
  const { session } = useAuth()
  const baseConfig = useDashboardNavConfig('BOARD')

  const config = {
    ...baseConfig,
    profileFallback: {
      ...baseConfig.profileFallback,
      name: session?.user.displayName || session?.user.name || baseConfig.profileFallback.name
    }
  }
  return (
    <RoleDashboardGuard role='BOARD_MEMBER'>
      <DashboardLayout {...config}>
        <Outlet />
      </DashboardLayout>
    </RoleDashboardGuard>
  )
}
