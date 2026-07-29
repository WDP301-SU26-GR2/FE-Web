import { Outlet } from 'react-router'

import { DashboardLayout, RoleDashboardGuard, useDashboardNavConfig } from '~/shared/components'

export default function MangakaLayout() {
  const config = useDashboardNavConfig('MANGAKA')
  return (
    <RoleDashboardGuard role='MANGAKA'>
      <DashboardLayout {...config}>
        <Outlet />
      </DashboardLayout>
    </RoleDashboardGuard>
  )
}
