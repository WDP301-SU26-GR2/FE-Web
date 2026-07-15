import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'

export type PendingPage = {
  /** Local id used for React keys. */
  id: string
  file: File
  previewUrl: string
}

export type CreateNameDialogProps = {
  open: boolean
  /** Chapter id — kept on the props so the parent owns the URL context; not used inside. */
  chapterId: string | null
  isSubmitting: boolean
  /** Submit handler returns true on success (caller closes), false otherwise. */
  onConfirm: (pages: { pageNumber: number; fileUrl: string }[]) => Promise<boolean>
  onCancel: () => void
  /** When editing an existing Name, allow setting page numbers manually. */
  startingPageNumber?: number
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

/**
 * Dialog for "Create Name" — multi-file upload to R2 (per page) + POST.
 *
 * - Body scroll locked while open. Escape closes when not submitting.
 * - Each queued file shows a preview via `URL.createObjectURL`; we revoke the
 *   URL on close / removal to avoid leaking.
 * - Uploads fan out sequentially per file to avoid hammering R2. We surface
 *   per-file errors inline; the user can retry the failed row or remove it.
 */
export function CreateNameDialog({
  open,
  isSubmitting,
  onConfirm,
  onCancel,
  startingPageNumber = 1
}: CreateNameDialogProps) {
  const { t } = useTranslation('mangaka')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const [pending, setPending] = useState<PendingPage[]>([])
  const [error, setError] = useState<string | null>(null)

  // Reset form when opening.
  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setPending([])
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open])

  // Body scroll lock + Escape handler.
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

  // Revoke object URLs on unmount/close to avoid leaks.
  useEffect(() => {
    return () => {
      for (const p of pending) URL.revokeObjectURL(p.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const next: PendingPage[] = []
    for (const f of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        setError(t('upload.errors.invalidType'))
        continue
      }
      if (f.size > MAX_BYTES) {
        setError(t('upload.errors.tooLarge'))
        continue
      }
      next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file: f, previewUrl: URL.createObjectURL(f) })
    }
    setPending((prev) => [...prev, ...next])
    setError(null)
  }

  const removeAt = (idx: number) => {
    setPending((prev) => {
      const removed = prev[idx]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting || pending.length === 0) return
    setError(null)
    try {
      const uploaded: { pageNumber: number; fileUrl: string }[] = []
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i]
        // Storyboard uploads reuse the OTHER bucket — the BE doesn't have a
        // dedicated CHAPTER_NAME enum and these are still "reference / source"
        // artwork from the Mangaka's side.
        const key = await uploadToR2(p.file, SignUploadBodyDtoAssetType.OTHER)
        uploaded.push({ pageNumber: startingPageNumber + i, fileUrl: key })
      }
      const ok = await onConfirm(uploaded)
      if (ok) {
        // Cleanup previews on success.
        for (const p of pending) URL.revokeObjectURL(p.previewUrl)
        setPending([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('publication.error.generic'))
    }
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='create-name-dialog-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={cn('relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl')}
      >
        <div className='space-y-4 overflow-y-auto p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h2 id='create-name-dialog-title' className='text-base font-semibold text-foreground'>
                {t('publication.nameSection.create.dialogTitle')}
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                {t('publication.nameSection.create.dialogDescription')}
              </p>
            </div>
            <button
              type='button'
              onClick={onCancel}
              disabled={isSubmitting}
              className='rounded-md p-1 text-muted-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
              aria-label={t('publication.close')}
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          {/* Drop zone */}
          <div>
            <input
              ref={fileInputRef}
              type='file'
              accept={ALLOWED_TYPES.join(',')}
              multiple
              disabled={isSubmitting}
              onChange={(e) => addFiles(e.target.files)}
              className='sr-only'
              aria-hidden='true'
            />
            <button
              type='button'
              disabled={isSubmitting}
              onClick={() => fileInputRef.current?.click()}
              className='flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Plus className='h-5 w-5' />
              <span className='font-medium text-foreground'>{t('publication.nameSection.create.chooseFiles')}</span>
              <span className='text-xs'>{t('publication.nameSection.create.allowedHint')}</span>
            </button>
          </div>

          {/* Preview list */}
          {pending.length > 0 && (
            <ul className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5'>
              {pending.map((p, idx) => (
                <li key={p.id} className='space-y-1.5'>
                  <div className='relative'>
                    <img
                      src={p.previewUrl}
                      alt={p.file.name}
                      className='aspect-[3/4] w-full rounded-md object-cover'
                    />
                    <button
                      type='button'
                      disabled={isSubmitting}
                      onClick={() => removeAt(idx)}
                      className='absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50'
                      aria-label={t('publication.nameSection.create.removeFile')}
                    >
                      <Trash2 className='h-3 w-3' />
                    </button>
                    <span className='absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                      #{startingPageNumber + idx}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div role='alert' className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive'>
              {error}
            </div>
          )}
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button ref={cancelRef} type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('publication.cancel')}
          </Button>
          <Button type='submit' variant='primary' size='sm' disabled={isSubmitting || pending.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('publication.nameSection.create.submitting')}
              </>
            ) : (
              <>
                <Plus className='h-3.5 w-3.5' />
                {t('publication.nameSection.create.confirm')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
