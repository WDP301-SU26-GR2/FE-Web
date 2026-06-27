import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Search, Bell, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react'

import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  secondaryNavItems?: NavItem[]
  profile: {
    name: string
    role: string
    avatarUrl?: string
    badge?: string
  }
  headerActions?: ReactNode
}

export function DashboardLayout({
  children,
  navItems,
  secondaryNavItems = [],
  profile,
  headerActions
}: DashboardLayoutProps) {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header */}
        <div className='flex h-16 items-center justify-between border-b border-border px-6'>
          <div className='flex flex-col'>
            <span className='text-lg font-bold tracking-wider text-primary'>MangaStudio Pro</span>
            <span className='text-[10px] uppercase tracking-widest text-muted-foreground'>Production Environment</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className='rounded-md p-1 hover:bg-muted lg:hidden'
            aria-label='Close menu'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className='flex-1 space-y-1 overflow-y-auto px-4 py-6'>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <div className='flex items-center gap-3'>
                  <Icon className='h-5 w-5 shrink-0' />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className='h-4 w-4 shrink-0' />}
              </Link>
            )
          })}

          {secondaryNavItems.length > 0 && (
            <div className='pt-6'>
              <div className='mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60'>
                Support & Actions
              </div>
              <div className='space-y-1'>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Icon className='h-4.5 w-4.5 shrink-0' />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
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
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className='h-full w-full object-cover' />
                ) : (
                  <div className='flex h-full w-full items-center justify-center font-bold text-muted-foreground uppercase bg-primary/10 text-primary'>
                    {profile.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>{profile.name}</p>
                <div className='flex items-center gap-1.5'>
                  <span className='truncate text-[11px] text-muted-foreground uppercase font-medium'>
                    {profile.role}
                  </span>
                  {profile.badge && (
                    <span className='inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-primary uppercase'>
                      {profile.badge}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Link
              to='/login'
              className='rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0'
              aria-label='Sign Out'
            >
              <LogOut className='h-5 w-5' />
            </Link>
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
            aria-label='Open menu'
          >
            <Menu className='h-6 w-6' />
          </button>

          {/* Search bar */}
          <div className='relative hidden w-96 lg:block'>
            <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <input
              type='text'
              placeholder='Search series, manuscripts, or assets...'
              className='w-full rounded-md border border-input bg-background/50 py-1.5 pl-10 pr-4 text-sm transition-all focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none'
            />
          </div>

          {/* Right Actions */}
          <div className='flex items-center gap-4'>
            <button
              className='relative rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors'
              aria-label='Notifications'
            >
              <Bell className='h-5 w-5' />
              <span className='absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card' />
            </button>
            <button
              className='rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors animate-spin-hover'
              aria-label='Settings'
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
