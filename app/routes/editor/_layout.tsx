import { Outlet } from 'react-router'

import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function EditorLayout() {
  const config = useDashboardNavConfig('EDITOR')
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
