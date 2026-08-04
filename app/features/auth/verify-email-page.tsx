import { useEffect, useState, useSyncExternalStore, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { authControllerSendOtp, authControllerVerifyEmail } from '~/api/operations/auth/auth'
import { SendOtpBodyDtoPurpose } from '~/api/model/auth'
import { STORAGE_KEYS } from '~/shared/config/site'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { readStorage, removeStorage } from '~/shared/lib/storage'

const RESEND_COOLDOWN = 60
const subscribeToStorage = () => () => undefined

function getPendingEmail() {
  return readStorage(STORAGE_KEYS.pendingRegisterEmail)
}

export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const email = useSyncExternalStore(subscribeToStorage, getPendingEmail, () => null)
  const hasHydrated = useSyncExternalStore(
    subscribeToStorage,
    () => true,
    () => false
  )
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    if (hasHydrated && !email) {
      navigate('/login', { replace: true })
    }
  }, [email, hasHydrated, navigate])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault()
    if (!email || code.length !== 6) {
      toast.error(t('verifyEmail.invalidCode'))
      return
    }

    setIsVerifying(true)
    try {
      await authControllerVerifyEmail({ email, code })
      removeStorage(STORAGE_KEYS.pendingRegisterEmail)
      toast.success(t('verifyEmail.success'))
      navigate('/login')
    } catch (error) {
      toast.error(extractApiErrorMessage(error, t('verifyEmail.verifyError')))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return
    setIsResending(true)
    try {
      await authControllerSendOtp({ email, purpose: SendOtpBodyDtoPurpose.REGISTER })
      setResendCooldown(RESEND_COOLDOWN)
      toast.success(t('verifyEmail.resendSuccess'))
    } catch (error) {
      toast.error(extractApiErrorMessage(error, t('verifyEmail.resendError')))
    } finally {
      setIsResending(false)
    }
  }

  if (!email) return null

  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-4 text-foreground'>
      <section className='w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-lg'>
        <Mail className='h-10 w-10 text-primary' />
        <h1 className='mt-5 text-2xl font-bold'>{t('verifyEmail.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('verifyEmail.subtitle', { email })}</p>

        <form onSubmit={handleVerify} className='mt-6 space-y-5'>
          <div className='space-y-1.5'>
            <label
              htmlFor='verification-code'
              className='text-xs font-bold uppercase tracking-wider text-muted-foreground'
            >
              {t('verifyEmail.codeLabel')}
            </label>
            <input
              id='verification-code'
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode='numeric'
              autoComplete='one-time-code'
              maxLength={6}
              disabled={isVerifying}
              className='w-full rounded-lg border border-input bg-background px-4 py-3 text-center text-xl font-bold tracking-[0.5em] outline-none transition focus:border-primary focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
            />
          </div>
          <button
            type='submit'
            disabled={isVerifying || code.length !== 6}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isVerifying && <Loader2 className='h-4 w-4 animate-spin' />}
            {t(isVerifying ? 'verifyEmail.verifying' : 'verifyEmail.verifyButton')}
          </button>
        </form>

        <div className='mt-5 text-center text-sm text-muted-foreground'>
          <button
            type='button'
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className='font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60'
          >
            {resendCooldown > 0
              ? t('verifyEmail.resendIn', { seconds: resendCooldown })
              : t(isResending ? 'verifyEmail.resending' : 'verifyEmail.resendButton')}
          </button>
        </div>

        <Link to='/login' className='mt-6 block text-center text-sm font-medium text-primary hover:underline'>
          {t('verifyEmail.backToLogin')}
        </Link>
      </section>
    </main>
  )
}
