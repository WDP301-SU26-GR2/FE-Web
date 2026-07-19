import { useEffect, useRef } from 'react'
import { UserPlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { FetcherWithComponents } from 'react-router'

import type { AdminUserActionResult } from '../types'

export interface CreateUserDialogProps {
  fetcher: FetcherWithComponents<AdminUserActionResult>
  onClose: () => void
}

export function CreateUserDialog({ fetcher, onClose }: CreateUserDialogProps) {
  const { t } = useTranslation('admin')
  const isSubmitting = fetcher.state !== 'idle'
  const submitted = useRef(false)

  useEffect(() => {
    if (fetcher.state !== 'idle') submitted.current = true
    if (submitted.current && fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <div className='fixed inset-0 z-[70] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm'>
      <div
        className='w-full max-w-lg rounded-xl border border-border bg-card shadow-xl'
        role='dialog'
        aria-modal='true'
        aria-labelledby='create-user-title'
      >
        <div className='flex items-start justify-between gap-4 border-b border-border p-5'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <UserPlus className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h2 id='create-user-title' className='font-bold text-foreground'>
                {t('users.create.title')}
              </h2>
              <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{t('users.create.description')}</p>
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

        <fetcher.Form method='post' className='space-y-4 p-5'>
          <input type='hidden' name='intent' value='create' />
          <Field label={t('users.fields.name')} name='name' minLength={2} maxLength={100} required />
          <Field label={t('users.fields.email')} name='email' type='email' required />
          <Field
            label={t('users.fields.phoneNumber')}
            name='phoneNumber'
            type='tel'
            placeholder='+84912345678'
            pattern='^\+[1-9]\d{1,14}$'
            required
          />
          <label className='block'>
            <span className='mb-1.5 block text-xs font-bold text-foreground'>{t('users.fields.role')}</span>
            <select
              name='roleCode'
              required
              defaultValue='EDITOR'
              className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20'
            >
              <option value='EDITOR'>{t('dashboard.roles.EDITOR')}</option>
              <option value='BOARD_MEMBER'>{t('dashboard.roles.BOARD_MEMBER')}</option>
            </select>
          </label>

          <div className='rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground'>
            {t('users.create.passwordNotice')}
          </div>

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
              {isSubmitting ? t('users.actions.processing') : t('users.create.submit')}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  pattern?: string
  minLength?: number
  maxLength?: number
  required?: boolean
}

function Field({ label, name, type = 'text', ...inputProps }: FieldProps) {
  return (
    <label className='block'>
      <span className='mb-1.5 block text-xs font-bold text-foreground'>{label}</span>
      <input
        name={name}
        type={type}
        {...inputProps}
        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/20'
      />
    </label>
  )
}
