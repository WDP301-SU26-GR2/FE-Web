import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Save, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '~/shared/ui/button'
import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'

import type { AccountInfo } from '../api/profile-api'
import { saveAccountInfo } from '../api/profile-api'
import { AvatarUploader } from './avatar-uploader'

type AccountEditSectionProps = {
  data: AccountInfo
  onCancel: () => void
  onSaved: () => void
}

export function AccountEditSection({ data, onCancel, onSaved }: AccountEditSectionProps) {
  const { t } = useTranslation('profile')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [fields, setFields] = useState({
    name: data.name ?? '',
    displayName: data.displayName ?? '',
    avatar: data.avatar,
    phoneNumber: data.phoneNumber ?? ''
  })

  function setField(key: keyof typeof fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}

    if (fields.name.trim().length > 0 && fields.name.trim().length < 2) {
      next.name = t('accountInfo.errors.nameTooShort')
    } else if (fields.name.trim().length > 100) {
      next.name = t('accountInfo.errors.nameTooLong')
    }

    if (fields.displayName && fields.displayName.length > 100) {
      next.displayName = t('accountInfo.errors.displayNameTooLong')
    }

    if (fields.phoneNumber && !/^\+[1-9]\d{1,14}$/.test(fields.phoneNumber.trim())) {
      next.phoneNumber = t('accountInfo.errors.phoneInvalid')
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }, [fields, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await saveAccountInfo({
        ...(fields.name.trim() !== data.name && { name: fields.name.trim() }),
        ...(fields.displayName !== (data.displayName ?? '') && {
          displayName: fields.displayName.trim() === '' ? '' : fields.displayName.trim()
        }),
        ...(fields.avatar !== data.avatar && {
          // null = user removed avatar → send empty string to clear
          avatar: fields.avatar === null ? '' : (fields.avatar ?? undefined)
        }),
        ...(fields.phoneNumber.trim() !== data.phoneNumber && {
          phoneNumber: fields.phoneNumber.trim() || undefined
        })
      })
      toast.success(t('accountInfo.saveSuccess'))
      onSaved()
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('accountInfo.errors.saveGeneric')))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4 rounded-lg border border-border bg-card p-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
          {t('accountInfo.title')}
        </h2>
      </div>

      {/* Avatar uploader */}
      <div className='flex flex-col items-center gap-2'>
        <label className='block text-sm font-medium text-foreground'>
          {t('accountInfo.avatar')}
        </label>
        <AvatarUploader
          value={fields.avatar}
          onChange={(key) => setFields((prev) => ({ ...prev, avatar: key }))}
        />
      </div>

      {/* Name field */}
      <div className='space-y-1'>
        <label className='block text-sm font-medium text-foreground'>
          {t('accountInfo.name')}
          <span className='ml-1 text-xs text-muted-foreground'>(2-100 {t('accountInfo.characters')})</span>
        </label>
        <input
          type='text'
          value={fields.name}
          onChange={(e) => setField('name', e.target.value)}
          maxLength={100}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:outline-none',
            errors.name
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : 'border-input focus:border-primary focus:ring-ring'
          )}
        />
        {errors.name && <p className='text-xs text-destructive'>{errors.name}</p>}
      </div>

      {/* Display name field */}
      <div className='space-y-1'>
        <label className='block text-sm font-medium text-foreground'>
          {t('accountInfo.displayName')}
          <span className='ml-1 text-xs text-muted-foreground'>(0-100 {t('accountInfo.characters')})</span>
        </label>
        <input
          type='text'
          value={fields.displayName}
          onChange={(e) => setField('displayName', e.target.value)}
          maxLength={100}
          placeholder={t('accountInfo.displayNamePlaceholder')}
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:outline-none',
            errors.displayName
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : 'border-input focus:border-primary focus:ring-ring'
          )}
        />
        <p className='text-xs text-muted-foreground'>{t('accountInfo.displayNameHint')}</p>
        {errors.displayName && <p className='text-xs text-destructive'>{errors.displayName}</p>}
      </div>

      {/* Phone number field */}
      <div className='space-y-1'>
        <label className='block text-sm font-medium text-foreground'>
          {t('accountInfo.phoneNumber')}
        </label>
        <input
          type='tel'
          value={fields.phoneNumber}
          onChange={(e) => setField('phoneNumber', e.target.value)}
          placeholder='+84912345678'
          className={cn(
            'w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:outline-none',
            errors.phoneNumber
              ? 'border-destructive focus:border-destructive focus:ring-destructive'
              : 'border-input focus:border-primary focus:ring-ring'
          )}
        />
        <p className='text-xs text-muted-foreground'>{t('accountInfo.phoneNumberHint')}</p>
        {errors.phoneNumber && <p className='text-xs text-destructive'>{errors.phoneNumber}</p>}
      </div>

      {/* Read-only fields */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-1'>
          <label className='block text-sm font-medium text-muted-foreground'>
            {t('accountInfo.email')}
          </label>
          <p className='rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground'>
            {data.email}
          </p>
        </div>

        <div className='space-y-1'>
          <label className='block text-sm font-medium text-muted-foreground'>
            {t('accountInfo.role')}
          </label>
          <p className='rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground'>
            {t(`accountInfo.roleEnum.${data.role}`, { defaultValue: data.role })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className='flex items-center justify-end gap-3 border-t border-border pt-4'>
        <Button type='button' variant='ghost' onClick={onCancel} disabled={isSubmitting}>
          <X className='h-4 w-4' />
          {t('cancel')}
        </Button>
        <Button type='submit' disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
          {isSubmitting ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}
