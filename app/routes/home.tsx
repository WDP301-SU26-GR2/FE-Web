import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'

import { useAuth } from '~/features/auth/context/auth-context'
import { WelcomePage } from '~/features/welcome'
import { ROLE_DASHBOARD_PATH } from '~/shared/components'
import { BrandLogo } from '~/shared/components/brand-logo'
import { SITE } from '~/shared/config/site'

import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [{ title: SITE.name }, { name: 'description', content: SITE.description }]
}

function SplashScreen() {
  const { t } = useTranslation('common')

  return (
    <main className='flex min-h-screen items-center justify-center bg-background'>
      <div className='flex flex-col items-center gap-4'>
        <div className='flex items-center gap-3'>
          <BrandLogo className='h-12 w-12 rounded-xl' />
          <h1 className='text-3xl font-bold tracking-tight text-foreground'>{t('appName')}</h1>
        </div>

        {/* Animated spinner */}
        <div className='relative h-10 w-10'>
          <div className='absolute inset-0 animate-spin rounded-full border-[3px] border-border border-t-primary' />
        </div>

        <p className='text-sm text-muted-foreground'>{t('splashLoading')}</p>
      </div>
    </main>
  )
}

export default function Home() {
  const { status, session } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation('common')

  useEffect(() => {
    if (status !== 'authenticated') return

    // Map role code (from LoginResDtoOutputUserRole enum) -> dashboard path.
    // Su dung ROLE_DASHBOARD_PATH lam source of truth thay vi hard-code lai
    // de tranh sai key (vi du 'BOARD' vs 'BOARD_MEMBER').
    const role = session?.user?.role
    const dashboardPath = role ? ROLE_DASHBOARD_PATH[role] : undefined

    if (dashboardPath) {
      navigate(dashboardPath, { replace: true })
    } else {
      // Role unknown / unmapped — fall back to login.
      navigate('/login', { replace: true })
    }
  }, [status, session, navigate])

  // Hydrating from SSR — show splash to avoid flash of wrong content.
  if (status === 'idle') {
    return <SplashScreen />
  }

  // No valid session → show landing page.
  if (status === 'unauthenticated' || !session) {
    return <WelcomePage />
  }

  // Authenticated — just render nothing while redirect happens.
  return (
    <main className='flex min-h-screen items-center justify-center bg-background'>
      <p className='text-muted-foreground'>{t('splashLoading')}</p>
    </main>
  )
}
