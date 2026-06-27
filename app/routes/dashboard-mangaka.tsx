import { Home, BookOpen, Pencil, Users, TrendingUp, FileText, Bell, Upload, HelpCircle, Plus } from 'lucide-react'

import { DashboardLayout } from '~/shared/components'
import { MangakaDashboard } from '~/features/mangaka'
import type { Route } from './+types/dashboard-mangaka'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Mangaka Dashboard - MangakaStudio Pro' },
    { name: 'description', content: 'Bảng điều khiển sản xuất manga' }
  ]
}

export default function DashboardMangakaRoute() {
  const navItems = [
    { label: 'Home', href: '/dashboard/mangaka', icon: Home },
    { label: 'My Series', href: '/dashboard/series', icon: BookOpen },
    { label: 'Studio', href: '/dashboard/studio', icon: Pencil },
    { label: 'Assistant Directory', href: '/dashboard/assistants', icon: Users },
    { label: 'Ranking', href: '/dashboard/rankings', icon: TrendingUp },
    { label: 'Contracts', href: '/dashboard/contracts', icon: FileText },
    { label: 'Notifications', href: '/dashboard/notifications', icon: Bell }
  ]

  const secondaryNavItems = [
    { label: 'Upload Batch', href: '/dashboard/upload', icon: Upload },
    { label: 'Editor Support', href: '/dashboard/support', icon: HelpCircle }
  ]

  const profile = {
    name: 'Mangaka Profile',
    role: 'Creator',
    badge: 'PRO LICENSE'
  }

  const headerActions = (
    <button className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95 transition-opacity shadow cursor-pointer'>
      <Plus className='h-4 w-4' />
      <span>New Chapter</span>
    </button>
  )

  return (
    <DashboardLayout
      navItems={navItems}
      secondaryNavItems={secondaryNavItems}
      profile={profile}
      headerActions={headerActions}
    >
      <MangakaDashboard />
    </DashboardLayout>
  )
}