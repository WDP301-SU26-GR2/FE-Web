import { Navigate, Outlet } from 'react-router'

import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function AdminLayout() {
  const config = useDashboardNavConfig('SUPER_ADMIN')
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
