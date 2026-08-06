import { useEffect, useState } from 'react'
import { ExternalLink, Maximize2, X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

export interface ImagePreviewProps {
  src: string
  alt: string
  title: string
  description?: string
  openOriginalLabel: string
  imageClassName?: string
  triggerClassName?: string
  iconClassName?: string
  loading?: 'eager' | 'lazy'
}

export function ImagePreview({
  src,
  alt,
  title,
  description,
  openOriginalLabel,
  imageClassName,
  triggerClassName,
  iconClassName,
  loading = 'lazy'
}: ImagePreviewProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'group relative block overflow-hidden text-left focus-visible:outline-2 focus-visible:outline-ring',
          triggerClassName
        )}
      >
        <img src={src} alt={alt} className={imageClassName} loading={loading} />
        <span className='absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition-all group-hover:bg-foreground/20 group-hover:opacity-100 group-focus-visible:bg-foreground/20 group-focus-visible:opacity-100'>
          <span
            className={cn(
              'inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm',
              iconClassName
            )}
          >
            <Maximize2 className='size-4' />
          </span>
        </span>
      </button>
      {open && (
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby={`image-preview-${stableId(src)}-title`}
          aria-describedby={description ? `image-preview-${stableId(src)}-description` : undefined}
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 py-6 backdrop-blur-[2px] sm:px-8'
          onClick={() => setOpen(false)}
        >
          <div className='absolute left-4 top-4 right-4 z-10 flex items-start justify-between gap-3 text-white sm:left-6 sm:right-6 sm:top-5'>
            <div className='min-w-0'>
              <h2 id={`image-preview-${stableId(src)}-title`} className='truncate text-sm font-bold'>
                {title}
              </h2>
              {description && (
                <p id={`image-preview-${stableId(src)}-description`} className='mt-0.5 truncate text-xs text-white/70'>
                  {description}
                </p>
              )}
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <a
                href={src}
                target='_blank'
                rel='noreferrer'
                onClick={(event) => event.stopPropagation()}
                className='inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/10 px-3 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70'
              >
                <ExternalLink className='size-4' />
                <span className='hidden sm:inline'>{openOriginalLabel}</span>
              </a>
              <button
                type='button'
                onClick={(event) => {
                  event.stopPropagation()
                  setOpen(false)
                }}
                aria-label='Close'
                className='inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/70'
              >
                <X className='size-5' />
              </button>
            </div>
          </div>
          <div
            className='flex h-full w-full items-center justify-center pt-12'
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className='block max-h-[calc(100vh-6rem)] max-w-[calc(100vw-2rem)] object-contain shadow-2xl sm:max-w-[calc(100vw-4rem)]'
            />
          </div>
        </div>
      )}
    </>
  )
}

function stableId(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash.toString(36)
}
