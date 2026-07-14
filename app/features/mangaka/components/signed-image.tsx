import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { useSignedImageUrl } from '../hooks/use-signed-image-url'

type SignedImageProps = {
  /** R2 object key returned by BE (e.g. cover, characterDesign, name page file). */
  r2Key: string | null | undefined
  alt: string
  className?: string
  imgClassName?: string
  /** Force-fit container to this aspect (Tailwind class, e.g. 'aspect-[3/4]'). */
  aspectClassName?: string
}

/**
 * Render an `<img>` from an R2 object key by first asking BE for a presigned
 * GET URL.
 *
 * - `r2Key` falsy → renders a slot with a "no image" hint (initials fallback
 *   is caller's responsibility via `fallback`).
 * - While signing: muted skeleton.
 * - On error: muted placeholder with ImageIcon + alt text.
 * - On success: <img> with `loading="lazy"` + a broken-link fallback handler.
 */
export function SignedImage({
  r2Key,
  alt,
  className,
  imgClassName,
  aspectClassName = 'aspect-[3/4]'
}: SignedImageProps) {
  const signed = useSignedImageUrl(r2Key ?? null)
  const [imgErrored, setImgErrored] = useState(false)

  const containerCls = cn(
    'relative overflow-hidden rounded-md bg-muted/40',
    aspectClassName,
    className
  )

  // No key at all — render empty muted placeholder.
  if (!r2Key) {
    return (
      <div className={containerCls} aria-label={alt}>
        <div className='absolute inset-0 flex items-center justify-center'>
          <ImageIcon className='h-6 w-6 text-muted-foreground/40' />
        </div>
      </div>
    )
  }

  // Signing in progress.
  if (signed.status === 'loading' || signed.status === 'idle') {
    return (
      <div className={containerCls} aria-label={alt} aria-busy='true'>
        <div className='absolute inset-0 animate-pulse bg-muted/60' />
      </div>
    )
  }

  // Sign failed.
  if (signed.status === 'error' || (signed.status === 'ready' && imgErrored)) {
    return (
      <div className={containerCls} aria-label={alt}>
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/60'>
          <ImageIcon className='h-6 w-6' />
        </div>
      </div>
    )
  }

  // Signed and ready.
  return (
    <div className={containerCls} aria-label={alt}>
      <img
        src={signed.url}
        alt={alt}
        loading='lazy'
        decoding='async'
        onError={() => setImgErrored(true)}
        className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)}
      />
    </div>
  )
}
