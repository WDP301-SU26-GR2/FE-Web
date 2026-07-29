import type { ReactNode } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'

import type { LoginResDtoOutputUserRole } from '~/api/model/auth/loginResDtoOutputUserRole'
import { useAuth } from '~/features/auth/context/auth-context'
import { ROLE_DASHBOARD_PATH } from './dashboard-nav-config'

export function RoleDashboardGuard({ role, children }: { role: LoginResDtoOutputUserRole; children: ReactNode }) {
  const { t } = useTranslation('common')
  const { status, session } = useAuth()
  const location = useLocation()

  if (status === 'idle') {
    return (
      <main className='flex min-h-screen items-center justify-center bg-background px-6 text-foreground'>
        <div className='w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm'>
          <span className='mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
            <ShieldCheck className='size-5' aria-hidden='true' />
          </span>
          <Loader2 className='mx-auto mt-4 size-5 animate-spin text-primary' aria-hidden='true' />
          <h1 className='mt-3 text-sm font-bold'>{t('authGuard.title')}</h1>
          <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('authGuard.description')}</p>
        </div>
      </main>
    )
  }

  if (status === 'unauthenticated' || !session) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to='/login' state={{ returnTo }} replace />
  }

  if (session.user.role !== role) {
    return <Navigate to={ROLE_DASHBOARD_PATH[session.user.role] ?? '/'} replace />
  }

  return children
}
