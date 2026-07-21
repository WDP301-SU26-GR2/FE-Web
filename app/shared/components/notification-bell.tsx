import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'

import { useAuth } from '~/features/auth/context/auth-context'
import { useUnreadNotifications, notificationsPathForRole } from '~/shared/hooks/use-unread-notifications'

/**
 * Top-bar notification bell with real-time unread badge.
 *
 * - Drives `unreadCount` via `useUnreadNotifications` (25s polling — §0.7).
 * - Renders a red dot when `unreadCount > 0`. The dot uses `aria-label` so
 *   screen readers announce the pending count.
 * - Click navigates to the role-specific notifications page.
 *
 * Used inside `DashboardLayout` for all roles that have a notifications
 * surface. Roles without one (currently SUPER_ADMIN) get a no-op button
 * that the user simply can't click through — that's intentional: the bell
 * stays visually consistent across the dashboard.
 *
 * NOTE: hook-based polling is suspended automatically while the tab is
 * hidden (React 19's effect scheduler) and resumes on focus — combined with
 * the 25s timer this is enough "real-time" for a notification badge.
 */
export function NotificationBell() {
  const { t } = useTranslation('common')
  const { session } = useAuth()
  const role = session?.user?.role
  const target = notificationsPathForRole(role)

  const navigate = useNavigate()

  // Polling is on for every authenticated user (any role). The endpoint is
  // role-agnostic and scope is enforced on the BE — see FE-API-Guide-v3 §14.
  const { unreadCount } = useUnreadNotifications({
    enabled: Boolean(session),
    pollIntervalMs: 25_000
  })

  const hasUnread = unreadCount > 0

  const onClick = () => {
    if (target) navigate(target)
  }

  const label = hasUnread
    ? t('layout.notificationsWithCount', { count: unreadCount })
    : t('layout.notifications')

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={!target}
      aria-label={label}
      title={label}
      className='relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60'
    >
      <Bell className='h-5 w-5' />
      {hasUnread ? (
        <span
          aria-hidden='true'
          className='absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-card'
        />
      ) : null}
    </button>
  )
}
