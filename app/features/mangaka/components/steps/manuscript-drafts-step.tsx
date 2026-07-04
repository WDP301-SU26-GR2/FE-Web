import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, FileImage } from 'lucide-react'
import type { ProposalFormData, ManuscriptPageEntry } from '../create-proposal-wizard'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void
}

export function ManuscriptDraftsStep({ form, onChange }: Props) {
  const { t } = useTranslation('mangaka')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newEntries: ManuscriptPageEntry[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${file.name}`,
        preview: URL.createObjectURL(file),
        title: file.name.replace(/\.[^/.]+$/, '')
      }))
    onChange('manuscripts', [...form.manuscripts, ...newEntries])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (id: string) => {
    const removed = form.manuscripts.find((entry) => entry.id === id)
    if (removed) URL.revokeObjectURL(removed.preview)
    onChange(
      'manuscripts',
      form.manuscripts.filter((entry) => entry.id !== id)
    )
  }

  const updateEntry = (id: string, field: keyof ManuscriptPageEntry, value: string) => {
    onChange(
      'manuscripts',
      form.manuscripts.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
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
        <p className='mt-4 text-sm font-semibold'>{t('wizard.uploadManuscriptTitle')}</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {t('wizard.uploadManuscriptSubtitle')}
        </p>
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
          accept='image/*'
          multiple
          className='hidden'
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Manuscript Pages Grid */}
      {form.manuscripts.length > 0 && (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {form.manuscripts.map((entry, index) => (
            <div
              key={entry.id}
              className='flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm'
            >
              {/* Image area with page number + delete */}
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-muted'>
                <img
                  src={entry.preview}
                  alt={entry.title}
                  className='h-full w-full object-cover'
                />
                {/* Page number badge */}
                <div className='absolute left-2 top-2 flex h-7 min-w-[2rem] items-center justify-center rounded-md bg-black/60 px-2 text-xs font-bold text-white'>
                  {String(index + 1).padStart(2, '0')}
                </div>
                {/* Delete button */}
                <button
                  onClick={() => handleRemove(entry.id)}
                  className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                  aria-label={t('wizard.removeImage')}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              {/* Page title */}
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
