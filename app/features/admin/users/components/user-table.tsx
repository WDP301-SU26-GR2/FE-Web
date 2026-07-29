import { Eye, KeyRound, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { AdminUserListResDtoOutputItemsItem } from '~/api/model/users'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import { cn } from '~/shared/lib/cn'
import type { AdminUserAction, SelectedUserAction } from '../types'

export interface UserTableProps {
  users: AdminUserListResDtoOutputItemsItem[]
  deletedUserIds: ReadonlySet<string>
  onAction: (selection: SelectedUserAction) => void
}

const ACTION_STYLES: Record<AdminUserAction, string> = {
  status: 'text-sky-700 hover:bg-sky-500/10 hover:text-sky-800 dark:text-sky-300',
  resetPassword: 'text-violet-700 hover:bg-violet-500/10 hover:text-violet-800 dark:text-violet-300',
  restore: 'text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-300',
  delete: 'text-destructive hover:bg-destructive/10'
} as const

export function UserTable({ users, deletedUserIds, onAction }: UserTableProps) {
  const { t, i18n } = useTranslation('admin')
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  if (users.length === 0) {
    return (
      <div className='rounded-xl border border-dashed border-border bg-card p-12 text-center'>
        <p className='font-bold text-foreground'>{t('users.empty.title')}</p>
        <p className='mt-2 text-xs text-muted-foreground'>{t('users.empty.description')}</p>
      </div>
    )
  }

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
      <div className='overflow-x-auto'>
        <table className='w-full min-w-[980px] text-left'>
          <thead className='border-b border-border bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
            <tr>
              <th className='px-5 py-3'>{t('users.table.user')}</th>
              <th className='px-4 py-3'>{t('users.table.role')}</th>
              <th className='px-4 py-3'>{t('users.table.status')}</th>
              <th className='px-4 py-3'>{t('users.table.security')}</th>
              <th className='px-4 py-3'>{t('users.table.createdAt')}</th>
              <th className='px-5 py-3 text-right'>{t('users.table.actions')}</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {users.map((user) => {
              const isDeleted = deletedUserIds.has(user.id)

              return (
                <tr key={user.id} className='transition-colors hover:bg-muted/30'>
                  <td className='px-5 py-4'>
                    <div className='flex items-center gap-3'>
                      <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold uppercase text-primary'>
                        {(user.displayName ?? user.name).charAt(0)}
                      </div>
                      <div className='min-w-0'>
                        <p className='max-w-64 truncate text-xs font-bold text-foreground'>
                          {user.displayName ?? user.name}
                        </p>
                        <p className='mt-0.5 max-w-64 truncate text-[11px] text-muted-foreground'>{user.email}</p>
                        <p className='mt-0.5 text-[10px] text-muted-foreground'>{user.phoneNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4'>
                    <span className='rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold text-foreground'>
                      {t(`dashboard.roles.${user.role}`)}
                    </span>
                  </td>
                  <td className='px-4 py-4'>
                    <SemanticStatusBadge
                      value={user.status}
                      label={t(`dashboard.userStatuses.${user.status}`)}
                      className='text-[10px] uppercase tracking-wider'
                    />
                  </td>
                  <td className='px-4 py-4'>
                    <div className='space-y-1 text-[11px]'>
                      <p className={user.emailVerified ? 'text-foreground' : 'text-muted-foreground'}>
                        {user.emailVerified ? t('users.security.verified') : t('users.security.unverified')}
                      </p>
                      <p className={user.mustChangePassword ? 'font-bold text-destructive' : 'text-muted-foreground'}>
                        {user.mustChangePassword
                          ? t('users.security.mustChangePassword')
                          : t(`users.registrationTypes.${user.registrationType}`)}
                      </p>
                    </div>
                  </td>
                  <td className='px-4 py-4 text-[11px] text-muted-foreground'>
                    {dateFormatter.format(new Date(user.createdAt))}
                  </td>
                  <td className='px-5 py-4'>
                    <div className='flex items-center justify-end gap-1'>
                      {!isDeleted && (
                        <Link
                          to={`/dashboard/admin/users/${user.id}`}
                          title={t('users.actions.viewDetail')}
                          aria-label={`${t('users.actions.viewDetail')}: ${user.displayName ?? user.name}`}
                          className='rounded-lg p-2 text-sky-700 transition-colors hover:bg-sky-500/10 hover:text-sky-800 dark:text-sky-300'
                        >
                          <Eye className='size-4' />
                        </Link>
                      )}
                      {user.role !== 'SUPER_ADMIN' &&
                        (isDeleted ? (
                          <ActionButton
                            action='restore'
                            label={t('users.actions.restore')}
                            icon={RotateCcw}
                            user={user}
                            onAction={onAction}
                          />
                        ) : (
                          <>
                            <ActionButton
                              action='status'
                              label={t('users.actions.changeStatus')}
                              icon={ShieldCheck}
                              user={user}
                              onAction={onAction}
                            />
                            <ActionButton
                              action='resetPassword'
                              label={t('users.actions.resetPassword')}
                              icon={KeyRound}
                              user={user}
                              onAction={onAction}
                            />
                            <ActionButton
                              action='delete'
                              label={t('users.actions.delete')}
                              icon={Trash2}
                              user={user}
                              onAction={onAction}
                              destructive
                            />
                          </>
                        ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  action: AdminUserAction
  label: string
  icon: typeof ShieldCheck
  user: AdminUserListResDtoOutputItemsItem
  onAction: (selection: SelectedUserAction) => void
  destructive?: boolean
}

function ActionButton({ action, label, icon: Icon, user, onAction, destructive }: ActionButtonProps) {
  return (
    <button
      type='button'
      onClick={() => onAction({ action, user })}
      title={label}
      aria-label={`${label}: ${user.displayName ?? user.name}`}
      className={cn(
        'rounded-lg p-2 transition-colors',
        ACTION_STYLES[action],
        destructive && 'text-destructive hover:bg-destructive/10'
      )}
    >
      <Icon className='size-4' />
    </button>
  )
}
