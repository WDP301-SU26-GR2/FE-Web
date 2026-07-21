import { useState } from 'react'
import { ImageIcon } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { ImageRegionOverlay, type ImageRegion } from '~/shared/components/image-region-overlay'
import { useTaskSignedUrl } from '../lib/use-task-signed-url'

export type TaskSignedImageProps = {
  /** R2 object key for a task file (pageOriginalFile or versions[].file). */
  taskId: string | undefined
  r2Key: string | null | undefined
  alt: string
  className?: string
  imgClassName?: string
  /** Force-fit container to this aspect (Tailwind class, e.g. 'aspect-[3/4]'). */
  aspectClassName?: string
  regions?: ImageRegion[] | null
}

/**
 * Render an `<img>` from an R2 object key that belongs to a task.
 *
 * Uses `POST /tasks/:id/download-url` (via `useTaskSignedUrl`) instead of
 * `/uploads/sign-download` because task files require task-level authorization
 * (Mangaka/Assistant/Editor/Board/Admin relationship).
 *
 * See `useTaskSignedUrl` for caching and auto-refresh behaviour.
 */
export function TaskSignedImage({
  taskId,
  r2Key,
  alt,
  className,
  imgClassName,
  aspectClassName = 'aspect-[3/4]',
  regions
}: TaskSignedImageProps) {
  const signed = useTaskSignedUrl(taskId, r2Key ?? null)
  const [imgErrored, setImgErrored] = useState(false)

  const containerCls = cn('relative overflow-hidden rounded-md bg-muted/40', aspectClassName, className)

  if (!r2Key) {
    return (
      <div className={containerCls} aria-label={alt}>
        <div className='absolute inset-0 flex items-center justify-center'>
          <ImageIcon className='h-6 w-6 text-muted-foreground/40' />
        </div>
      </div>
    )
  }

  if (signed.status === 'loading' || signed.status === 'idle') {
    return (
      <div className={containerCls} aria-label={alt} aria-busy='true'>
        <div className='absolute inset-0 animate-pulse bg-muted/60' />
      </div>
    )
  }

  if (signed.status === 'error' || (signed.status === 'ready' && imgErrored)) {
    return (
      <div className={containerCls} aria-label={alt}>
        <div className='absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground/60'>
          <ImageIcon className='h-6 w-6' />
        </div>
      </div>
    )
  }

  return (
    <div className={containerCls} aria-label={alt}>
      <ImageRegionOverlay
        src={signed.url}
        alt={alt}
        loading='lazy'
        decoding='async'
        onError={() => setImgErrored(true)}
        regions={regions}
        containerClassName='absolute inset-0 flex items-center justify-center'
        className={cn('block max-h-full max-w-full object-contain', imgClassName)}
      />
    </div>
  )
}
