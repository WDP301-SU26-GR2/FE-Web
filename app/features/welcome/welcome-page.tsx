import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { WelcomeHeader } from './components/welcome-header'

export function WelcomePage() {
  const { t } = useTranslation(['welcome', 'common'])

  return (
    <main className='relative min-h-screen overflow-hidden bg-background text-foreground'>
      <WelcomeHeader />

      {/* Hero Background - light mode: soft gradient, dark mode: deep navy */}
      <div className='absolute inset-0 z-0'>
        <div className='absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-[#0a1628] dark:via-[#0f1d32] dark:to-[#0a1628]' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-200/50 via-orange-100/20 to-transparent dark:from-primary/20 dark:via-transparent dark:to-transparent' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-amber-200/50 via-amber-100/20 to-transparent dark:from-sky-500/10 dark:via-transparent dark:to-transparent' />
        <div
          className='absolute inset-0 opacity-50 dark:opacity-30'
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        {/* Decorative elements */}
        <div className='absolute -right-20 top-20 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl dark:bg-primary/5' />
        <div className='absolute -left-20 bottom-20 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl dark:bg-sky-500/5' />
      </div>

      {/* Hero Content */}
      <section className='relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center'>
        <div className='max-w-4xl space-y-8'>
          {/* Main Heading */}
          <h1 className='text-4xl font-bold tracking-tight text-foreground dark:text-white md:text-5xl lg:text-6xl'>
            <span className='bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 bg-clip-text text-transparent dark:from-white dark:via-white/90 dark:to-white/70'>
              {t('heroTitle')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className='mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl'>{t('heroSubtitle')}</p>

          {/* CTA Buttons */}
          <div className='flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row'>
            <Link
              to='/register'
              className='group relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:bg-primary/90 active:scale-95'
            >
              {t('ctaStart')}
              <svg
                className='h-4 w-4 transition-transform group-hover:translate-x-1'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 8l4 4m0 0l-4 4m4-4H3' />
              </svg>
            </Link>
            <Link
              to='/login'
              className='group inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-border bg-card px-8 text-base font-semibold text-foreground transition-all hover:border-primary hover:bg-primary/5 active:scale-95 dark:border-white/30 dark:bg-white/10 dark:text-white dark:hover:border-white/50 dark:hover:bg-white/20'
            >
              {t('ctaLogin')}
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce'>
          <svg
            className='h-6 w-6 text-muted-foreground dark:text-white/40'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
          </svg>
        </div>
      </section>

      {/* Footer */}
      <footer className='absolute bottom-0 z-10 w-full border-t border-border bg-background/80 backdrop-blur-sm dark:border-white/10 dark:bg-black/20'>
        <div className='mx-auto flex max-w-7xl items-center justify-between px-6 py-4'>
          {/* Brand */}
          <div className='flex items-center gap-2'>
            <span className='text-lg font-bold text-foreground dark:text-white'>{t('appName')}</span>
            <span className='text-sm text-muted-foreground dark:text-white/40'>{t('layout.brandPro')}</span>
          </div>

          {/* Copyright */}
          <p className='text-sm text-muted-foreground dark:text-white/40'>
            {t('footerCopyright', { year: new Date().getFullYear(), appName: t('appName') })}
          </p>

          {/* Links */}
          <nav className='flex items-center gap-6 text-sm'>
            <a
              href='#'
              className='text-muted-foreground transition-colors hover:text-foreground dark:text-white/50 dark:hover:text-white'
            >
              {t('footerTerms')}
            </a>
            <a
              href='#'
              className='text-muted-foreground transition-colors hover:text-foreground dark:text-white/50 dark:hover:text-white'
            >
              {t('footerPrivacy')}
            </a>
            <a
              href='#'
              className='text-muted-foreground transition-colors hover:text-foreground dark:text-white/50 dark:hover:text-white'
            >
              {t('footerContact')}
            </a>
            <a
              href='#'
              className='text-muted-foreground transition-colors hover:text-foreground dark:text-white/50 dark:hover:text-white'
            >
              {t('footerDocs')}
            </a>
          </nav>
        </div>
      </footer>
    </main>
  )
}
