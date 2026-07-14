import { Outlet } from 'react-router'

import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function MangakaLayout() {
  const config = useDashboardNavConfig('MANGAKA')
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}