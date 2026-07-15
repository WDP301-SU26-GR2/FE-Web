import { KeyRound, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FetcherWithComponents } from 'react-router'

import type { AdminUserActionResult, SelectedUserAction } from '../types'

export interface UserActionDialogProps {
  selection: SelectedUserAction
  fetcher: FetcherWithComponents<AdminUserActionResult>
  onClose: () => void
}

const ACTION_ICON = {
  status: ShieldCheck,
  delete: Trash2,
  restore: RotateCcw,
  resetPassword: KeyRound
} as const

export function UserActionDialog({ selection, fetcher, onClose }: UserActionDialogProps) {
  const { t } = useTranslation('admin')
  const { action, user } = selection
  const Icon = ACTION_ICON[action]
  const isSubmitting = fetcher.state !== 'idle'

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm'>
      <div
        className='w-full max-w-md rounded-xl border border-border bg-card shadow-xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby='user-action-title'
      >
        <div className='flex items-start justify-between gap-4 border-b border-border p-5'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icon className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 id='user-action-title' className='font-bold text-foreground'>
                {t(`users.dialogs.${action}.title`)}
              </h2>
              <p className='mt-1 text-xs text-muted-foreground'>{user.displayName ?? user.name}</p>
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            aria-label={t('users.actions.close')}
          >
            <X className='size-4' />
          </button>
        </div>

        <fetcher.Form method='post' className='space-y-4 p-5' onSubmit={onClose}>
          <input type='hidden' name='intent' value={action} />
          <input type='hidden' name='userId' value={user.id} />
          <input type='hidden' name='userEmail' value={user.email} />

          <p className='text-sm leading-relaxed text-muted-foreground'>{t(`users.dialogs.${action}.description`)}</p>

          {action === 'status' && (
            <>
              <label className='block'>
                <span className='mb-1.5 block text-xs font-bold text-foreground'>{t('users.fields.status')}</span>
                <select
                  name='status'
                  required
                  defaultValue={user.status === 'INACTIVE' ? 'ACTIVE' : user.status}
                  className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20'
                >
                  <option value='ACTIVE'>{t('dashboard.userStatuses.ACTIVE')}</option>
                  <option value='BLOCKED'>{t('dashboard.userStatuses.BLOCKED')}</option>
                  <option value='BANNED'>{t('dashboard.userStatuses.BANNED')}</option>
                </select>
              </label>
              <label className='block'>
                <span className='mb-1.5 block text-xs font-bold text-foreground'>{t('users.fields.reason')}</span>
                <textarea
                  name='reason'
                  rows={3}
                  placeholder={t('users.fields.reasonPlaceholder')}
                  className='w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20'
                />
              </label>
            </>
          )}

          <div className='flex justify-end gap-3 border-t border-border pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted'
            >
              {t('users.actions.cancel')}
            </button>
            <button
              type='submit'
              disabled={isSubmitting}
              className='rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmitting ? t('users.actions.processing') : t(`users.dialogs.${action}.submit`)}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  )
}
