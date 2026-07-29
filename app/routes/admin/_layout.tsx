import { Outlet } from 'react-router'

import { DashboardLayout, RoleDashboardGuard, useDashboardNavConfig } from '~/shared/components'

export default function AdminLayout() {
  const config = useDashboardNavConfig('SUPER_ADMIN')

  return (
    <RoleDashboardGuard role='SUPER_ADMIN'>
      <DashboardLayout {...config}>
        <Outlet />
      </DashboardLayout>
    </RoleDashboardGuard>
  )
}
