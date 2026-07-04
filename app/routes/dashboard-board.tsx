import { BarChart3, FileText, Bell } from 'lucide-react'

import { DashboardLayout } from '~/shared/components'
import type { Route } from './+types/dashboard-board'

export function meta() {
  return [{ title: 'Board Dashboard - MangaStudio Pro' }]
}

export default function DashboardBoardRoute() {
  const navItems = [
    { label: 'Home', href: '/dashboard/board', icon: BarChart3 },
    { label: 'Proposals', href: '/dashboard/board/proposals', icon: FileText },
    { label: 'Notifications', href: '/dashboard/board/notifications', icon: Bell }
  ]

  const profile = {
    name: 'Board Member',
    role: 'Board',
    badge: 'BOARD_MEMBER'
  }

  return (
    <DashboardLayout
      navItems={navItems}
      secondaryNavItems={[]}
      profile={profile}
      headerActions={null}
    >
      <div className='p-8 text-center text-muted-foreground'>
        <h2 className='text-2xl font-bold text-foreground'>Board Dashboard</h2>
        <p className='mt-2'>Dashboard for BOARD_MEMBER role — coming soon.</p>
      </div>
    </DashboardLayout>
  )
}
