import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, Layers, Pencil } from 'lucide-react'

import { useLogin } from '~/features/auth/hooks/use-login'
import { cn } from '~/shared/lib/cn'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const { submit, isSubmitting } = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // Inline validation only — real auth errors are surfaced via toast
  // (see useLogin). Keeps the form responsive without blocking submit.
  const [validationError, setValidationError] = useState('')

  /** Route map for each role after login. */
  const ROLE_DASHBOARD: Record<string, string> = {
    MANGAKA: '/dashboard/mangaka',
    ASSISTANT: '/dashboard/assistant',
    EDITOR: '/dashboard/editor',
    BOARD_MEMBER: '/dashboard/board',
    SUPER_ADMIN: '/dashboard/admin'
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (!email) {
      setValidationError(t('login.errorEmailRequired'))
      return
    }
    if (!password) {
      setValidationError(t('login.errorPasswordRequired'))
      return
    }

    const result = await submit({ email, password })
    if (!result) return

    if (result.mustChangePassword) {
      navigate('/change-password')
      return
    }

    const target = ROLE_DASHBOARD[result.user.role] ?? '/dashboard/mangaka'
    navigate(target)
  }

  return (
    <div className='flex min-h-screen w-screen bg-background text-foreground transition-colors duration-300'>
      {/* Left side: branding and illustration (Hidden on mobile) */}
      <div className='relative hidden w-1/2 flex-col justify-between border-r border-border bg-card/30 p-12 lg:flex overflow-hidden'>
        {/* Decorative Grid Background */}
        <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35' />

        {/* Left Header */}
        <div className='relative z-10'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Pencil className='h-5 w-5' />
            </div>
            <span className='text-xl font-bold tracking-wider text-primary'>{t('login.brand')}</span>
          </div>
          <p className='mt-4 text-sm font-semibold tracking-wide text-primary/80'>{t('login.tagline')}</p>
        </div>

        {/* Left Features Info */}
        <div className='relative z-10 my-auto grid grid-cols-2 gap-4 max-w-md'>
          <div className='rounded-xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'>
            <Layers className='h-6 w-6 text-primary' />
            <h3 className='mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('login.featureWorkspace')}
            </h3>
            <p className='mt-1 text-sm font-semibold'>{t('login.featureWorkspaceDesc')}</p>
          </div>
          <div className='rounded-xl border border-border bg-card/60 p-5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'>
            <Sparkles className='h-6 w-6 text-primary' />
            <h3 className='mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('login.featureAiAssist')}
            </h3>
            <p className='mt-1 text-sm font-semibold'>{t('login.featureAiAssistDesc')}</p>
          </div>
        </div>

        {/* Left Illustration / Tablet Sketch */}
        <div className='relative z-10 mt-auto overflow-hidden rounded-xl border border-border/80 bg-background/50 shadow-2xl'>
          <img
            src='/login-tablet.png'
            alt={t('login.tabletAlt')}
            className='w-full object-cover max-h-[300px] opacity-85 transition-transform duration-500 hover:scale-105'
          />
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className='flex w-full flex-col justify-between p-8 sm:p-12 lg:w-1/2'>
        <div className='my-auto mx-auto w-full max-w-md'>
          {/* Form Header */}
          <div className='text-left'>
            <h1 className='text-2xl font-bold tracking-tight sm:text-3xl'>{t('login.title')}</h1>
            <p className='mt-2 text-sm text-muted-foreground'>{t('login.subtitle')}</p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className='mt-8 space-y-6'>
            {validationError && (
              <div className='flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
                <span className='font-semibold'>{validationError}</span>
              </div>
            )}

            <div className='space-y-4'>
              {/* Email Input */}
              <div className='space-y-1.5'>
                <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                  {t('login.emailLabel')}
                </label>
                <div className='relative'>
                  <Mail className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground/80' />
                  <input
                    type='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.emailPlaceholder')}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full rounded-lg border border-input bg-card/50 py-3 pl-11 pr-4 text-sm transition-all',
                      'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                      'disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('login.passwordLabel')}
                  </label>
                  <Link to='#' className='text-xs font-medium text-primary hover:underline'>
                    {t('login.forgotPassword')}
                  </Link>
                </div>
                <div className='relative'>
                  <Lock className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground/80' />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full rounded-lg border border-input bg-card/50 py-3 pl-11 pr-12 text-sm transition-all',
                      'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                      'disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                  />
                  <button
                    type='button'
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    {showPassword ? <EyeOff className='h-5 w-5' /> : <Eye className='h-5 w-5' />}
                  </button>
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button
              type='submit'
              disabled={isSubmitting}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all',
                'shadow-lg shadow-primary/25 cursor-pointer',
                'hover:opacity-90 active:scale-[0.98]',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>{t('login.loggingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('login.loginButton')}</span>
                  <ArrowRight className='h-4 w-4' />
                </>
              )}
            </button>
          </form>

          {/* Social Sign In */}
          <div className='mt-8 space-y-6'>
            <div className='relative flex items-center justify-center'>
              <div className='w-full border-t border-border' />
              <span className='absolute bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
                {t('login.orContinueWith')}
              </span>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <button
                type='button'
                disabled={isSubmitting}
                className='flex items-center justify-center gap-2 rounded-lg border border-border bg-card/40 py-2.5 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
              >
                {/* SVG for Google logo */}
                <svg className='h-4 w-4' viewBox='0 0 24 24' width='100%' height='100%'>
                  <path
                    fill='#EA4335'
                    d='M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.74 14.93 1 12 1 7.37 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.7 8.9 5.04 12 5.04z'
                  />
                  <path
                    fill='#4285F4'
                    d='M23.5 12.25c0-.82-.07-1.62-.22-2.39H12v4.54h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-2 3.42-4.94 3.42-8.6z'
                  />
                  <path
                    fill='#FBBC05'
                    d='M5.36 14.5c-.24-.72-.38-1.5-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.84 0 11.02 0 12.3s.54 3.46 1.5 5.4l3.86-3.2z'
                  />
                  <path
                    fill='#34A53'
                    d='M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.1 0-5.73-2.66-6.64-5.46L1.5 16.1C3.4 19.95 7.37 23 12 23z'
                  />
                </svg>
                <span>{t('login.googleButton')}</span>
              </button>
              <button
                type='button'
                disabled={isSubmitting}
                className='flex items-center justify-center gap-2 rounded-lg border border-border bg-card/40 py-2.5 text-sm font-semibold transition-all hover:bg-muted active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
              >
                <ShieldCheck className='h-4 w-4 text-primary' />
                <span>{t('login.publisherIdButton')}</span>
              </button>
            </div>

            <div className='text-center text-sm'>
              <span className='text-muted-foreground'>{t('login.noAccount')} </span>
              <Link to='/register' className='font-bold text-primary hover:underline'>
                {t('login.registerNow')}
              </Link>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className='mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:flex-row'>
          <div className='flex gap-4'>
            <Link to='#' className='hover:underline'>
              {t('login.footerTerms')}
            </Link>
            <Link to='#' className='hover:underline'>
              {t('login.footerPrivacy')}
            </Link>
          </div>
          <span>{t('login.version')}</span>
        </div>
      </div>
    </div>
  )
}
