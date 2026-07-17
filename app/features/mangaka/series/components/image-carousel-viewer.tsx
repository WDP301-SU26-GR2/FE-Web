import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { useSignedImageUrl } from '~/shared/hooks/use-signed-image-url'

export type ImageCarouselItem = {
  /** Stable identifier (used only for React key on the underlying url fetch). */
  id: string
  /** R2 object key to render. Falsy values render a neutral placeholder. */
  r2Key: string | null
  /** Accessible label for this image (passed to `<img alt>`). */
  alt: string
}

export type ImageCarouselViewerProps = {
  items: ImageCarouselItem[]
  /** 0-based index of the image to show first when opened. */
  startIndex?: number
  /** Render control. When false, the component returns null. */
  open: boolean
  onClose: () => void
}

/**
 * Full-screen lightbox for an arbitrary list of R2-backed images, with
 * prev/next paging and a `"5 / 50"`-style counter at the bottom.
 *
 * UX conventions:
 *   - Left/Right keyboard arrows = prev/next
 *   - Escape = close
 *   - Backdrop click = close
 *   - Body scroll lock while open
 *   - Prev hidden at the first image; next hidden at the last (so users don't
 *     keep paging past the end)
 *
 * Performance: only the active image's signed URL is fetched at a time
 * (`<SignedImage>` style); the prev/next placeholders render a skeleton until
 * their turn comes. We intentionally don't try to preload neighbours — the
 * shared `signKey` cache inside `useSignedImageUrl` already de-duplicates work
 * for previously-seen keys.
 */
export function ImageCarouselViewer({ items, startIndex = 0, open, onClose }: ImageCarouselViewerProps) {
  const { t } = useTranslation('mangaka')

  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0))
  )

  // Re-sync the active image whenever the dialog is freshly opened (handled via
  // the `prevOpenRef` dance — setState inside an effect body is flagged by
  // react-hooks/set-state-in-effect, but this transition is unavoidable since
  // `startIndex` only takes effect once `open` flips to true).
  const prevOpenRef = useRef(false)
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open
    if (!open || wasOpen) return
    setIndex(Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)))
  }, [open, startIndex, items.length])

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(items.length - 1, i + 1))
  }, [items.length])

  // Keyboard handler (←/→/Esc) + body scroll lock while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, goPrev, goNext])

  if (!open) return null

  const safeIndex = Math.min(Math.max(index, 0), Math.max(items.length - 1, 0))
  const current = items[safeIndex]
  const total = items.length

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-label={current?.alt ?? t('lightbox.stripGroupLabel')}
      className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6'
      onClick={onClose}
    >
      {/* Close button */}
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

      {/* Image area + side buttons share a row so arrows stay vertically
          centered to the picture, not to the whole viewport. */}
      <div
        className='flex w-full max-w-[min(90vw,1400px)] flex-1 items-center justify-center gap-3 sm:gap-6'
        onClick={(e) => e.stopPropagation()}
      >
        {total > 1 && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            disabled={safeIndex === 0}
            aria-label={t('lightbox.previous')}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer',
              safeIndex === 0 && 'cursor-not-allowed opacity-30 hover:bg-black/50'
            )}
          >
            <ChevronLeft className='h-5 w-5' aria-hidden='true' />
          </button>
        )}

        <div className='flex max-h-[75vh] flex-1 items-center justify-center overflow-hidden rounded-lg bg-card shadow-2xl'>
          {total === 0 || !current ? (
            <div className='flex h-64 w-80 items-center justify-center text-muted-foreground'>
              {t('lightbox.loading')}
            </div>
          ) : (
            <ActiveImage r2Key={current.r2Key} alt={current.alt} />
          )}
        </div>

        {total > 1 && (
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            disabled={safeIndex >= total - 1}
            aria-label={t('lightbox.next')}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer',
              safeIndex >= total - 1 && 'cursor-not-allowed opacity-30 hover:bg-black/50'
            )}
          >
            <ChevronRight className='h-5 w-5' aria-hidden='true' />
          </button>
        )}
      </div>

      {/* Counter — bottom center, above the bottom edge with some breathing room. */}
      {total > 0 && (
        <div
          className='mt-4 select-none rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white tabular-nums'
          aria-live='polite'
          onClick={(e) => e.stopPropagation()}
        >
          {t('lightbox.counter', { current: safeIndex + 1, total })}
        </div>
      )}
    </div>
  )
}

/**
 * Internal: renders the active image and re-uses `useSignedImageUrl` for the
 * presigned-GET, including its loading/error states.
 */
function ActiveImage({ r2Key, alt }: { r2Key: string | null; alt: string }) {
  const { t } = useTranslation('mangaka')
  const signed = useSignedImageUrl(r2Key)

  if (!r2Key) {
    return (
      <div className='flex h-64 w-80 items-center justify-center text-muted-foreground'>
        {t('lightbox.loading')}
      </div>
    )
  }

  if (signed.status === 'loading' || signed.status === 'idle') {
    return (
      <div className='flex h-64 w-80 items-center justify-center text-muted-foreground'>
        {t('lightbox.loading')}
      </div>
    )
  }

  if (signed.status === 'error') {
    return (
      <div className='flex h-64 w-80 items-center justify-center text-muted-foreground'>
        {t('lightbox.failedToLoad')}
      </div>
    )
  }

  return (
    <img
      src={signed.url}
      alt={alt}
      className='block max-h-[75vh] w-auto object-contain'
      draggable={false}
    />
  )
}
