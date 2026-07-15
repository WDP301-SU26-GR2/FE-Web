import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, X } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'
import { SignedImage } from '~/shared/components/signed-image'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'

export type EditableExistingPage = {
  /** pageNumber currently saved on BE. */
  pageNumber: number
  /** R2 object key from existing Name. */
  fileUrl: string
}

export type PendingPage = {
  id: string
  file: File
  previewUrl: string
}

export type EditNameDialogProps = {
  open: boolean
  /** Chapter id — kept on the props so the parent owns the URL context; not used inside. */
  chapterId: string
  isSubmitting: boolean
  /** Pages the Name currently holds (as fetched from BE). */
  existingPages: EditableExistingPage[]
  /** Submit handler receives the FULL replaced list (`existing kept + new appended`). */
  onConfirm: (pages: { pageNumber: number; fileUrl: string }[]) => Promise<boolean>
  onCancel: () => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

/**
 * Dialog for "Edit Name" — granular edit: show the existing pages fetched
 * from BE, let the Mangaka:
 *   - remove existing pages (kept locally until Save)
 *   - append new pages via multi-file upload to R2
 *   - reorder pages via drag-and-drop is out of scope; we assign
 *     `pageNumber` deterministically on Save as `1..N` in current visual order.
 *
 * Single BE round-trip on Save: `PUT /chapters/:id/names/:nameId/pages`
 * replaces the whole array. This matches the API contract and avoids the
 * "DELETE then re-create" anti-pattern called out in the doc §10.5.
 */
export function EditNameDialog({
  open,
  isSubmitting,
  existingPages,
  onConfirm,
  onCancel
}: EditNameDialogProps) {
  const { t } = useTranslation('mangaka')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Local edit state — a snapshot of existing pages the user can prune, plus
  // appended pages from upload. Initialised from `existingPages` when the
  // dialog opens.
  const [kept, setKept] = useState<EditableExistingPage[]>([])
  const [pending, setPending] = useState<PendingPage[]>([])
  const [error, setError] = useState<string | null>(null)

  // Initialise when the dialog opens — safe because we only do it when `open`
  // transitions to true.
  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setKept(existingPages.map((p) => ({ ...p })))
    setPending([])
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, existingPages])

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

  // Revoke any object URLs when the dialog closes or unmounts.
  useEffect(() => {
    return () => {
      for (const p of pending) URL.revokeObjectURL(p.previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const totalCount = kept.length + pending.length

  const mergedVisual = useMemo(() => {
    // Existing pages first (in their original pageNumber order), then
    // pending uploads in append order. Final pageNumber gets reassigned on
    // Save to 1..N so BE never sees gaps.
    const keptSorted = [...kept].sort((a, b) => a.pageNumber - b.pageNumber)
    return [
      ...keptSorted.map<ExistingRow>((p, i) => ({
        kind: 'existing',
        key: `existing-${p.pageNumber}-${i}`,
        pageNumber: p.pageNumber,
        fileUrl: p.fileUrl,
        index: i
      })),
      ...pending.map<NewRow>((p, i) => ({
        kind: 'pending',
        key: p.id,
        previewUrl: p.previewUrl,
        file: p.file,
        pageNumber: keptSorted.length + i + 1,
        index: keptSorted.length + i
      }))
    ]
  }, [kept, pending])

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
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        previewUrl: URL.createObjectURL(f)
      })
    }
    setPending((prev) => [...prev, ...next])
    setError(null)
  }

  const removeExistingAt = (idx: number) => {
    setKept((prev) => prev.filter((_, i) => i !== idx))
  }

  const removePendingAt = (idx: number) => {
    setPending((prev) => {
      const removed = prev[idx]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return
    if (kept.length === 0 && pending.length === 0) {
      // Empty Name makes no sense — the BE create endpoint rejects it, and
      // here it would auto-send IN_REVIEW with zero pages. Block upfront.
      setError(t('publication.nameSection.edit.errorEmpty'))
      return
    }
    setError(null)
    try {
      // Re-number pages deterministically to 1..N (no gaps).
      const orderedKept = [...kept].sort((a, b) => a.pageNumber - b.pageNumber)
      const uploaded: { pageNumber: number; fileUrl: string }[] = orderedKept.map((p, i) => ({
        pageNumber: i + 1,
        fileUrl: p.fileUrl
      }))
      for (let i = 0; i < pending.length; i++) {
        const p = pending[i]
        // Storyboard uploads reuse the OTHER bucket — the BE doesn't have a
        // dedicated CHAPTER_NAME enum and these are still "reference / source"
        // artwork from the Mangaka's side.
        const key = await uploadToR2(p.file, SignUploadBodyDtoAssetType.OTHER)
        uploaded.push({ pageNumber: orderedKept.length + i + 1, fileUrl: key })
      }
      const ok = await onConfirm(uploaded)
      if (ok) {
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
      aria-labelledby='edit-name-dialog-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={cn('relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl')}
      >
        <div className='space-y-4 overflow-y-auto p-5'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <h2 id='edit-name-dialog-title' className='text-base font-semibold text-foreground'>
                {t('publication.nameSection.edit.dialogTitle')}
              </h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                {t('publication.nameSection.edit.dialogDescription', { count: totalCount })}
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

          {/* Add-more file picker */}
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
              className='flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <Plus className='h-5 w-5' />
              <span className='font-medium text-foreground'>{t('publication.nameSection.edit.addMore')}</span>
              <span className='text-xs'>{t('publication.nameSection.create.allowedHint')}</span>
            </button>
          </div>

          {/* Page grid — existing + pending mixed in display order */}
          {mergedVisual.length === 0 ? (
            <p className='rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground'>
              {t('publication.nameSection.edit.empty')}
            </p>
          ) : (
            <ul className='grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5'>
              {mergedVisual.map((row) => {
                if (row.kind === 'existing') {
                  return (
                    <li key={row.key} className='space-y-1.5'>
                      <SignedImage
                        r2Key={row.fileUrl}
                        alt={t('publication.nameSection.pageAlt', { n: row.pageNumber })}
                        aspectClassName='aspect-[3/4]'
                        className='w-full'
                      />
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                          {t('publication.nameSection.pageNumber', { n: row.pageNumber })}
                        </span>
                        <button
                          type='button'
                          disabled={isSubmitting}
                          onClick={() => removeExistingAt(row.index)}
                          className='rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50'
                          aria-label={t('publication.nameSection.edit.removeExisting', { n: row.pageNumber })}
                          title={t('publication.nameSection.edit.removeExisting', { n: row.pageNumber })}
                        >
                          <Trash2 className='h-3.5 w-3.5' />
                        </button>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={row.key} className='space-y-1.5'>
                    <div className='relative'>
                      <img
                        src={row.previewUrl}
                        alt={row.file.name}
                        className='aspect-[3/4] w-full rounded-md object-cover'
                      />
                      <button
                        type='button'
                        disabled={isSubmitting}
                        onClick={() => removePendingAt(row.index - kept.length)}
                        className='absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-50'
                        aria-label={t('publication.nameSection.create.removeFile')}
                      >
                        <Trash2 className='h-3 w-3' />
                      </button>
                      <span className='absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white'>
                        #{row.pageNumber}
                      </span>
                    </div>
                  </li>
                )
              })}
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
          <Button type='submit' variant='primary' size='sm' disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('publication.nameSection.edit.submitting')}
              </>
            ) : (
              <>
                <Plus className='h-3.5 w-3.5' />
                {t('publication.nameSection.edit.confirm')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

type ExistingRow = {
  kind: 'existing'
  key: string
  pageNumber: number
  fileUrl: string
  index: number
}

type NewRow = {
  kind: 'pending'
  key: string
  previewUrl: string
  file: File
  pageNumber: number
  index: number
}
