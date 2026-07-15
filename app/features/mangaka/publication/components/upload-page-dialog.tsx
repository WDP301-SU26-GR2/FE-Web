import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Upload } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'
import { SignedImage } from '~/shared/components/signed-image'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'

export type UploadPageDialogProps = {
  open: boolean
  /** Chapter id — kept on the props so the parent owns the URL context; not used inside. */
  chapterId: string
  /** Suggested page number — usually last pageNumber + 1, or 1 if chapter has no pages. */
  startingPageNumber: number
  isSubmitting: boolean
  /** Submit handler returns true on success (caller closes), false otherwise. */
  onConfirm: (input: { pageNumber: number; originalFile: string }) => Promise<boolean>
  onCancel: () => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

/**
 * Dialog for "Upload page" — single-file upload to R2 + POST. UI stays the
 * same as the proposal wizard so muscle memory carries over.
 */
export function UploadPageDialog({
  open,
  startingPageNumber,
  isSubmitting,
  onConfirm,
  onCancel
}: UploadPageDialogProps) {
  const { t } = useTranslation('mangaka')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pageNumber, setPageNumber] = useState<string>(String(startingPageNumber))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setFile(null)
    setPreview(null)
    setPageNumber(String(startingPageNumber))
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, startingPageNumber])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, isSubmitting, onCancel])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (!open) return null

  const onPick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    if (!f) {
      setFile(null)
      setPreview(null)
      setError(null)
      return
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(t('upload.errors.invalidType'))
      return
    }
    if (f.size > MAX_BYTES) {
      setError(t('upload.errors.tooLarge'))
      return
    }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting || !file) return
    const num = Number(pageNumber)
    if (!Number.isInteger(num) || num < 1) {
      setError(t('publication.pagesSection.upload.errorInvalidNumber'))
      return
    }
    setError(null)
    try {
      const key = await uploadToR2(file, SignUploadBodyDtoAssetType.OTHER)
      const ok = await onConfirm({ pageNumber: num, originalFile: key })
      if (ok && preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
        setFile(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('publication.error.generic'))
    }
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='upload-page-dialog-title'
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
          <div>
            <h2 id='upload-page-dialog-title' className='text-base font-semibold text-foreground'>
              {t('publication.pagesSection.upload.dialogTitle')}
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {t('publication.pagesSection.upload.dialogDescription')}
            </p>
          </div>

          <div>
            <label htmlFor='upload-page-number' className='mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
              {t('publication.pagesSection.upload.pageNumberLabel')}
            </label>
            <input
              id='upload-page-number'
              type='number'
              min={1}
              step={1}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              disabled={isSubmitting}
              required
              className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
            />
          </div>

          <div>
            <label htmlFor='upload-page-file' className='mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground'>
              {t('publication.pagesSection.upload.fileLabel')}
            </label>
            <input
              id='upload-page-file'
              type='file'
              accept={ALLOWED_TYPES.join(',')}
              disabled={isSubmitting}
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              className='block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
            />
          </div>

          {preview ? (
            <div className='flex justify-center'>
              <img src={preview} alt='preview' className='max-h-48 rounded-md border border-border object-contain' />
            </div>
          ) : (
            <div className='flex h-32 items-center justify-center rounded-md border border-dashed border-border bg-muted/30'>
              <SignedImage r2Key={null} alt='no preview' aspectClassName='aspect-[3/4]' className='h-full' />
            </div>
          )}

          {error && (
            <div role='alert' className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive'>
              {error}
            </div>
          )}
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('publication.cancel')}
          </Button>
          <Button type='submit' variant='primary' size='sm' disabled={isSubmitting || !file}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('publication.pagesSection.upload.uploading')}
              </>
            ) : (
              <>
                <Upload className='h-3.5 w-3.5' />
                {t('publication.pagesSection.upload.confirm')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
