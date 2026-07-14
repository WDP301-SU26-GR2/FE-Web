import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Send } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'

type SubmitSeriesDialogProps = {
  /** Series title — used in the dialog body for clarity. */
  seriesTitle: string
  /** Whether the underlying POST /series/:id/submit request is in flight. */
  isSubmitting: boolean
  open: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Confirmation modal for the Mangaka "Submit series for review" action.
 *
 * - Backdrop click & Escape key dismiss the dialog (only when not submitting).
 * - Body scroll is locked while open.
 * - Confirm button is disabled while the request is in flight and shows a
 *   spinner. Cancel stays available so the user can abort the visual state
 *   (the in-flight request will still resolve).
 */
export function SubmitSeriesDialog({ seriesTitle, isSubmitting, open, onCancel, onConfirm }: SubmitSeriesDialogProps) {
  const { t } = useTranslation('mangaka')
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    // Move focus to the safer default (Cancel) on open so an accidental Enter
    // doesn't fire the destructive confirm.
    cancelRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, isSubmitting, onCancel])

  if (!open) return null

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='submit-series-dialog-title'
      aria-describedby='submit-series-dialog-desc'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <div
        className={cn('relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='space-y-3 p-5'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <Send className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <h2 id='submit-series-dialog-title' className='text-base font-semibold text-foreground'>
                {t('seriesDetail.submit.dialogTitle')}
              </h2>
              <p id='submit-series-dialog-desc' className='mt-1 text-sm text-muted-foreground'>
                {t('seriesDetail.submit.dialogDescription', { title: seriesTitle })}
              </p>
            </div>
          </div>

          <ul className='ml-12 list-disc space-y-1 text-xs text-muted-foreground'>
            <li>{t('seriesDetail.submit.bullet1')}</li>
            <li>{t('seriesDetail.submit.bullet2')}</li>
            <li>{t('seriesDetail.submit.bullet3')}</li>
          </ul>
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button ref={cancelRef} type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('seriesDetail.submit.cancel')}
          </Button>
          <Button type='button' variant='primary' size='sm' disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('seriesDetail.submit.submitting')}
              </>
            ) : (
              <>
                <Send className='h-3.5 w-3.5' />
                {t('seriesDetail.submit.confirm')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
