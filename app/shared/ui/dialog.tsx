import { createContext, useContext, useEffect, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

export type DialogProps = {
  open: boolean
  onClose: () => void
  /** Stable id used by `aria-labelledby`. */
  titleId: string
  title: ReactNode
  /** Optional description linked by `aria-describedby`. */
  descriptionId?: string
  description?: ReactNode
  /** Body content. Scrolled independently if it overflows. */
  children: ReactNode
  /** Optional footer (sticky bottom). */
  footer?: ReactNode
  /** Width preset. Default: `md`. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Custom max-width override (e.g. `max-w-2xl`). Wins over `size`. */
  className?: string
}

const SIZE_CLASS: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
}

const DialogCloseContext = createContext<(() => void) | null>(null)

export function useDialogClose() {
  return useContext(DialogCloseContext)
}

/**
 * Lightweight modal dialog built with plain Tailwind — no Radix.
 *
 * - Slide/fade in via the `open` flag (parent controls whether to mount).
 * - Locks body scroll and listens for ESC while open.
 * - Click on the overlay closes; click on the panel does NOT propagate.
 * - Use `titleId` consistently so multiple dialogs on the same page remain
 *   uniquely identifiable to assistive tech.
 */
export function Dialog({
  open,
  onClose,
  titleId,
  title,
  descriptionId,
  description,
  children,
  footer,
  size = 'md',
  className
}: DialogProps) {
  // Lock body scroll + ESC handler while open.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if ((e as KeyboardEvent).key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey as never)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey as never)
    }
  }, [open, onClose])

  if (!open) return null

  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div role='presentation' className='fixed inset-0 z-50 flex items-center justify-center px-4 py-6'>
      <div aria-hidden='true' onClick={onClose} className='absolute inset-0 bg-black/60 backdrop-blur-sm' />
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={stopProp}
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl',
          SIZE_CLASS[size],
          'max-h-[calc(100vh-3rem)]',
          className
        )}
      >
        <header className='flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4'>
          <div className='min-w-0 flex-1'>
            <h2 id={titleId} className='text-base font-bold tracking-tight'>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className='mt-0.5 text-xs text-muted-foreground'>
                {description}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Close'
            className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <X className='h-5 w-5' />
          </button>
        </header>
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          <DialogCloseContext.Provider value={onClose}>{children}</DialogCloseContext.Provider>
        </div>
        {footer && <footer className='shrink-0 border-t border-border px-5 py-3'>{footer}</footer>}
      </div>
    </div>
  )
}
