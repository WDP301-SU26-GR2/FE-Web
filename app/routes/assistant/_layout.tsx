import { Outlet } from 'react-router'

import { DashboardLayout, useDashboardNavConfig } from '~/shared/components'

export default function AssistantLayout() {
  const config = useDashboardNavConfig('ASSISTANT')
  return (
    <DashboardLayout {...config}>
      <Outlet />
    </DashboardLayout>
  )
}
