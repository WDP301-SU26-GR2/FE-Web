import { Shield, Users, BarChart3, Bell } from 'lucide-react'

import { DashboardLayout } from '~/shared/components'
import type { Route } from './+types/dashboard-admin'

export function meta() {
  return [{ title: 'Admin Dashboard - MangaStudio Pro' }]
}

export default function DashboardAdminRoute() {
  const navItems = [
    { label: 'Home', href: '/dashboard/admin', icon: Shield },
    { label: 'Users', href: '/dashboard/admin/users', icon: Users },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: BarChart3 },
    { label: 'Notifications', href: '/dashboard/admin/notifications', icon: Bell }
  ]

  const profile = {
    name: 'Super Admin',
    role: 'Admin',
    badge: 'SUPER_ADMIN'
  }

  return (
    <DashboardLayout
      navItems={navItems}
      secondaryNavItems={[]}
      profile={profile}
      headerActions={null}
    >
      <div className='p-8 text-center text-muted-foreground'>
        <h2 className='text-2xl font-bold text-foreground'>Admin Dashboard</h2>
        <p className='mt-2'>Dashboard for SUPER_ADMIN role — coming soon.</p>
      </div>
    </DashboardLayout>
  )
}
