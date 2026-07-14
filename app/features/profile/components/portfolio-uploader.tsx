import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, X } from 'lucide-react'

import { uploadToR2WithMessage } from '~/shared/lib/upload/upload-to-r2'
import { SignedImage } from '~/shared/components/signed-image'

type PortfolioUploaderProps = {
  /** R2 keys the user already has stored. */
  keys: string[]
  /** Called after the keys change (add or remove). */
  onChange: (keys: string[]) => void
  /** Disable remove + upload. */
  disabled?: boolean
}

const MAX_FILES = 6

/**
 * Upload + reorder-free portfolio uploader for the profile page.
 *
 * - Pre-existing keys render as previews via {@link SignedImage} (which asks
 *   BE for a presigned GET URL on demand).
 * - "Add" picks a local file, validates type + size, then calls
 *   `uploadToR2` (presigned PUT). On success the new key is appended to
 *   the parent's `keys` array.
 * - "Remove" deletes by key from the local array — it does NOT ask BE to
 *   delete the R2 object (out of scope for this MVP; orphan cleanup is a
 *   cron-side concern).
 *
 * Validation mirrors §5 of FE-API-Guide-v2.md:
 *   - contentType ∈ { image/png, image/jpeg, image/webp, application/pdf }
 *   - size ≤ 15MB
 */
export function PortfolioUploader({ keys, onChange, disabled }: PortfolioUploaderProps) {
  const { t } = useTranslation('profile')
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setLocalError(null)
    const room = MAX_FILES - keys.length
    if (room <= 0) {
      setLocalError(t('errors.portfolioLimit', { max: MAX_FILES }))
      return
    }
    const toUpload = Array.from(files).slice(0, room)
    const nextKeys = [...keys]
    setIsUploading(true)
    try {
      for (const file of toUpload) {
        if (!isAllowedType(file.type)) {
          setLocalError(t('errors.portfolioType'))
          break
        }
        if (file.size > MAX_BYTES) {
          setLocalError(t('errors.portfolioSize', { max: 15 }))
          break
        }
        const { key, error } = await uploadToR2WithMessage(
          file,
          t('errors.uploadGeneric'),
          'REFERENCE'
        )
        if (!key) {
          setLocalError(error ?? t('errors.uploadGeneric'))
          break
        }
        nextKeys.push(key)
      }
      onChange(nextKeys)
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove(key: string) {
    if (disabled) return
    onChange(keys.filter((k) => k !== key))
  }

  const slotsLeft = MAX_FILES - keys.length

  return (
    <div className='space-y-2'>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
        {keys.map((key) => (
          <div
            key={key}
            className='group relative overflow-hidden rounded-md border border-border bg-muted/40'
          >
            <SignedImage
              r2Key={key}
              alt={t('portfolioAlt', { key })}
              aspectClassName='aspect-square'
            />
            {!disabled && (
              <button
                type='button'
                onClick={() => handleRemove(key)}
                className='absolute top-1 right-1 rounded-full bg-background/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                aria-label={t('removePortfolio')}
              >
                <X className='h-3.5 w-3.5' />
              </button>
            )}
          </div>
        ))}
        {slotsLeft > 0 && !disabled && (
          <button
            type='button'
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className='flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {isUploading ? (
              <Loader2 className='h-5 w-5 animate-spin' />
            ) : (
              <ImagePlus className='h-5 w-5' />
            )}
            <span className='text-xs font-medium'>{t('addPortfolio')}</span>
            <span className='text-[10px] text-muted-foreground/70'>
              {t('portfolioSlotsLeft', { count: slotsLeft })}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp,application/pdf'
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
        aria-label={t('addPortfolio')}
      />
      {localError && <p className='text-sm text-destructive'>{localError}</p>}
      {!disabled && (
        <p className='text-xs text-muted-foreground'>{t('portfolioHint')}</p>
      )}
    </div>
  )
}

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf'
])
const MAX_BYTES = 15 * 1024 * 1024

function isAllowedType(type: string): boolean {
  return ALLOWED_TYPES.has(type)
}