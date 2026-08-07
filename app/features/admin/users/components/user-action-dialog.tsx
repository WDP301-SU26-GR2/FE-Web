import { useEffect, useRef } from 'react'
import { KeyRound, RotateCcw, ShieldCheck, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FetcherWithComponents } from 'react-router'

import type { AdminUserActionResult, SelectedUserAction } from '../types'

const modalPanelClass = 'flex max-h-[calc(100vh-3rem)] min-w-0 w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl'
const modalBodyClass = 'min-w-0 flex-1 overflow-y-auto space-y-4 p-5'
const modalFooterClass = 'flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'
const modalButtonClass = 'inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-xs font-bold sm:w-auto'
const fieldClass =
  'min-w-0 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20'

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
  const submitted = useRef(false)
  const isTargetAdmin = user.role === 'SUPER_ADMIN'

  useEffect(() => {
    if (fetcher.state !== 'idle') submitted.current = true
    if (submitted.current && fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm'>
      <div
        className={`${modalPanelClass} max-w-md`}
        role='dialog'
        aria-modal='true'
        aria-labelledby='user-action-title'
      >
        <div className='flex items-start justify-between gap-4 border-b border-border p-5'>
          <div className='flex min-w-0 items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Icon className='size-5' aria-hidden='true' />
            </div>
            <div className='min-w-0'>
              <h2 id='user-action-title' className='text-sm font-bold text-foreground'>
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

        <fetcher.Form method='post' className={modalBodyClass}>
          <input type='hidden' name='intent' value={action} />
          <input type='hidden' name='userId' value={user.id} />
          <input type='hidden' name='userEmail' value={user.email} />

          {isTargetAdmin && (
            <div
              role='alert'
              className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive'
            >
              {t('users.cannotModifyAdminNotice')}
            </div>
          )}

          <p className='text-xs leading-relaxed text-muted-foreground'>{t(`users.dialogs.${action}.description`)}</p>

          {action === 'status' && (
            <>
              <label className='block'>
                <span className='mb-1.5 block text-xs font-bold text-foreground'>{t('users.fields.status')}</span>
                <select
                  name='status'
                  required
                  defaultValue={user.status === 'INACTIVE' ? 'ACTIVE' : user.status}
                  className={fieldClass}
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
                  className={`${fieldClass} resize-none`}
                />
              </label>
            </>
          )}

          <div className={modalFooterClass}>
            <button
              type='button'
              onClick={onClose}
              className={`${modalButtonClass} border border-border text-foreground transition-colors hover:bg-muted`}
            >
              {t('users.actions.cancel')}
            </button>
            <button
              type='submit'
<<<<<<< HEAD
              disabled={isSubmitting}
              className={`${modalButtonClass} bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60`}
=======
              disabled={isSubmitting || isTargetAdmin}
              title={isTargetAdmin ? t('users.cannotModifyAdminNotice') : undefined}
              className='rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
>>>>>>> cef4f21789faf7511d8522666f5db7065d0b67bd
            >
              {isSubmitting ? t('users.actions.processing') : t(`users.dialogs.${action}.submit`)}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  )
}
