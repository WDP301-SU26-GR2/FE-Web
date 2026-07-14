import { Outlet } from 'react-router'

import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function BoardLayout() {
  const config = useDashboardNavConfig('BOARD')
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}