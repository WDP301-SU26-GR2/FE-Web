import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Mail, Phone, Shield, Clock, CheckCircle2, AlertCircle, User } from 'lucide-react'

import { SignedImage } from '~/shared/components/signed-image'
import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'

import type { AccountInfo } from '../api/profile-api'

type AccountInfoSectionProps = {
  data: AccountInfo
  onEdit: () => void
}

export function AccountInfoSection({ data, onEdit }: AccountInfoSectionProps) {
  const { t } = useTranslation('profile')

  return (
    <div className='space-y-6 rounded-lg border border-border bg-card p-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('accountInfo.title')}
        </h2>
        <Button type='button' variant='outline' size='sm' onClick={onEdit}>
          <User className='h-4 w-4' />
          {t('accountInfo.edit')}
        </Button>
      </div>

      {/* Avatar + basic identity */}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6'>
        <div className='shrink-0'>
          {data.avatar ? (
            <SignedImage
              r2Key={data.avatar}
              alt={data.displayName ?? data.name}
              aspectClassName='h-20 w-20 rounded-full object-cover'
              className='h-20 w-20 rounded-full border-2 border-border'
            />
          ) : (
            <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground'>
              {(data.displayName ?? data.name).charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className='min-w-0 flex-1 space-y-1'>
          <p className='text-xl font-bold text-foreground'>
            {data.displayName ?? data.name}
          </p>
          {data.displayName && (
            <p className='text-sm text-muted-foreground'>{data.name}</p>
          )}
          <div className='flex flex-wrap items-center gap-2 pt-1'>
            <StatusBadge status={data.status} t={t} />
            <RoleBadge role={data.role} t={t} />
            {data.emailVerified ? (
              <span className='inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                <CheckCircle2 className='h-3 w-3' />
                {t('accountInfo.emailVerified')}
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400'>
                <AlertCircle className='h-3 w-3' />
                {t('accountInfo.emailUnverified')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Account details grid */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <AccountField
          icon={<Mail className='h-4 w-4 text-muted-foreground' />}
          label={t('accountInfo.email')}
          value={data.email}
        />

        <AccountField
          icon={<Phone className='h-4 w-4 text-muted-foreground' />}
          label={t('accountInfo.phoneNumber')}
          value={data.phoneNumber || t('accountInfo.notSet')}
          valueClassName={cn(!data.phoneNumber && 'italic text-muted-foreground')}
        />

        <AccountField
          icon={<Shield className='h-4 w-4 text-muted-foreground' />}
          label={t('accountInfo.role')}
          value={t(`accountInfo.role.${data.role}`, { defaultValue: data.role })}
        />

        <AccountField
          icon={<Clock className='h-4 w-4 text-muted-foreground' />}
          label={t('accountInfo.memberSince')}
          value={formatDate(data.createdAt)}
        />
      </div>

      {/* Password change hint */}
      {data.mustChangePassword && (
        <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200'>
          <AlertCircle className='mb-1 inline h-4 w-4' />
          {' '}{t('accountInfo.mustChangePassword')}
        </div>
      )}
    </div>
  )
}

function AccountField({
  icon,
  label,
  value,
  valueClassName
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className='flex items-start gap-3'>
      <div className='mt-0.5 shrink-0'>{icon}</div>
      <div className='min-w-0'>
        <p className='text-xs text-muted-foreground'>{label}</p>
        <p className={cn('break-all text-sm font-medium text-foreground', valueClassName)}>
          {value}
        </p>
      </div>
    </div>
  )
}

function StatusBadge({
  status,
  t
}: {
  status: AccountInfo['status']
  t: TFunction<'profile'>
}) {
  const map: Record<string, { cls: string; label: string }> = {
    ACTIVE: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: t('accountInfo.statusEnum.ACTIVE') },
    INACTIVE: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: t('accountInfo.statusEnum.INACTIVE') },
    BANNED: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400', label: t('accountInfo.statusEnum.BANNED') },
    BLOCKED: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400', label: t('accountInfo.statusEnum.BLOCKED') }
  }
  const { cls, label } = map[status] ?? { cls: 'bg-gray-500/10 text-gray-600', label: status }
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

function RoleBadge({
  role,
  t
}: {
  role: AccountInfo['role']
  t: TFunction<'profile'>
}) {
  const map: Record<string, { cls: string; label: string }> = {
    MANGAKA: { cls: 'bg-primary/10 text-primary', label: t('accountInfo.roleEnum.MANGAKA') },
    ASSISTANT: { cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', label: t('accountInfo.roleEnum.ASSISTANT') },
    EDITOR: { cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', label: t('accountInfo.roleEnum.EDITOR') },
    BOARD_MEMBER: { cls: 'bg-teal-500/10 text-teal-600 dark:text-teal-400', label: t('accountInfo.roleEnum.BOARD_MEMBER') },
    SUPER_ADMIN: { cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: t('accountInfo.roleEnum.SUPER_ADMIN') }
  }
  const { cls, label } = map[role] ?? { cls: 'bg-gray-500/10 text-gray-600', label: role }
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', cls)}>
      {label}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
