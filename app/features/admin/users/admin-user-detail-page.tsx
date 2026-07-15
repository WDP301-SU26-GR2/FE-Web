import { ArrowLeft, CalendarDays, KeyRound, Mail, Phone, Shield, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { AdminUserResDtoOutput } from '~/api/model/users'
import { cn } from '~/shared/lib/cn'

export interface AdminUserDetailPageProps {
  user: AdminUserResDtoOutput | null
  hasError: boolean
}

const STATUS_STYLES = {
  ACTIVE: 'border-primary/25 bg-primary/10 text-primary',
  INACTIVE: 'border-border bg-muted text-muted-foreground',
  BLOCKED: 'border-destructive/20 bg-destructive/10 text-destructive',
  BANNED: 'border-destructive/30 bg-destructive text-destructive-foreground'
} as const

export function AdminUserDetailPage({ user, hasError }: AdminUserDetailPageProps) {
  const { t, i18n } = useTranslation('admin')

  if (hasError || !user) {
    return (
      <div className='mx-auto max-w-2xl space-y-5 py-8'>
        <Link
          to='/dashboard/admin/users'
          className='inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline'
        >
          <ArrowLeft className='size-4' aria-hidden='true' />
          {t('users.detail.back')}
        </Link>
        <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center text-destructive'>
          <h1 className='text-lg font-bold'>{t('users.detail.errorTitle')}</h1>
          <p className='mt-2 text-sm'>{t('users.detail.errorDescription')}</p>
        </div>
      </div>
    )
  }

  const displayName = user.displayName ?? user.name
  const createdAt = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(new Date(user.createdAt))

  return (
    <div className='mx-auto max-w-5xl space-y-6 pb-12'>
      <Link
        to='/dashboard/admin/users'
        className='inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        {t('users.detail.back')}
      </Link>

      <header className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
        <div className='h-24 bg-primary/10' />
        <div className='px-6 pb-6 sm:px-8'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-end'>
              <div className='mt-[-2.5rem] flex size-20 shrink-0 items-center justify-center rounded-2xl border-4 border-card bg-primary text-2xl font-extrabold uppercase text-primary-foreground shadow-md'>
                {displayName.charAt(0)}
              </div>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.16em] text-primary'>
                  {t('users.detail.eyebrow')}
                </p>
                <h1 className='mt-1 text-2xl font-bold tracking-tight text-foreground'>{displayName}</h1>
                {user.displayName && user.displayName !== user.name && (
                  <p className='mt-1 text-sm text-muted-foreground'>{user.name}</p>
                )}
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='rounded-md border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground'>
                {t(`dashboard.roles.${user.role}`)}
              </span>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider',
                  STATUS_STYLES[user.status]
                )}
              >
                {t(`dashboard.userStatuses.${user.status}`)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <UserRound className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 className='font-bold text-foreground'>{t('users.detail.accountInfo')}</h2>
              <p className='text-xs text-muted-foreground'>{t('users.detail.accountInfoDescription')}</p>
            </div>
          </div>
          <dl className='mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <DetailItem icon={Mail} label={t('users.fields.email')} value={user.email} />
            <DetailItem icon={Phone} label={t('users.fields.phoneNumber')} value={user.phoneNumber} />
            <DetailItem icon={UserRound} label={t('users.fields.name')} value={user.name} />
            <DetailItem icon={Shield} label={t('users.fields.role')} value={t(`dashboard.roles.${user.role}`)} />
            <DetailItem icon={CalendarDays} label={t('users.detail.createdAt')} value={createdAt} />
            <DetailItem icon={KeyRound} label={t('users.detail.userId')} value={user.id} mono />
          </dl>
        </section>

        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <div className='flex items-center gap-3'>
            <div className='flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Shield className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 className='font-bold text-foreground'>{t('users.detail.security')}</h2>
              <p className='text-xs text-muted-foreground'>{t('users.detail.securityDescription')}</p>
            </div>
          </div>
          <dl className='mt-5 space-y-4'>
            <SecurityItem
              label={t('users.detail.emailVerification')}
              value={user.emailVerified ? t('users.security.verified') : t('users.security.unverified')}
              emphasized={user.emailVerified}
            />
            <SecurityItem
              label={t('users.detail.passwordPolicy')}
              value={user.mustChangePassword ? t('users.security.mustChangePassword') : t('users.detail.passwordReady')}
              emphasized={!user.mustChangePassword}
            />
            <SecurityItem
              label={t('users.detail.registrationType')}
              value={t(`users.registrationTypes.${user.registrationType}`)}
            />
          </dl>
        </section>
      </div>
    </div>
  )
}

interface DetailItemProps {
  icon: typeof Mail
  label: string
  value: string
  mono?: boolean
}

function DetailItem({ icon: Icon, label, value, mono }: DetailItemProps) {
  return (
    <div className='rounded-lg border border-border bg-background/50 p-4'>
      <dt className='flex items-center gap-2 text-xs font-semibold text-muted-foreground'>
        <Icon className='size-4' aria-hidden='true' />
        {label}
      </dt>
      <dd className={cn('mt-2 break-words text-sm font-bold text-foreground', mono && 'font-mono text-xs')}>{value}</dd>
    </div>
  )
}

function SecurityItem({ label, value, emphasized }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div className='border-b border-border pb-4 last:border-0 last:pb-0'>
      <dt className='text-xs font-semibold text-muted-foreground'>{label}</dt>
      <dd className={cn('mt-1 text-sm font-bold text-foreground', emphasized && 'text-primary')}>{value}</dd>
    </div>
  )
}
