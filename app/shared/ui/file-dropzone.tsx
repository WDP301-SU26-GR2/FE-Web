import { useCallback, useRef, useState, type DragEvent } from 'react'
import { Upload } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

export type FileDropzoneAccept = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'

const ACCEPTED: FileDropzoneAccept[] = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

function validateFile(file: File, accept: FileDropzoneAccept[], maxSize: number): string | undefined {
  if (accept.length > 0 && !accept.includes(file.type as FileDropzoneAccept)) {
    return 'invalidType'
  }
  if (file.size > maxSize) {
    return 'tooLarge'
  }
  return undefined
}

export interface FileEntry {
  file: File
  id: string
  error?: string
}

export interface FileDropzoneState {
  entries: FileEntry[]
  dragging: boolean
  setDragging: (dragging: boolean) => void
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void
  open: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

export function useFileDropzone({
  accept = ACCEPTED,
  maxSize = MAX_SIZE_BYTES,
  multiple = false,
  onFilesChange
}: {
  accept?: FileDropzoneAccept[]
  maxSize?: number
  multiple?: boolean
  onFilesChange?: (files: File[]) => void
}): FileDropzoneState {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const toAdd = multiple ? newFiles : newFiles.slice(0, 1)
      const validated: FileEntry[] = toAdd.map((f) => ({
        file: f,
        id: `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`,
        error: validateFile(f, accept, maxSize)
      }))
      setEntries((prev) => {
        const updated = multiple ? [...prev, ...validated] : [...prev, ...validated]
        return updated
      })
      const valid = validated.filter((e) => !e.error)
      if (valid.length > 0) {
        onFilesChange?.(valid.map((e) => e.file))
      }
    },
    [accept, maxSize, multiple, onFilesChange]
  )

  const removeFile = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const updated = prev.filter((e) => e.id !== id)
        onFilesChange?.(updated.filter((e) => !e.error).map((e) => e.file))
        return updated
      })
    },
    [onFilesChange]
  )

  const clearFiles = useCallback(() => {
    setEntries([])
    onFilesChange?.([])
  }, [onFilesChange])

  const open = useCallback(() => inputRef.current?.click(), [])

  return { entries, dragging, setDragging, addFiles, removeFile, clearFiles, open, inputRef }
}

export interface FileDropzoneProps {
  state: FileDropzoneState
  accept?: FileDropzoneAccept[]
  multiple?: boolean
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
}

export function FileDropzone({
  state,
  accept = ACCEPTED,
  multiple = false,
  disabled,
  label,
  hint,
  className
}: FileDropzoneProps) {
  const { entries, dragging, setDragging, addFiles, removeFile, open, inputRef } = state

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const files = Array.from(e.dataTransfer.files)
      const target = multiple ? files : files.length > 0 ? [files[0]] : []
      if (target.length > 0) addFiles(target)
    },
    [addFiles, multiple, setDragging]
  )

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(true)
    },
    [setDragging]
  )

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
    },
    [setDragging]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      const target = multiple ? files : files.length > 0 ? [files[0]] : []
      if (target.length > 0) addFiles(target)
      e.target.value = ''
    },
    [addFiles, multiple]
  )

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role='button'
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? 'Upload file'}
        onClick={disabled ? undefined : open}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) open()
          }
        }}
        onDrop={disabled ? undefined : handleDrop}
        onDragOver={disabled ? undefined : handleDragOver}
        onDragLeave={disabled ? undefined : handleDragLeave}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer'
        )}
      >
        <Upload className={cn('h-8 w-8 text-muted-foreground', dragging && 'text-primary')} />
        <div className='text-center'>
          <p className='text-sm font-medium text-foreground'>{label ?? 'Kéo & thả hoặc bấm để chọn'}</p>
          {hint && <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept={accept.join(',')}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        className='sr-only'
        tabIndex={-1}
        aria-hidden='true'
      />
      {entries.length > 0 && (
        <ul className='space-y-1'>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className='flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm'
            >
              <span className='truncate'>{entry.file.name}</span>
              {entry.error ? (
                <span className='ml-2 shrink-0 text-xs text-destructive'>{entry.error}</span>
              ) : (
                <button
                  type='button'
                  onClick={() => removeFile(entry.id)}
                  className='ml-2 shrink-0 text-muted-foreground hover:text-destructive'
                  aria-label={`Remove ${entry.file.name}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
