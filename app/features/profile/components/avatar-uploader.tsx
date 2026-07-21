import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Upload } from 'lucide-react'

import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { SignedImage } from '~/shared/components/signed-image'
import { cn } from '~/shared/lib/cn'

type AvatarUploaderProps = {
  /** Current R2 key (null = no avatar). */
  value: string | null
  /** Called with the new R2 key after upload, or null after removal. */
  onChange: (key: string | null) => void
  /** Disable interactions. */
  disabled?: boolean
}

const MAX_BYTES = 15 * 1024 * 1024

/**
 * Single-image avatar uploader.
 *
 * - Shows preview via SignedImage when a key exists.
 * - "Change" opens a file picker, validates type + size, then calls
 *   `uploadToR2` (presigned PUT) with assetType AVATAR.
 * - "Remove" sets the key to null (backend receives empty string → clears field).
 */
export function AvatarUploader({ value, onChange, disabled }: AvatarUploaderProps) {
  const { t } = useTranslation('profile')
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setLocalError(null)

    if (!ALLOWED_TYPES.has(file.type)) {
      setLocalError(t('avatar.errors.type'))
      return
    }
    if (file.size > MAX_BYTES) {
      setLocalError(t('avatar.errors.size', { max: 15 }))
      return
    }

    setIsUploading(true)
    try {
      const { key, error } = await uploadToR2WithMessage(
        file,
        t('avatar.errors.uploadGeneric'),
        'REFERENCE'
      )
      if (key) {
        onChange(key)
      } else {
        setLocalError(error ?? t('avatar.errors.uploadGeneric'))
      }
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove() {
    if (disabled) return
    onChange(null)
  }

  return (
    <div className='flex flex-col items-center gap-3'>
      {/* Preview circle */}
      <div className='relative'>
        {value ? (
          <SignedImage
            r2Key={value}
            alt={t('avatar.alt')}
            aspectClassName='h-24 w-24 rounded-full object-cover'
            className='h-24 w-24 rounded-full border-2 border-border'
          />
        ) : (
          <div className='flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted text-3xl font-bold text-muted-foreground'>
            ?
          </div>
        )}

        {/* Upload overlay on hover */}
        {!disabled && (
          <button
            type='button'
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className='absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100'
            aria-label={t('avatar.change')}
          >
            {isUploading ? (
              <Loader2 className='h-6 w-6 animate-spin text-white' />
            ) : (
              <Upload className='h-6 w-6 text-white' />
            )}
          </button>
        )}
      </div>

      {/* Actions */}
      {!disabled && (
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors',
              'bg-background text-foreground hover:bg-muted/50',
              isUploading && 'cursor-not-allowed opacity-60'
            )}
          >
            <ImagePlus className='h-4 w-4' />
            {isUploading ? t('avatar.uploading') : t('avatar.change')}
          </button>

          {value && (
            <button
              type='button'
              onClick={handleRemove}
              className='inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10'
            >
              {t('avatar.remove')}
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp'
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        aria-label={t('avatar.change')}
      />

      {localError && <p className='text-sm text-destructive'>{localError}</p>}
      <p className='text-xs text-muted-foreground'>{t('avatar.hint')}</p>
    </div>
  )
}

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
