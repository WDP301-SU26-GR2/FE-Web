import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, FileImage } from 'lucide-react'
import type { ProposalFormData, NamePageEntry } from '../create-proposal-wizard'
import { SignedImage } from '~/shared/components/signed-image'
import { cn } from '~/shared/lib/cn'

export type ExistingNamePage = {
  pageNumber: number
  fileUrl: string
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 15 * 1024 * 1024

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void
  existingPages?: ExistingNamePage[]
  removedExistingPageKeys?: string[]
  onToggleExistingPage?: (pageKey: string) => void
}

export function ManuscriptDraftsStep({
  form,
  onChange,
  existingPages = [],
  removedExistingPageKeys = [],
  onToggleExistingPage
}: Props) {
  const { t } = useTranslation('mangaka')
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // `namePages` maps to API `CreateProposalBodyDto.namePages`:
  // [{ pageNumber: number, fileUrl: object key }] — see swagger.json.
  // Actual R2 upload happens at submit time (see create-proposal-wizard).
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const startIndex = form.namePages.length
    const selectedFiles = Array.from(files)
    const invalidType = selectedFiles.some((file) => !ALLOWED_TYPES.includes(file.type))
    const tooLarge = selectedFiles.some((file) => file.size > MAX_FILE_SIZE)
    setFileError(invalidType ? t('upload.errors.invalidType') : tooLarge ? t('upload.errors.tooLarge') : null)
    const newEntries: NamePageEntry[] = selectedFiles
      .filter((file) => ALLOWED_TYPES.includes(file.type) && file.size <= MAX_FILE_SIZE)
      .map((file, idx) => ({
        id: `${Date.now()}-${idx}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        key: '',
        pageNumber: startIndex + idx + 1,
        title: file.name.replace(/\.[^/.]+$/, '')
      }))
    onChange('namePages', [...form.namePages, ...newEntries])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (id: string) => {
    const removed = form.namePages.find((entry) => entry.id === id)
    if (removed && removed.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview)
    }
    onChange(
      'namePages',
      form.namePages.filter((entry) => entry.id !== id)
    )
  }

  const updateEntry = (id: string, field: keyof NamePageEntry, value: string | number) => {
    onChange(
      'namePages',
      form.namePages.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step4')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step4Desc')}</p>
      </div>

      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className='flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background/40 py-14 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5'
      >
        <div className='flex h-14 w-14 items-center justify-center rounded-full bg-primary/10'>
          <Upload className='h-6 w-6 text-primary' />
        </div>
        <p className='mt-4 text-sm font-semibold'>{t('wizard.uploadNamePageTitle')}</p>
        <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.uploadNamePageSubtitle')}</p>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
          className='mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer'
        >
          <FileImage className='h-4 w-4' />
          <span>{t('wizard.chooseImage')}</span>
        </button>
        <input
          ref={inputRef}
          type='file'
          accept={ALLOWED_TYPES.join(',')}
          multiple
          className='hidden'
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {fileError && (
        <p role='alert' className='text-sm font-medium text-destructive'>
          {fileError}
        </p>
      )}

      {/* Name Pages Grid */}
      {existingPages.length > 0 && (
        <div className='space-y-2'>
          <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            {t('seriesDetail.editProposal.existingNamePages')}
          </p>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {[...existingPages]
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((page) => {
                const pageKey = `${page.pageNumber}:${page.fileUrl}`
                const removed = removedExistingPageKeys.includes(pageKey)
                return (
                  <div
                    key={pageKey}
                    className={cn(
                      'flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm',
                      removed ? 'border-destructive opacity-50' : 'border-border'
                    )}
                  >
                    <div className='relative aspect-[3/4] w-full overflow-hidden bg-muted'>
                      <SignedImage
                        r2Key={page.fileUrl}
                        alt={t('seriesDetail.names.pageAlt', { n: page.pageNumber })}
                        className='h-full w-full object-cover'
                      />
                      <div className='absolute left-2 top-2 rounded-md bg-foreground/80 px-2 py-1 text-xs font-bold text-background'>
                        {String(page.pageNumber).padStart(2, '0')}
                      </div>
                      <button
                        type='button'
                        onClick={() => onToggleExistingPage?.(pageKey)}
                        className={cn(
                          'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full shadow cursor-pointer',
                          removed ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground'
                        )}
                        aria-label={
                          removed
                            ? t('seriesDetail.editProposal.restoreNamePage', { n: page.pageNumber })
                            : t('seriesDetail.editProposal.removeNamePage', { n: page.pageNumber })
                        }
                      >
                        <X className={cn('h-3.5 w-3.5', removed && 'rotate-45')} />
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {form.namePages.length > 0 && (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {form.namePages.map((entry) => (
            <div
              key={entry.id}
              className='flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm'
            >
              {/* Image area with page number + delete */}
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-muted'>
                <img src={entry.preview} alt={entry.title} className='h-full w-full object-cover' />
                {/* Page number badge (matches API `pageNumber`) */}
                <div className='absolute left-2 top-2 flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-black/60 px-2 text-xs font-bold text-white'>
                  {String(entry.pageNumber).padStart(2, '0')}
                </div>
                {/* Delete button */}
                <button
                  type='button'
                  onClick={() => handleRemove(entry.id)}
                  className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                  aria-label={t('wizard.removeImage')}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              {/* Page title (UI only — not sent to API) */}
              <div className='p-2'>
                <input
                  type='text'
                  value={entry.title}
                  onChange={(e) => updateEntry(entry.id, 'title', e.target.value)}
                  placeholder={t('wizard.pageTitlePlaceholder')}
                  className='w-full rounded-md border-0 bg-transparent px-2 py-1.5 text-xs font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0'
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
