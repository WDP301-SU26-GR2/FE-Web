import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { authControllerForgotPassword, authControllerSendOtp } from '~/api/operations/auth/auth'
import { BrandLogo } from '~/shared/components/brand-logo'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { useOtpCooldown } from '~/shared/hooks'
import { Button } from '~/shared/ui'

export function meta() {
  return [{ title: 'Reset Password - MangakaStudio Pro' }]
}

export default function ForgotPasswordRoute() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otpSent, setOtpSent] = useState(false)
  const otpCooldown = useOtpCooldown()

  const sendOtp = async () => {
    if (otpCooldown.isCoolingDown) return
    const normalizedEmail = email.trim()
    if (!normalizedEmail) {
      setError(t('forgotPassword.errors.emailRequired'))
      return
    }
    setError(null)
    setIsSendingOtp(true)
    try {
      await authControllerSendOtp({ email: normalizedEmail, purpose: 'FORGOT_PASSWORD' })
      setOtpSent(true)
      otpCooldown.start()
      toast.success(t('forgotPassword.otpSent'))
    } catch (cause) {
      setError(extractApiErrorMessage(cause, t('forgotPassword.errors.otpFailed')))
    } finally {
      setIsSendingOtp(false)
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!email.trim() || code.trim().length !== 6) {
      setError(t('forgotPassword.errors.incomplete'))
      return
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,100}$/.test(newPassword)) {
      setError(t('forgotPassword.errors.passwordPolicy'))
      return
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('forgotPassword.errors.passwordMismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await authControllerForgotPassword({
        email: email.trim(),
        code: code.trim(),
        newPassword,
        confirmNewPassword
      })
      toast.success(t('forgotPassword.success'))
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(extractApiErrorMessage(cause, t('forgotPassword.errors.resetFailed')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground'>
      <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-primary),transparent_34%)] opacity-[0.08]' />
      <section className='relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8'>
        <div className='flex items-center gap-3'>
          <BrandLogo className='size-10 rounded-xl' />
          <div>
            <p className='text-xs font-bold uppercase tracking-widest text-primary'>{t('login.brand')}</p>
            <h1 className='text-2xl font-bold tracking-tight'>{t('forgotPassword.title')}</h1>
          </div>
        </div>
        <p className='mt-4 text-sm leading-6 text-muted-foreground'>{t('forgotPassword.description')}</p>

        <div className='mt-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground'>
          <ShieldCheck className='mt-0.5 size-4 shrink-0 text-primary' />
          <span>{t('forgotPassword.securityHint')}</span>
        </div>

        <form className='mt-6 space-y-4' onSubmit={submit}>
          <div className='space-y-1.5'>
            <label htmlFor='forgot-email' className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('forgotPassword.emailLabel')}
            </label>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <div className='relative min-w-0 flex-1'>
                <Mail className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
                <input
                  id='forgot-email'
                  type='email'
                  autoComplete='email'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className='w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring'
                />
              </div>
              <Button
                type='button'
                variant='outline'
                disabled={isSendingOtp || isSubmitting || otpCooldown.isCoolingDown}
                onClick={() => void sendOtp()}
              >
                {isSendingOtp && <Loader2 className='size-4 animate-spin' />}
                {otpCooldown.isCoolingDown
                  ? `${t('forgotPassword.resendOtp')} (${otpCooldown.remainingSeconds}s)`
                  : otpSent
                    ? t('forgotPassword.resendOtp')
                    : t('forgotPassword.sendOtp')}
              </Button>
            </div>
          </div>

          <div className='space-y-1.5'>
            <label htmlFor='forgot-code' className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('forgotPassword.codeLabel')}
            </label>
            <div className='relative'>
              <KeyRound className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <input
                id='forgot-code'
                inputMode='numeric'
                autoComplete='one-time-code'
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t('forgotPassword.codePlaceholder')}
                className='w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm tracking-[0.35em] outline-none focus:border-primary focus:ring-2 focus:ring-ring'
              />
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <PasswordField
              id='forgot-new-password'
              label={t('forgotPassword.newPasswordLabel')}
              value={newPassword}
              show={showPassword}
              onChange={setNewPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />
            <PasswordField
              id='forgot-confirm-password'
              label={t('forgotPassword.confirmPasswordLabel')}
              value={confirmNewPassword}
              show={showPassword}
              onChange={setConfirmNewPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />
          </div>
          <p className='text-xs leading-5 text-muted-foreground'>{t('forgotPassword.passwordHint')}</p>

          {error && (
            <p
              role='alert'
              className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'
            >
              {error}
            </p>
          )}

          <Button className='w-full' type='submit' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='size-4 animate-spin' />}
            {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </Button>
        </form>

        <Link
          to='/login'
          className='mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline'
        >
          <ArrowLeft className='size-4' />
          {t('forgotPassword.backToLogin')}
        </Link>
      </section>
    </main>
  )
}

function PasswordField({
  id,
  label,
  value,
  show,
  onChange,
  onToggle
}: {
  id: string
  label: string
  value: string
  show: boolean
  onChange: (value: string) => void
  onToggle: () => void
}) {
  const { t } = useTranslation('auth')
  return (
    <div className='space-y-1.5'>
      <label htmlFor={id} className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        {label}
      </label>
      <div className='relative'>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete='new-password'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className='w-full rounded-lg border border-input bg-background py-2.5 pl-3 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring'
        />
        <button
          type='button'
          onClick={onToggle}
          aria-label={show ? t('forgotPassword.hidePassword') : t('forgotPassword.showPassword')}
          className='absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
        >
          {show ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
        </button>
      </div>
    </div>
  )
}
