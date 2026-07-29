import { Outlet } from 'react-router'

import { DashboardLayout, RoleDashboardGuard, useDashboardNavConfig } from '~/shared/components'

export default function EditorLayout() {
  const config = useDashboardNavConfig('EDITOR')

  return (
    <RoleDashboardGuard role='EDITOR'>
      <DashboardLayout {...config}>
        <Outlet />
      </DashboardLayout>
    </RoleDashboardGuard>
  )
}
