import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react'
import type { ProposalFormData, CharacterDesignEntry } from '../create-proposal-wizard'
import { cn } from '~/shared/lib/cn'
import { SignedImage } from '../signed-image'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void

  /**
   * Edit-mode only — object keys already stored on the BE that the user can keep
   * or mark for removal. When provided, the step renders these as tiles with a
   * red "remove" button (semantically destructive), separately from the
   * newly-added entries. The page composes the final `characterDesigns[]` body
   * by combining `existingKeysKept` + uploads from `form.characterDesigns`.
   */
  existingKeys?: string[]
  existingKeysRemoved?: string[]
  onToggleExistingRemoval?: (key: string) => void
}

export function CharacterDesignStep({
  form,
  onChange,
  existingKeys,
  existingKeysRemoved,
  onToggleExistingRemoval
}: Props) {
  const { t } = useTranslation('mangaka')
  const inputRef = useRef<HTMLInputElement>(null)

  // `characterDesigns` maps to API `UpdateProposalBodyDto.characterDesigns`:
  // string[] of R2 object keys (no name/description fields) — see swagger.json.
  // New uploads get a `key` only after `uploadToR2` runs on the page that owns
  // the submit button; here we just stash the File + a preview URL.
  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newEntries: CharacterDesignEntry[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `${Date.now()}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
        key: ''
      }))
    onChange('characterDesigns', [...form.characterDesigns, ...newEntries])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleRemove = (id: string) => {
    const removed = form.characterDesigns.find((entry) => entry.id === id)
    if (removed && removed.preview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.preview)
    }
    onChange(
      'characterDesigns',
      form.characterDesigns.filter((entry) => entry.id !== id)
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step3')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step3Desc')}</p>
      </div>

      {/* Existing (already-uploaded) character designs — edit mode */}
      {existingKeys && existingKeys.length > 0 && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <h3 className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
              {t('seriesDetail.proposal.characterDesigns')} · {existingKeys.length}
            </h3>
            {existingKeysRemoved && existingKeysRemoved.length > 0 && (
              <span className='text-xs font-semibold text-destructive'>
                {t('seriesDetail.editProposal.markForRemoval')} ({existingKeysRemoved.length})
              </span>
            )}
          </div>
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {existingKeys.map((key) => {
              const removed = existingKeysRemoved?.includes(key) ?? false
              return (
                <ExistingCharacterTile
                  key={key}
                  r2Key={key}
                  removed={removed}
                  onToggle={() => onToggleExistingRemoval?.(key)}
                />
              )
            })}
          </div>
        </div>
      )}

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
        <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.uploadCharacterSubtitle')}</p>
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

      {/* New character designs (staged in this session) */}
      {form.characterDesigns.length > 0 && (
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {form.characterDesigns.map((entry) => (
            <div
              key={entry.id}
              className='relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-muted shadow-sm'
            >
              <img src={entry.preview} alt={t('wizard.characterDesignAlt')} className='h-full w-full object-cover' />
              <button
                type='button'
                onClick={() => handleRemove(entry.id)}
                className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                aria-label={t('wizard.removeImage')}
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Existing character tile (edit mode) ──────────────────────────────────────

function ExistingCharacterTile({
  r2Key,
  removed,
  onToggle
}: {
  r2Key: string
  removed: boolean
  onToggle: () => void
}) {
  const { t } = useTranslation('mangaka')

  return (
    <div
      className={cn(
        'group relative aspect-[3/4] overflow-hidden rounded-xl border bg-muted shadow-sm transition-all',
        removed ? 'border-destructive/60 opacity-60' : 'border-border'
      )}
    >
      <SignedImage r2Key={r2Key} alt={t('wizard.characterDesignAlt')} className='h-full w-full object-cover' />
      <button
        type='button'
        onClick={onToggle}
        title={
          removed
            ? t('seriesDetail.editProposal.removeExistingCharacter')
            : t('seriesDetail.editProposal.removeExistingCharacter')
        }
        aria-label={
          removed
            ? t('seriesDetail.editProposal.removeExistingCharacter')
            : t('seriesDetail.editProposal.removeExistingCharacter')
        }
        className={cn(
          'absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow transition-all cursor-pointer',
          removed ? 'bg-emerald-600/90 hover:bg-emerald-600' : 'bg-destructive/90 hover:bg-destructive'
        )}
      >
        {removed ? <X className='h-3.5 w-3.5' /> : <Trash2 className='h-3.5 w-3.5' />}
      </button>
      {removed && (
        <div className='absolute inset-x-0 bottom-0 bg-destructive/90 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-destructive-foreground'>
          {t('seriesDetail.editProposal.markForRemoval')}
        </div>
      )}
    </div>
  )
}
