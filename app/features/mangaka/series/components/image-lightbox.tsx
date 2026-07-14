import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { useSignedImageUrl } from '~/shared/hooks/use-signed-image-url'

type ImageLightboxProps = {
  /** R2 object key of the image to preview. */
  r2Key: string
  alt: string
  open: boolean
  onClose: () => void
}

/**
 * Full-page overlay that previews a single image (sign-downloads the R2 key
 * and renders the resolved URL inside a centered frame).
 *
 * - Press Escape or click the backdrop to close.
 * - Scroll lock on body while open.
 */
export function ImageLightbox({ r2Key, alt, open, onClose }: ImageLightboxProps) {
  const { t } = useTranslation('mangaka')
  const signed = useSignedImageUrl(open ? r2Key : null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={alt}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6'
      onClick={onClose}
    >
      <button
        type='button'
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label={t('lightbox.closePreview')}
        className='absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer'
      >
        <X className='h-5 w-5' />
      </button>

      <div
        className='relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg bg-card shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {signed.status === 'loading' && (
          <div className='flex h-64 w-80 items-center justify-center text-muted-foreground'>
            {t('lightbox.loading')}
          </div>
        )}
        {signed.status === 'error' && (
          <div className='flex h-64 w-80 flex-col items-center justify-center gap-2 text-muted-foreground'>
            <span>{t('lightbox.failedToLoad')}</span>
          </div>
        )}
        {signed.status === 'ready' && (
          <img src={signed.url} alt={alt} className={cn('block max-h-[85vh] w-auto object-contain')} />
        )}
      </div>
    </div>
  )
}
