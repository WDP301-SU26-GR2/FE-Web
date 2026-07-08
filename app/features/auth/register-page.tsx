import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  User,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Pencil,
  Users,
  AlertCircle,
  Loader2
} from 'lucide-react'

import { useRegister } from '~/features/auth/hooks/use-register'
import { cn } from '~/shared/lib/cn'
import { STORAGE_KEYS } from '~/shared/config/site'
import { writeStorage, readStorage, removeStorage } from '~/shared/lib/storage'

import type { RegisterBodyDtoType } from '~/api/model/auth'

const RESEND_COOLDOWN = 60 // seconds between OTP resends

export function RegisterPage() {
  const { t } = useTranslation('auth')
  const { register, sendOtp, verifyEmail, isRegistering, isSendingOtp, isVerifying } = useRegister()

  // ── Stepper ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // ── Step 1 fields ────────────────────────────────────────────────────────
  const [role, setRole] = useState<'mangaka' | 'assistant'>('mangaka')

  // ── Step 2 fields ───────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validationError, setValidationError] = useState('')

  // ── Step 3 fields ───────────────────────────────────────────────────────
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''))
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer: 1 minute cooldown between OTP resends
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (step !== 3 || resendCooldown <= 0) return
    const id = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [step, resendCooldown])

  // ── Password requirement helpers ─────────────────────────────────────────
  const passLength = password.length >= 8
  const passUpper = /[A-Z]/.test(password)
  const passLower = /[a-z]/.test(password)
  const passNumber = /[0-9]/.test(password)

  // ── Step 1 → 2 ──────────────────────────────────────────────────────────
  const handleStep1Continue = () => {
    setStep(2)
  }

  // ── Step 2 → 3: register → send-otp-email → persist email → Step 3 ─────
  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault()
    setValidationError('')

    if (!fullName.trim()) {
      setValidationError(t('register.fieldRequired', { field: t('register.fullNameLabel') }))
      return
    }
    if (!email.trim()) {
      setValidationError(t('login.errorEmailRequired'))
      return
    }
    if (!phone.trim()) {
      setValidationError(t('register.fieldRequired', { field: t('register.phoneLabel') }))
      return
    }
    if (!password) {
      setValidationError(t('login.errorPasswordRequired'))
      return
    }
    if (password !== confirmPassword) {
      setValidationError(t('register.passwordMismatch'))
      return
    }

    const roleType: RegisterBodyDtoType = role === 'mangaka' ? 'MANGAKA' : 'ASSISTANT'
    const ok = await register({
      email: email.trim(),
      name: fullName.trim(),
      phoneNumber: phone.trim(),
      password,
      confirm_password: confirmPassword,
      displayName: fullName.trim(),
      type: roleType
    })
    if (!ok) return

    // Register thành công → BE đã tự gửi OTP, không cần gọi sendOtp thêm.
    // Lưu email vào storage để Step 3 và resend dùng
    writeStorage(STORAGE_KEYS.pendingRegisterEmail, email.trim())

    // Reset Step 3 state
    setOtp(Array(6).fill(''))
    setResendCooldown(RESEND_COOLDOWN)
    setStep(3)
  }

  // ── OTP input helpers ───────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value)) && value !== '') return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  // ── Step 3: verify-email ─────────────────────────────────────────────────
  const handleStep3Submit = async () => {
    const code = otp.join('')
    if (code.length < 6) return

    const storedEmail = readStorage(STORAGE_KEYS.pendingRegisterEmail)
    if (!storedEmail) return

    const ok = await verifyEmail({ email: storedEmail, code })
    if (!ok) return

    // Thành công → xoá pending email → chuyển login
    removeStorage(STORAGE_KEYS.pendingRegisterEmail)
    window.location.href = '/login'
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return

    const storedEmail = readStorage(STORAGE_KEYS.pendingRegisterEmail)
    if (!storedEmail) return

    setOtp(Array(6).fill(''))
    const ok = await sendOtp({ email: storedEmail, purpose: 'REGISTER' })
    if (ok) setResendCooldown(RESEND_COOLDOWN)
  }

  const isLoading = isRegistering || isSendingOtp || isVerifying

  return (
    <div className='relative flex min-h-screen w-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground transition-colors duration-300'>
      {/* Background decoration */}
      <div className='absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-20' />
      <div className='absolute top-1/4 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px] pointer-events-none' />

      {/* Register Container */}
      <div className='relative z-10 w-full max-w-2xl text-center'>
        {/* Brand Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-extrabold tracking-wider text-primary'>{t('register.title')}</h1>
          <p className='mt-2 text-sm text-muted-foreground'>{t('register.subtitle')}</p>
        </div>

        {/* Stepper */}
        <div className='mb-8 flex items-center justify-center gap-4'>
          {/* Step 1 */}
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                step > 1
                  ? 'bg-emerald-500 text-white'
                  : step === 1
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {step > 1 ? <Check className='h-4 w-4' /> : '1'}
            </span>
            <span className={cn('text-xs font-semibold', step === 1 ? 'text-primary' : 'text-muted-foreground')}>
              {t('register.stepRole')}
            </span>
          </div>

          <div className='h-px w-12 bg-border' />

          {/* Step 2 */}
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                step > 2
                  ? 'bg-emerald-500 text-white'
                  : step === 2
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {step > 2 ? <Check className='h-4 w-4' /> : '2'}
            </span>
            <span className={cn('text-xs font-semibold', step === 2 ? 'text-primary' : 'text-muted-foreground')}>
              {t('register.stepInfo')}
            </span>
          </div>

          <div className='h-px w-12 bg-border' />

          {/* Step 3 */}
          <div className='flex items-center gap-2'>
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                step === 3
                  ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              3
            </span>
            <span className={cn('text-xs font-semibold', step === 3 ? 'text-primary' : 'text-muted-foreground')}>
              {t('register.stepVerify')}
            </span>
          </div>
        </div>

        {/* Dynamic Card Container */}
        <div className='rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-md sm:p-10 text-left'>
          {/* ── STEP 1: ROLE SELECTION ──────────────────────────────────── */}
          {step === 1 && (
            <div className='space-y-6'>
              <h2 className='text-xl font-bold text-center sm:text-2xl'>{t('register.chooseRole')}</h2>

              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                {/* Mangaka Role Card */}
                <button
                  type='button'
                  onClick={() => setRole('mangaka')}
                  className={cn(
                    'flex flex-col items-start rounded-xl border p-6 text-left transition-all hover:scale-[1.01] cursor-pointer',
                    role === 'mangaka'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card/50 hover:border-primary/45'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg p-3 transition-colors',
                      role === 'mangaka' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Pencil className='h-6 w-6' />
                  </div>
                  <h3 className='mt-4 text-lg font-bold'>{t('register.roleMangaka')}</h3>
                  <p className='mt-1 text-xs text-muted-foreground leading-relaxed'>{t('register.roleMangakaDesc')}</p>
                </button>

                {/* Assistant Role Card */}
                <button
                  type='button'
                  onClick={() => setRole('assistant')}
                  className={cn(
                    'flex flex-col items-start rounded-xl border p-6 text-left transition-all hover:scale-[1.01] cursor-pointer',
                    role === 'assistant'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card/50 hover:border-primary/45'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-lg p-3 transition-colors',
                      role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Users className='h-6 w-6' />
                  </div>
                  <h3 className='mt-4 text-lg font-bold'>{t('register.roleAssistant')}</h3>
                  <p className='mt-1 text-xs text-muted-foreground leading-relaxed'>
                    {t('register.roleAssistantDesc')}
                  </p>
                </button>
              </div>

              {/* Security Banner */}
              <div className='flex gap-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-600 leading-relaxed dark:text-amber-400 dark:bg-amber-500/5'>
                <ShieldAlert className='h-6 w-6 shrink-0' />
                <div>
                  <h4 className='font-bold text-amber-700 dark:text-amber-400'>{t('register.securityWarningTitle')}</h4>
                  <p className='mt-1 text-xs text-amber-700/80 dark:text-amber-400/80'>
                    {t('register.securityWarningDesc')}
                  </p>
                </div>
              </div>

              <div className='pt-4 border-t border-border flex items-center justify-between'>
                <div className='text-xs'>
                  <span className='text-muted-foreground'>{t('register.hasAccount')} </span>
                  <Link to='/login' className='font-bold text-primary hover:underline'>
                    {t('register.loginNow')}
                  </Link>
                </div>
                <button
                  type='button'
                  onClick={handleStep1Continue}
                  className='flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 shadow-lg shadow-primary/20 cursor-pointer'
                >
                  <span>{t('register.continueButton')}</span>
                  <ArrowRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: USER DETAILS FORM ─────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className='space-y-6'>
              <div>
                <h2 className='text-xl font-bold sm:text-2xl'>{t('register.accountInfoTitle')}</h2>
                <p className='mt-1 text-xs text-muted-foreground'>{t('register.accountInfoSubtitle')}</p>
              </div>

              {validationError && (
                <div className='rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive flex items-center gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0' />
                  <span>{validationError}</span>
                </div>
              )}

              <div className='space-y-4'>
                {/* Full Name */}
                <div className='space-y-1'>
                  <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('register.fullNameLabel')}
                  </label>
                  <div className='relative'>
                    <User className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
                    <input
                      type='text'
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder='Nguyen Van A'
                      disabled={isLoading}
                      className={cn(
                        'w-full rounded-lg border border-input bg-card/50 py-2.5 pl-10 pr-4 text-sm transition-all',
                        'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                      )}
                    />
                  </div>
                </div>

                {/* Email + Phone side-by-side */}
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                      {t('login.emailLabel')}
                    </label>
                    <div className='relative'>
                      <Mail className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
                      <input
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('register.emailPlaceholder')}
                        disabled={isLoading}
                        className={cn(
                          'w-full rounded-lg border border-input bg-card/50 py-2.5 pl-10 pr-4 text-sm transition-all',
                          'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                          'disabled:cursor-not-allowed disabled:opacity-60'
                        )}
                      />
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                      {t('register.phoneLabel')}
                    </label>
                    <div className='relative'>
                      <Phone className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
                      <input
                        type='tel'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={t('register.phonePlaceholder')}
                        disabled={isLoading}
                        className={cn(
                          'w-full rounded-lg border border-input bg-card/50 py-2.5 pl-10 pr-4 text-sm transition-all',
                          'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                          'disabled:cursor-not-allowed disabled:opacity-60'
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className='space-y-1'>
                  <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('login.passwordLabel')}
                  </label>
                  <div className='relative'>
                    <Lock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('register.passwordPlaceholder')}
                      disabled={isLoading}
                      className={cn(
                        'w-full rounded-lg border border-input bg-card/50 py-2.5 pl-10 pr-12 text-sm transition-all',
                        'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                      )}
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                    </button>
                  </div>
                  {/* Password requirements */}
                  <div className='mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-[11px] font-semibold text-muted-foreground'>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition-colors',
                          passLength ? 'bg-emerald-500' : 'bg-border'
                        )}
                      />
                      <span>{t('register.passwordRequirementLength')}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition-colors',
                          passUpper ? 'bg-emerald-500' : 'bg-border'
                        )}
                      />
                      <span>{t('register.passwordRequirementUpper')}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition-colors',
                          passLower ? 'bg-emerald-500' : 'bg-border'
                        )}
                      />
                      <span>{t('register.passwordRequirementLower')}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full transition-colors',
                          passNumber ? 'bg-emerald-500' : 'bg-border'
                        )}
                      />
                      <span>{t('register.passwordRequirementNumber')}</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className='space-y-1'>
                  <label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                    {t('register.confirmPasswordLabel')}
                  </label>
                  <div className='relative'>
                    <Lock className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/80' />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('register.passwordPlaceholder')}
                      disabled={isLoading}
                      className={cn(
                        'w-full rounded-lg border border-input bg-card/50 py-2.5 pl-10 pr-12 text-sm transition-all',
                        'focus:border-primary focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none',
                        'disabled:cursor-not-allowed disabled:opacity-60'
                      )}
                    />
                    <button
                      type='button'
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                      className='absolute top-1/2 right-3 -translate-y-1/2 p-1 text-muted-foreground/80 hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-60'
                    >
                      {showConfirmPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className='pt-4 border-t border-border flex items-center justify-between gap-4'>
                <button
                  type='button'
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className='flex items-center gap-2 rounded-lg border border-border bg-card/50 px-5 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-muted cursor-pointer disabled:cursor-not-allowed disabled:opacity-60'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>{t('register.backButton')}</span>
                </button>

                <button
                  type='submit'
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all',
                    'shadow-lg shadow-primary/20 cursor-pointer',
                    'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
                  )}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span>{t('register.creatingAccount')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('register.continueButton')}</span>
                      <ArrowRight className='h-4 w-4' />
                    </>
                  )}
                </button>
              </div>

              <div className='rounded-lg border border-primary/20 bg-primary/5 p-4 text-[11px] leading-relaxed text-primary/80'>
                {t('register.adminApprovalNotice')}
              </div>
            </form>
          )}

          {/* ── STEP 3: OTP EMAIL VERIFICATION ────────────────────────── */}
          {step === 3 && (
            <div className='space-y-6'>
              <div className='text-center'>
                <h2 className='text-xl font-bold sm:text-2xl'>{t('register.verifyEmailTitle')}</h2>
                <p className='mt-2 text-sm text-muted-foreground'>
                  {t('register.verifyEmailSubtitle')}{' '}
                  <span className='font-bold text-foreground text-primary/80'>
                    {readStorage(STORAGE_KEYS.pendingRegisterEmail) || '...'}
                  </span>
                </p>
              </div>

              {/* OTP Digits Input */}
              <div className='flex justify-center gap-3 py-4'>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type='text'
                    inputMode='numeric'
                    maxLength={1}
                    value={digit}
                    ref={(el) => {
                      otpRefs.current[index] = el
                    }}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={isVerifying}
                    className={cn(
                      'h-14 w-12 rounded-xl border border-input bg-card/60 text-center text-xl font-extrabold',
                      'focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20 focus:outline-none',
                      'transition-all shadow-md',
                      'disabled:cursor-not-allowed disabled:opacity-60'
                    )}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type='button'
                onClick={handleStep3Submit}
                disabled={isVerifying || otp.join('').length < 6}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-all',
                  'shadow-lg shadow-primary/25 cursor-pointer',
                  'hover:opacity-90',
                  'disabled:cursor-not-allowed disabled:opacity-60'
                )}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>{t('register.verifying')}</span>
                  </>
                ) : (
                  <span>{t('register.verifyAccountButton')}</span>
                )}
              </button>

              {/* Resend + Back */}
              <div className='flex flex-col items-center gap-4 text-center text-xs'>
                <button
                  type='button'
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isSendingOtp}
                  className={cn(
                    'font-semibold hover:underline transition-colors',
                    resendCooldown > 0 ? 'text-muted-foreground/50 cursor-not-allowed' : 'text-primary cursor-pointer'
                  )}
                >
                  {resendCooldown > 0
                    ? `${t('register.resendCode', { time: resendCooldown })}`
                    : t('register.resendNow')}
                </button>

                <button
                  type='button'
                  onClick={() => {
                    setStep(2)
                    setOtp(Array(6).fill(''))
                  }}
                  className='flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium border border-border rounded-lg px-4 py-2 cursor-pointer bg-card/20'
                >
                  <ArrowLeft className='h-3.5 w-3.5' />
                  <span>{t('register.backToPrevStep')}</span>
                </button>
              </div>

              <div className='border-t border-border pt-4 text-center text-[10px] tracking-wider font-extrabold text-muted-foreground/60 uppercase'>
                {t('register.securityFooter')}
              </div>
            </div>
          )}
        </div>

        {/* Copyright */}
        <p className='mt-8 text-center text-[11px] text-muted-foreground'>{t('register.footerCopyright')}</p>
      </div>
    </div>
  )
}
