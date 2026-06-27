import { BookOpen, FileText, Bell, HelpCircle } from 'lucide-react'

import { DashboardLayout } from '~/shared/components'
import type { Route } from './+types/dashboard-editor'

export function meta() {
  return [{ title: 'Editor Dashboard - MangaStudio Pro' }]
}

export default function DashboardEditorRoute() {
  const navItems = [
    { label: 'Home', href: '/dashboard/editor', icon: BookOpen },
    { label: 'Proposals', href: '/dashboard/editor/proposals', icon: FileText },
    { label: 'Notifications', href: '/dashboard/editor/notifications', icon: Bell }
  ]

  const profile = {
    name: 'Editor',
    role: 'Editor',
    badge: 'EDITOR'
  }

  return (
    <DashboardLayout
      navItems={navItems}
      secondaryNavItems={[]}
      profile={profile}
      headerActions={null}
    >
      <div className='p-8 text-center text-muted-foreground'>
        <h2 className='text-2xl font-bold text-foreground'>Editor Dashboard</h2>
        <p className='mt-2'>Dashboard for EDITOR role — coming soon.</p>
      </div>
    </DashboardLayout>
  )
}
