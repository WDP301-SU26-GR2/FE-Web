import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookPlus, Loader2 } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'

export type CreateChapterDialogProps = {
  /** Series the new chapter belongs to (prefilled, read-only). */
  seriesId: string
  /** Highest existing chapterNumber on the series — used as default next #. */
  nextChapterNumber: number
  isSubmitting: boolean
  open: boolean
  onCancel: () => void
  /**
   * Submit the form. Returns true on success (so caller can close + refresh)
   * and false on failure (caller keeps dialog open with the toast already
   * fired inside the hook).
   */
  onConfirm: (input: { chapterNumber: number; title?: string }) => Promise<boolean>
}

/**
 * Dialog for "Create new chapter" inside the Publication section.
 *
 * - Body scroll is locked while open; Escape closes when not submitting.
 * - BE auto-matches the latest APPROVED Name of the series to seed the
 *   Manuscript + Schedule, so FE no longer sends a nameId.
 * - chapterNumber defaults to `nextChapterNumber` (existing max + 1) and
 *   must be a positive integer ≥ 1.
 */
export function CreateChapterDialog({
  seriesId,
  nextChapterNumber,
  isSubmitting,
  open,
  onCancel,
  onConfirm
}: CreateChapterDialogProps) {
  const { t } = useTranslation('mangaka')
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [chapterNumber, setChapterNumber] = useState<string>(String(nextChapterNumber))
  const [title, setTitle] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  // Reset form whenever the dialog re-opens, picking up the latest
  // defaults (e.g. next chapter number after the previous create).
  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setChapterNumber(String(nextChapterNumber))
    setTitle('')
    setFormError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, nextChapterNumber])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    cancelRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, isSubmitting, onCancel])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return

    const num = Number(chapterNumber)
    if (!Number.isInteger(num) || num < 1) {
      setFormError(t('seriesDetail.publication.create.errorInvalidNumber'))
      return
    }
    setFormError(null)
    const trimmedTitle = title.trim()
    const ok = await onConfirm({
      chapterNumber: num,
      title: trimmedTitle.length > 0 ? trimmedTitle : undefined
    })
    // On success, the parent closes the dialog. On failure the toast is
    // already fired by the hook — we leave the dialog open so the user
    // can correct inputs without losing them.
    if (ok) {
      setTitle('')
    }
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='create-chapter-dialog-title'
      aria-describedby='create-chapter-dialog-desc'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={cn('relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl')}
      >
        <div className='space-y-4 p-5'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <BookPlus className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <h2 id='create-chapter-dialog-title' className='text-base font-semibold text-foreground'>
                {t('seriesDetail.publication.create.dialogTitle')}
              </h2>
              <p id='create-chapter-dialog-desc' className='mt-1 text-sm text-muted-foreground'>
                {t('seriesDetail.publication.create.dialogDescription')}
              </p>
            </div>
          </div>

          {/* Series (read-only) */}
          <div>
            <label className='mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
              {t('seriesDetail.publication.create.seriesLabel')}
            </label>
            <div className='rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground'>
              {seriesId}
            </div>
          </div>

          {/* chapterNumber */}
          <div>
            <label
              htmlFor='create-chapter-number'
              className='mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
            >
              {t('seriesDetail.publication.create.chapterNumberLabel')}
            </label>
            <input
              id='create-chapter-number'
              type='number'
              min={1}
              step={1}
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              disabled={isSubmitting}
              required
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            />
          </div>

          {/* title (optional) */}
          <div>
            <label
              htmlFor='create-chapter-title'
              className='mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'
            >
              {t('seriesDetail.publication.create.titleLabel')}
            </label>
            <input
              id='create-chapter-title'
              type='text'
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('seriesDetail.publication.create.titlePlaceholder')}
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60'
              )}
            />
          </div>

          {formError && (
            <div
              role='alert'
              className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive'
            >
              {formError}
            </div>
          )}
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button ref={cancelRef} type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('seriesDetail.publication.create.cancel')}
          </Button>
          <Button type='submit' variant='primary' size='sm' disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('seriesDetail.publication.create.creating')}
              </>
            ) : (
              <>
                <BookPlus className='h-3.5 w-3.5' />
                {t('seriesDetail.publication.create.confirm')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}