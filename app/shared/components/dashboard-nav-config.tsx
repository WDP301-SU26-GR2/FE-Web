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

function buildMangakaConfig(t: ReturnType<typeof useTranslation>['t']): DashboardNavConfig {
  return {
    navItems: [
      { label: t('nav.home'), href: '/dashboard/mangaka', icon: Home },
      { label: t('nav.mySeries'), href: '/dashboard/series', icon: BookOpen },
      { label: t('nav.studio'), href: '/dashboard/studio', icon: Pencil },
      { label: t('nav.assistantDirectory'), href: '/dashboard/assistants', icon: Users },
      { label: t('nav.ranking'), href: '/dashboard/rankings', icon: TrendingUp },
      { label: t('nav.contracts'), href: '/dashboard/contracts', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/notifications', icon: Bell }
    ],
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
    navItems: [
      { label: t('nav.home'), href: '/dashboard/assistant', icon: Home },
      { label: t('nav.myTasks'), href: '/dashboard/tasks', icon: ClipboardList },
      { label: t('nav.studio'), href: '/dashboard/studio', icon: Briefcase },
      { label: t('nav.invites'), href: '/dashboard/invites', icon: Mail },
      { label: t('nav.notifications'), href: '/dashboard/notifications', icon: Bell }
    ],
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
    navItems: [
      { label: t('nav.home'), href: '/dashboard/editor', icon: BookOpen },
      { label: t('nav.proposals'), href: '/dashboard/editor/proposals', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/editor/notifications', icon: Bell }
    ],
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
    navItems: [
      { label: t('nav.home'), href: '/dashboard/board', icon: BarChart3 },
      { label: t('nav.proposals'), href: '/dashboard/board/proposals', icon: FileText },
      { label: t('nav.notifications'), href: '/dashboard/board/notifications', icon: Bell }
    ],
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
    navItems: [
      { label: t('nav.home'), href: '/dashboard/admin', icon: Shield },
      { label: t('nav.users'), href: '/dashboard/admin/users', icon: Users },
      { label: t('nav.reports'), href: '/dashboard/admin/reports', icon: BarChart3 },
      { label: t('nav.notifications'), href: '/dashboard/admin/notifications', icon: Bell }
    ],
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
