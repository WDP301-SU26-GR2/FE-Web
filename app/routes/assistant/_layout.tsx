import { Outlet } from 'react-router'

import { DashboardLayout, RoleDashboardGuard, useDashboardNavConfig } from '~/shared/components'

export default function AssistantLayout() {
  const config = useDashboardNavConfig('ASSISTANT')
  return (
    <RoleDashboardGuard role='ASSISTANT'>
      <DashboardLayout {...config}>
        <Outlet />
      </DashboardLayout>
    </RoleDashboardGuard>
  )
}
