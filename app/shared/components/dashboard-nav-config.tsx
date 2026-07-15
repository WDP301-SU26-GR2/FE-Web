import type { ReactNode } from 'react'
import {
  Home,
  BookOpen,
  Pencil,
  Users,
  TrendingUp,
  FileText,
  Bell,
  BarChart3,
  Plus,
  Shield,
  ClipboardList,
  Briefcase,
  Mail
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { NavItem } from './dashboard-layout'
import { LoginResDtoOutputUserRole } from '~/api/model/auth/loginResDtoOutputUserRole'

/**
 * Internal shorthand cho dashboard layout. KHONG nham lan voi
 * LoginResDtoOutputUserRole (BE enum, BOARD_MEMBER).
 * Luon di qua ROLE_DASHBOARD_PATH de lay path tu role code that.
 */
export type DashboardRole = 'MANGAKA' | 'ASSISTANT' | 'EDITOR' | 'BOARD' | 'SUPER_ADMIN'

export interface DashboardNavConfig {
  navItems: NavItem[]
  profile: { name: string; role: string; badge: string }
  headerActions?: ReactNode
}

export function useDashboardNavConfig(role: DashboardRole): DashboardNavConfig {
  const { t } = useTranslation('common')

  switch (role) {
    case 'MANGAKA':
      return buildMangakaConfig(t)
    case 'ASSISTANT':
      return buildAssistantConfig(t)
    case 'EDITOR':
      return buildEditorConfig(t)
    case 'BOARD':
      return buildBoardConfig(t)
    case 'SUPER_ADMIN':
      return buildAdminConfig(t)
  }
}

/**
 * Với mỗi item trong navItems:
 * - Nếu có item khác nằm dưới `href` (tức là ancestor) → đánh `endsHere: true`
 *   để chỉ active khi pathname khớp chính xác href. Tránh ăn active của các
 *   sub-page (vd Home `/dashboard/mangaka` không highlight khi user ở
 *   `/dashboard/mangaka/series`).
 * - Nếu không có item nào nằm dưới (leaf cuối) → giữ prefix match để highlight
 *   cả khi drill xuống detail (vd `/dashboard/mangaka/series/abc` vẫn highlight
 *   "My Series"). An toàn vì không có nav item nào "sâu hơn" nó.
 */
function annotateAncestorsEndHere(items: NavItem[]): NavItem[] {
  return items.map((item) => {
    const hasChild = items.some(
      (other) => other.href !== item.href && other.href.startsWith(`${item.href}/`)
    )
    return hasChild ? { ...item, endsHere: true } : item
  })
}

function buildMangakaConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: annotateAncestorsEndHere([
      { label: t('nav.home'), href: '/dashboard/mangaka', icon: Home },
      { label: t('nav.mySeries'), href: '/dashboard/mangaka/series', icon: BookOpen },
      { label: t('nav.studio'), href: '/dashboard/mangaka/studio', icon: Pencil },
      { label: t('nav.assistantDirectory'), href: '/dashboard/mangaka/assistants', icon: Users },
      { label: t('nav.ranking'), href: '/dashboard/mangaka/rankings', icon: TrendingUp },
      { label: t('nav.contracts'), href: '/dashboard/mangaka/contracts', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/mangaka/notifications', icon: Bell }
    ]),
    profile: {
      name: t('profile.mangakaName'),
      role: t('profile.mangakaRole'),
      badge: t('profile.mangakaBadge')
    },
    headerActions: (
      <button className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95 transition-opacity shadow cursor-pointer'>
        <Plus className='h-4 w-4' />
        <span>{t('dashboard.newChapter')}</span>
      </button>
    )
  }
}

function buildAssistantConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: annotateAncestorsEndHere([
      { label: t('nav.home'), href: '/dashboard/assistant', icon: Home },
      { label: t('nav.myTasks'), href: '/dashboard/assistant/tasks', icon: ClipboardList },
      { label: t('nav.studio'), href: '/dashboard/assistant/studio', icon: Briefcase },
      { label: t('nav.invites'), href: '/dashboard/assistant/invites', icon: Mail },
      { label: t('nav.notifications'), href: '/dashboard/assistant/notifications', icon: Bell }
    ]),
    profile: {
      name: t('profile.assistantName'),
      role: t('profile.assistantRole'),
      badge: t('profile.assistantBadge')
    },
    headerActions: null
  }
}

function buildEditorConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: annotateAncestorsEndHere([
      { label: t('nav.home'), href: '/dashboard/editor', icon: BookOpen },
      { label: t('nav.proposals'), href: '/dashboard/editor/proposals', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/editor/notifications', icon: Bell }
    ]),
    profile: {
      name: t('profile.editorName'),
      role: t('profile.editorRole'),
      badge: t('profile.editorBadge')
    },
    headerActions: null
  }
}

function buildBoardConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: annotateAncestorsEndHere([
      { label: t('nav.home'), href: '/dashboard/board', icon: BarChart3 },
      { label: t('nav.proposals'), href: '/dashboard/board/proposals', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/board/notifications', icon: Bell }
    ]),
    profile: {
      name: t('profile.boardName'),
      role: t('profile.boardRole'),
      badge: t('profile.boardBadge')
    },
    headerActions: null
  }
}

function buildAdminConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: annotateAncestorsEndHere([
      { label: t('nav.home'), href: '/dashboard/admin', icon: Shield },
      { label: t('nav.users'), href: '/dashboard/admin/users', icon: Users },
      { label: t('nav.reports'), href: '/dashboard/admin/reports', icon: BarChart3 },
      { label: t('nav.notifications'), href: '/dashboard/admin/notifications', icon: Bell }
    ]),
    profile: {
      name: t('profile.adminName'),
      role: t('profile.adminRole'),
      badge: t('profile.adminBadge')
    },
    headerActions: null
  }
}

/** Mapping role (BE enum LoginResDtoOutputUserRole) -> dashboard root path.
 *  Dung cho home redirect. Bao gom ca BOARD_MEMBER (BE) vi key BE tra ve.
 */
export const ROLE_DASHBOARD_PATH: Record<LoginResDtoOutputUserRole, string> = {
  [LoginResDtoOutputUserRole.MANGAKA]: '/dashboard/mangaka',
  [LoginResDtoOutputUserRole.ASSISTANT]: '/dashboard/assistant',
  [LoginResDtoOutputUserRole.EDITOR]: '/dashboard/editor',
  [LoginResDtoOutputUserRole.BOARD_MEMBER]: '/dashboard/board',
  [LoginResDtoOutputUserRole.SUPER_ADMIN]: '/dashboard/admin'
}
