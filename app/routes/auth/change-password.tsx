import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useState, type FormEvent } from 'react'
import { Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { authControllerChangePassword } from '~/api/operations/auth/auth'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { useAuth } from '~/features/auth/context/auth-context'
import { cn } from '~/shared/lib/cn'
import { removeStorage } from '~/shared/lib/storage'
import { STORAGE_KEYS } from '~/shared/config/site'

const PASSWORD_MIN = 8

export function meta() {
  return [{ title: 'Đổi mật khẩu - MangaStudio Pro' }]
}

export default function ChangePasswordRoute() {
  const { t } = useTranslation('auth')
  const { logout } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passLength = newPassword.length >= PASSWORD_MIN
  const passUpper = /[A-Z]/.test(newPassword)
  const passLower = /[a-z]/.test(newPassword)
  const passNumber = /[0-9]/.test(newPassword)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (!currentPassword) {
      setValidationError(t('changePassword.errorCurrentRequired'))
      return
    }
    if (newPassword.length < PASSWORD_MIN) {
      setValidationError(t('changePassword.errorTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setValidationError(t('changePassword.errorMismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await authControllerChangePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword
      })

      // Clear stored tokens so AuthContext resets to unauthenticated
      removeStorage(STORAGE_KEYS.accessToken)
      removeStorage(STORAGE_KEYS.refreshToken)
      logout()

      toast.success(t('changePassword.success'))
      window.location.href = '/login'
    } catch (err) {
      setValidationError(extractApiErrorMessage(err, t('changePassword.errorGeneric')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-screen w-screen items-center justify-center bg-background p-4'>
      <div className='w-full max-w-md'>
        <div className='mb-8 text-center'>
          <h1 className='text-2xl font-bold'>{t('changePassword.title')}</h1>
          <p className='mt-2 text-sm text-muted-foreground'>{t('changePassword.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className='space-y-5 rounded-2xl border border-border bg-card p-8 shadow-2xl'>
          {validationError && (
            <div className='flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive'>
              <AlertCircle className='h-4 w-4 shrink-0' />
              <span>{validationError}</span>
            </div>
          )}

          {/* Current Password */}
          <div className='space-y-1'>
            <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('changePassword.currentLabel')}
            </label>
            <div className='relative'>
              <Lock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('changePassword.passwordPlaceholder')}
                disabled={isSubmitting}
                className='w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-12 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-60'
              />
              <button
                type='button'
                onClick={() => setShowCurrent(!showCurrent)}
                className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors'
              >
                {showCurrent ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className='space-y-1'>
            <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('changePassword.newLabel')}
            </label>
            <div className='relative'>
              <Lock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('changePassword.passwordPlaceholder')}
                disabled={isSubmitting}
                className='w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-12 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-60'
              />
              <button
                type='button'
                onClick={() => setShowNew(!showNew)}
                className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors'
              >
                {showNew ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
            {/* Requirements */}
            <div className='mt-2 grid grid-cols-2 gap-1.5 rounded-lg bg-muted/40 p-3 text-[11px] font-semibold text-muted-foreground'>
              <div className='flex items-center gap-1.5'>
                <span
                  className={cn('h-2 w-2 rounded-full transition-colors', passLength ? 'bg-emerald-500' : 'bg-border')}
                />
                <span>{t('register.passwordRequirementLength')}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span
                  className={cn('h-2 w-2 rounded-full transition-colors', passUpper ? 'bg-emerald-500' : 'bg-border')}
                />
                <span>{t('register.passwordRequirementUpper')}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span
                  className={cn('h-2 w-2 rounded-full transition-colors', passLower ? 'bg-emerald-500' : 'bg-border')}
                />
                <span>{t('register.passwordRequirementLower')}</span>
              </div>
              <div className='flex items-center gap-1.5'>
                <span
                  className={cn('h-2 w-2 rounded-full transition-colors', passNumber ? 'bg-emerald-500' : 'bg-border')}
                />
                <span>{t('register.passwordRequirementNumber')}</span>
              </div>
            </div>
          </div>

          {/* Confirm Password */}
          <div className='space-y-1'>
            <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('changePassword.confirmLabel')}
            </label>
            <div className='relative'>
              <Lock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('changePassword.passwordPlaceholder')}
                disabled={isSubmitting}
                className='w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-12 text-sm transition-all focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none disabled:opacity-60'
              />
              <button
                type='button'
                onClick={() => setShowConfirm(!showConfirm)}
                className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors'
              >
                {showConfirm ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
              </button>
            </div>
          </div>

          <button
            type='submit'
            disabled={isSubmitting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-all',
              'shadow-lg shadow-primary/25 cursor-pointer',
              'hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span>{t('changePassword.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('changePassword.submitButton')}</span>
                <ArrowRight className='h-4 w-4' />
              </>
            )}
          </button>

          <p className='text-center text-xs text-muted-foreground'>
            <Link to='/login' className='text-primary hover:underline'>
              {t('changePassword.backToLogin')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
