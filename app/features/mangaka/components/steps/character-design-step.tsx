import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import type {
  ProposalFormData,
  CharacterDesignEntry
} from '../create-proposal-wizard'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void
}

export function CharacterDesignStep({ form, onChange }: Props) {
  const { t } = useTranslation('mangaka')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newEntries: CharacterDesignEntry[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${file.name}`,
        preview: URL.createObjectURL(file),
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: ''
      }))
    onChange('characterDesigns', [...form.characterDesigns, ...newEntries])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (id: string) => {
    const removed = form.characterDesigns.find((entry) => entry.id === id)
    if (removed) URL.revokeObjectURL(removed.preview)
    onChange(
      'characterDesigns',
      form.characterDesigns.filter((entry) => entry.id !== id)
    )
  }

  const updateEntry = (
    id: string,
    field: keyof CharacterDesignEntry,
    value: string
  ) => {
    onChange(
      'characterDesigns',
      form.characterDesigns.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step3')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step3Desc')}</p>
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
        <p className='mt-4 text-sm font-semibold'>{t('wizard.uploadCharacterTitle')}</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          {t('wizard.uploadCharacterSubtitle')}
        </p>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
          className='mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 cursor-pointer'
        >
          <ImageIcon className='h-4 w-4' />
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

      {/* Character Cards Grid */}
      {form.characterDesigns.length > 0 && (
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {form.characterDesigns.map((entry) => (
            <div
              key={entry.id}
              className='flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-sm'
            >
              {/* Image area with delete button */}
              <div className='relative aspect-[3/4] w-full overflow-hidden bg-muted'>
                <img
                  src={entry.preview}
                  alt={entry.name}
                  className='h-full w-full object-cover'
                />
                <button
                  onClick={() => handleRemove(entry.id)}
                  className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                  aria-label={t('wizard.removeImage')}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              {/* Name + Description */}
              <div className='flex flex-col gap-2 p-3'>
                <input
                  type='text'
                  value={entry.name}
                  onChange={(e) => updateEntry(entry.id, 'name', e.target.value)}
                  placeholder={t('wizard.characterNamePlaceholder')}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
                />
                <textarea
                  value={entry.description}
                  onChange={(e) =>
                    updateEntry(entry.id, 'description', e.target.value)
                  }
                  placeholder={t('wizard.characterDescPlaceholder')}
                  rows={2}
                  className='w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
