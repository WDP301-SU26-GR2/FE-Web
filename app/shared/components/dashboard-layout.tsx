import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Search, Settings, LogOut, Menu, X, ChevronRight, Loader2 } from 'lucide-react'

import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { NotificationBell } from './notification-bell'
import { SignedImage } from './signed-image'
import { useLogout } from '~/features/auth/hooks/use-logout'
import { useAuth } from '~/features/auth/context/auth-context'
import { useUnreadNotifications } from '~/shared/hooks/use-unread-notifications'
import { useSidebarProfile } from '~/shared/hooks/use-sidebar-profile'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /**
   * Khi `true`, item chỉ active khi pathname khớp CHÍNH XÁC với `href`.
   * Dùng cho các item là ancestor của item khác trong nav (vd Home
   * `/dashboard/mangaka` — không muốn ăn active khi user đang ở
   * `/dashboard/mangaka/series`).
   *
   * `useDashboardNavConfig` tự suy ra flag này: nếu có item khác nằm dưới
   * `href` (tức là ancestor) → `endsHere: true`. Nếu không (leaf) → prefix
   * match bình thường để highlight cả detail sub-route.
   */
  endsHere?: boolean
  /**
   * Hiển thị một chấm tròn (unread indicator) bên phải label.
   * Dùng cho nav item thông báo khi có thông báo chưa đọc.
   */
  badge?: boolean
}

export interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  /** Fallback profile data (name, role label) from nav config. Real data loaded via API. */
  profileFallback: {
    name: string
    role: string
    badge?: string
  }
  headerActions?: ReactNode
}

/**
 * Active state cho nav item:
 * - Nếu item có `endsHere: true` → chỉ active khi pathname khớp CHÍNH XÁC href.
 *   Áp dụng cho ancestor items (vd Home `/dashboard/mangaka`) để tránh ăn active
 *   khi user đang ở sub-page.
 * - Ngược lại (mặc định, leaf) → dùng prefix match: '/dashboard/mangaka/series/abc'
 *   sẽ highlight item "My Series" (href='/dashboard/mangaka/series'). Tránh exact
 *   match làm mất highlight khi drill xuống detail.
 */
function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.endsHere) return item.href === pathname
  if (item.href === pathname) return true
  if (item.href === '/') return false
  return pathname.startsWith(`${item.href}/`)
}

export function DashboardLayout({ children, navItems, profileFallback, headerActions }: DashboardLayoutProps) {
  const { t } = useTranslation('common')
  const location = useLocation()
  const navigate = useNavigate()
  const { logout: handleLogout, isLoggingOut } = useLogout()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { session } = useAuth()
  const { profile: realProfile, isLoading: isProfileLoading } = useSidebarProfile()

  // Polling badge: drives the dot on the Notifications nav item.
  // Enabled for any authenticated user; silently fails if no role surface.
  const { unreadCount } = useUnreadNotifications({
    enabled: Boolean(session),
    pollIntervalMs: 25_000
  })

  // Use real profile data from API, fallback to nav config defaults
  const displayName = realProfile?.displayName ?? profileFallback.name
  const avatarKey = realProfile?.avatar ?? null
  const roleLabel = realProfile?.role ? t(`roleEnum.${realProfile.role}`, { defaultValue: realProfile.role }) : profileFallback.role
  const statusBadge = realProfile?.status === 'ACTIVE' ? null : realProfile?.status

  // The authenticated user's role comes from the persisted session (BE enum,
  // e.g. "MANGAKA"/"ASSISTANT").
  //
  // Only Mangaka + Assistant have a `/me/*-profile` endpoint today; for other
  // roles the Settings button is disabled.
  const settingsHref = (() => {
    const r = session?.user?.role
    if (r === 'MANGAKA') return '/dashboard/mangaka/profile'
    if (r === 'ASSISTANT') return '/dashboard/assistant/profile'
    if (r === 'EDITOR') return '/dashboard/editor/profile'
    return null
  })()

  return (
    <div className='flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300'>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden'
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className='flex h-16 items-center justify-between border-b border-border px-6'>
          <div className='flex flex-col'>
            <span className='text-lg font-bold tracking-wider text-primary'>{t('layout.brand')}</span>
            <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>
              {t('layout.productionEnvironment')}
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className='rounded-md p-1 hover:bg-muted lg:hidden'
            aria-label={t('layout.closeMenu')}
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className='flex-1 space-y-1 overflow-y-auto px-4 py-6'>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = isItemActive(item, location.pathname)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <Icon className='h-5 w-5 shrink-0' />
                  <span>{item.label}</span>
                </div>
                <div className='flex items-center gap-1.5'>
                  {item.badge && unreadCount > 0 && (
                    <span
                      aria-hidden='true'
                      className='h-2 w-2 rounded-full bg-destructive'
                    />
                  )}
                  {isActive && <ChevronRight className='h-4 w-4 shrink-0' />}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* Theme & Language switcher controls inside Sidebar */}
        <div className='flex items-center justify-between border-t border-border px-6 py-3 bg-muted/20'>
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        {/* Sidebar Footer Profile */}
        <div className='border-t border-border p-4 bg-muted/30'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-primary/25 bg-muted'>
                {isProfileLoading ? (
                  <div className='flex h-full w-full items-center justify-center'>
                    <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                  </div>
                ) : avatarKey ? (
                  <SignedImage
                    r2Key={avatarKey}
                    alt={displayName}
                    aspectClassName='h-full w-full'
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center font-bold text-muted-foreground uppercase bg-primary/10 text-primary'>
                    {displayName.charAt(0)}
                  </div>
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>{displayName}</p>
                <div className='flex items-center gap-1.5'>
                  <span className='truncate text-[11px] text-muted-foreground uppercase font-medium'>
                    {roleLabel}
                  </span>
                  {statusBadge && (
                    <span className='inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-destructive uppercase'>
                      {statusBadge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type='button'
              onClick={() => void handleLogout()}
              disabled={isLoggingOut}
              className='rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0 disabled:cursor-not-allowed disabled:opacity-60'
              aria-label={t('layout.signOut')}
              title={t('layout.signOut')}
            >
              {isLoggingOut ? <Loader2 className='h-5 w-5 animate-spin' /> : <LogOut className='h-5 w-5' />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Body */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Topbar Header */}
        <header className='flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6'>
          {/* Mobile hamburger menu */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className='rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden'
            aria-label={t('layout.openMenu')}
          >
            <Menu className='h-6 w-6' />
          </button>

          {/* Search bar */}
          <div className='relative hidden w-96 lg:block'>
            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <input
              type='text'
              placeholder={t('layout.searchPlaceholder')}
              className='w-full rounded-md border border-input bg-background/50 py-1.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none'
            />
          </div>

          {/* Right Actions */}
          <div className='flex items-center gap-4'>
            <NotificationBell />
            <button
              className='rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors animate-spin-hover'
              aria-label={t('layout.settings')}
              title={t('layout.settings')}
              onClick={() => {
                if (settingsHref) navigate(settingsHref)
              }}
              disabled={!settingsHref}
            >
              <Settings className='h-5 w-5' />
            </button>
            <div className='h-6 w-px bg-border hidden sm:block' />
            <div className='flex items-center gap-2'>{headerActions}</div>
          </div>
        </header>

        {/* Content main view */}
        <main className='flex-1 overflow-y-auto bg-background/50 p-6 md:p-8'>{children}</main>
      </div>
    </div>
  )
}
