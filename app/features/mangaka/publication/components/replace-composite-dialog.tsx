import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, RefreshCw } from 'lucide-react'

import { SignUploadBodyDtoAssetType } from '~/api/model/uploads/signUploadBodyDtoAssetType'
import { uploadToR2 } from '~/shared/lib/upload/upload-to-r2'
import { Button } from '~/shared/ui'

type ReplaceCompositeDialogProps = {
  open: boolean
  pageNumber: number
  isSubmitting: boolean
  onConfirm: (compositeFile: string) => Promise<boolean>
  onCancel: () => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

export function ReplaceCompositeDialog({
  open,
  pageNumber,
  isSubmitting,
  onConfirm,
  onCancel
}: ReplaceCompositeDialogProps) {
  const { t } = useTranslation('mangaka')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setFile(null)
    setPreview(null)
    setError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, pageNumber])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isSubmitting, onCancel, open])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (!open) return null

  const onPick = (nextFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    if (!nextFile) {
      setFile(null)
      setPreview(null)
      setError(null)
      return
    }
    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      setError(t('upload.errors.invalidType'))
      return
    }
    if (nextFile.size > MAX_BYTES) {
      setError(t('upload.errors.tooLarge'))
      return
    }
    setFile(nextFile)
    setPreview(URL.createObjectURL(nextFile))
    setError(null)
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || isSubmitting) return
    setError(null)
    try {
      const key = await uploadToR2(file, SignUploadBodyDtoAssetType.OTHER)
      const updated = await onConfirm(key)
      if (updated && preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
        setFile(null)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('publication.error.generic'))
    }
  }

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='replace-composite-title'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <form
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        className='w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl'
      >
        <div className='space-y-4 p-5'>
          <div>
            <h2 id='replace-composite-title' className='text-base font-semibold text-foreground'>
              {t('publication.pagesSection.replaceComposite.title', {
                page: pageNumber,
                defaultValue: `Thay bản composite trang ${pageNumber}`
              })}
            </h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              {t('publication.pagesSection.replaceComposite.description', {
                defaultValue:
                  'Tải bản đã sửa theo yêu cầu của Editor. Trạng thái hoàn thành của page sẽ được giữ nguyên.'
              })}
            </p>
          </div>

          <input
            type='file'
            accept={ALLOWED_TYPES.join(',')}
            disabled={isSubmitting}
            onChange={(event) => onPick(event.target.files?.[0] ?? null)}
            className='block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground hover:file:opacity-90 disabled:cursor-not-allowed disabled:opacity-60'
          />

          {preview && (
            <div className='flex justify-center'>
              <img src={preview} alt='' className='max-h-64 rounded-md border border-border object-contain' />
            </div>
          )}

          {error && (
            <div
              role='alert'
              className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive'
            >
              {error}
            </div>
          )}
        </div>

        <div className='flex justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('publication.cancel')}
          </Button>
          <Button type='submit' variant='primary' size='sm' disabled={!file || isSubmitting}>
            {isSubmitting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5' />}
            {t('publication.pagesSection.replaceComposite.confirm', { defaultValue: 'Cập nhật bản sửa' })}
          </Button>
        </div>
      </form>
    </div>
  )
}
