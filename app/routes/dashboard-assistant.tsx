import { Users, FileText, Bell, HelpCircle } from 'lucide-react'

import { DashboardLayout } from '~/shared/components'
import type { Route } from './+types/dashboard-assistant'

export function meta() {
  return [{ title: 'Assistant Dashboard - MangaStudio Pro' }]
}

export default function DashboardAssistantRoute() {
  const navItems = [
    { label: 'Home', href: '/dashboard/assistant', icon: Users },
    { label: 'My Tasks', href: '/dashboard/assistant/tasks', icon: FileText },
    { label: 'Notifications', href: '/dashboard/assistant/notifications', icon: Bell }
  ]

  const profile = {
    name: 'Assistant',
    role: 'Assistant',
    badge: 'ASSISTANT'
  }

  return (
    <DashboardLayout
      navItems={navItems}
      secondaryNavItems={[]}
      profile={profile}
      headerActions={null}
    >
      <div className='p-8 text-center text-muted-foreground'>
        <h2 className='text-2xl font-bold text-foreground'>Assistant Dashboard</h2>
        <p className='mt-2'>Dashboard for ASSISTANT role — coming soon.</p>
      </div>
    </DashboardLayout>
  )
}
