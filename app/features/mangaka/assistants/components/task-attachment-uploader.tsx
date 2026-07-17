import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, AlertCircle } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { uploadAssetToR2 } from '~/shared/lib/upload/upload-to-r2'
import type { SignUploadBodyDtoAssetType } from '~/api/model/uploads'

export interface AttachmentFile {
  file: File
  id: string
  status: 'uploading' | 'done' | 'error'
  assetId?: string
  key?: string
  error?: string
}

export interface TaskAttachmentUploaderProps {
  assetType?: SignUploadBodyDtoAssetType
  onAssetsChange: (assets: Array<{ assetId: string; key: string }>) => void
  className?: string
}

export function TaskAttachmentUploader({ assetType, onAssetsChange }: TaskAttachmentUploaderProps) {
  const { t } = useTranslation('mangaka')
  const [files, setFiles] = useState<AttachmentFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const updateFile = useCallback(
    (id: string, update: Partial<AttachmentFile>) => {
      setFiles((prev) => {
        const updated = prev.map((f) => (f.id === id ? { ...f, ...update } : f))
        // Emit completed assets
        const done = updated.filter((f) => f.status === 'done' && f.assetId && f.key)
        onAssetsChange(done.map((f) => ({ assetId: f.assetId!, key: f.key! })))
        return updated
      })
    },
    [onAssetsChange]
  )

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      const toAdd: AttachmentFile[] = newFiles.map((f) => ({
        file: f,
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
        status: 'uploading' as const
      }))
      setFiles((prev) => [...prev, ...toAdd])

      // Upload each file
      for (const item of toAdd) {
        const result = await uploadAssetToR2(item.file, assetType)
        if ('error' in result) {
          updateFile(item.id, { status: 'error', error: result.error })
        } else {
          updateFile(item.id, { status: 'done', assetId: result.assetId, key: result.key })
        }
      }
    },
    [assetType, updateFile]
  )

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      const valid = files.filter((f) => {
        if (f.size > 15 * 1024 * 1024) return false
        const type = f.type
        return ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(type)
      })
      if (valid.length > 0) {
        void processFiles(valid)
      }
    },
    [processFiles]
  )

  const handleRemove = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.id !== id)
        const done = updated.filter((f) => f.status === 'done' && f.assetId && f.key)
        onAssetsChange(done.map((f) => ({ assetId: f.assetId!, key: f.key! })))
        return updated
      })
    },
    [onAssetsChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles]
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className='space-y-3'>
      {/* Drop zone */}
      <div
        role='button'
        tabIndex={0}
        aria-label={t('studio.tasks.composer.attachments.dropzoneLabel')}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-5 transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/50'
        )}
      >
        <Upload className={cn('h-6 w-6', dragging ? 'text-primary' : 'text-muted-foreground')} />
        <p className='text-sm text-foreground'>{t('studio.tasks.composer.attachments.dropzoneLabel')}</p>
        <p className='text-xs text-muted-foreground'>PNG, JPG, WEBP, PDF · tối đa 15MB</p>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='image/png,image/jpeg,image/webp,application/pdf'
        multiple
        onChange={handleInputChange}
        className='sr-only'
        tabIndex={-1}
        aria-hidden='true'
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className='space-y-1.5'>
          {files.map((item) => (
            <li
              key={item.id}
              className='flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm'
            >
              {item.status === 'uploading' && (
                <span className='h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent' />
              )}
              {item.status === 'done' && <span className='h-4 w-4 rounded-full bg-success' aria-label='Uploaded' />}
              {item.status === 'error' && <AlertCircle className='h-4 w-4 text-destructive' />}
              <span className='min-w-0 flex-1 truncate text-foreground'>{item.file.name}</span>
              <span className='shrink-0 text-xs text-muted-foreground'>{formatSize(item.file.size)}</span>
              {item.status !== 'uploading' && (
                <button
                  type='button'
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                  className='shrink-0 text-muted-foreground hover:text-destructive'
                >
                  <X className='h-4 w-4' />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
