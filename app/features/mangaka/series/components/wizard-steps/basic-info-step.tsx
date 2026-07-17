import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Image as ImageIcon, Check, HelpCircle } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { ProposalFormData } from '../create-proposal-wizard'
import { SignedImage } from '~/shared/components/signed-image'

interface Props {
  form: ProposalFormData
  onChange: <K extends keyof ProposalFormData>(key: K, value: ProposalFormData[K]) => void

  /**
   * Edit-mode only — the object key for the cover currently stored on the BE.
   * When provided, the cover slot first shows the existing image. If the user
   * picks a new file, we swap the preview to the blob; if they clear, the
   * field goes back to "no cover" (which on submit sends `coverImage: null`).
   */
  existingCoverKey?: string | null
  existingCoverRemoved?: boolean
  onExistingCoverRemovedChange?: (removed: boolean) => void
}

// API enum values — MUST match `CreateProposalBodyDto` in swagger.json
// and §3 of FE-API-Guide-v3.md. Display labels are translated via
// `wizard.enums.{genres|demographic|publicationType}.<KEY>` in the locale.
const GENRE_VALUES = [
  'ACTION',
  'ADVENTURE',
  'COMEDY',
  'DRAMA',
  'FANTASY',
  'HORROR',
  'MYSTERY',
  'ROMANCE',
  'SCI_FI',
  'SLICE_OF_LIFE',
  'SPORTS',
  'SUPERNATURAL',
  'THRILLER',
  'HISTORICAL',
  'ISEKAI',
  'MECHA',
  'PSYCHOLOGICAL'
] as const

const DEMOGRAPHIC_VALUES = ['SHONEN', 'SEINEN', 'SHOJO', 'JOSEI', 'KODOMO'] as const

const PUBLICATION_TYPE_VALUES = ['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const

export function BasicInfoStep({
  form,
  onChange,
  existingCoverKey,
  existingCoverRemoved = false,
  onExistingCoverRemovedChange
}: Props) {
  const { t } = useTranslation('mangaka')
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleCoverFile = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    // The R2 upload happens on submit (see create-proposal-wizard / edit page).
    // Here we only stash the original File + a preview URL.
    onChange('coverImage', { file, preview: URL.createObjectURL(file) })
    onExistingCoverRemovedChange?.(false)
  }

  const clearCover = () => {
    if (form.coverImage?.preview.startsWith('blob:')) {
      URL.revokeObjectURL(form.coverImage.preview)
    }
    if (form.coverImage) {
      onChange('coverImage', null)
      return
    }
    if (existingCoverKey) {
      onExistingCoverRemovedChange?.(true)
    }
  }

  // Three states for the cover slot:
  //   1) form.coverImage set        → user picked a new file this session
  //   2) !form.coverImage && existingCoverKey → show BE-stored image (no change)
  //   3) !form.coverImage && !existingCoverKey → empty slot, "upload" affordance
  const showExistingCover = !form.coverImage && !!existingCoverKey && !existingCoverRemoved

  const toggleGenre = (genre: string) => {
    const next = form.genres.includes(genre) ? form.genres.filter((g) => g !== genre) : [...form.genres, genre]
    onChange('genres', next)
  }

  // Numeric input — keep raw string in form state, convert to number on submit.
  const estimatedLengthNum = form.estimatedLength ? Number(form.estimatedLength) : NaN
  const estimatedLengthInvalid =
    form.estimatedLength !== '' && (!Number.isFinite(estimatedLengthNum) || estimatedLengthNum < 1)

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-bold'>{t('wizard.step1')}</h2>
        <p className='mt-1 text-sm text-muted-foreground'>{t('wizard.step1Desc')}</p>
      </div>

      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
        {/* Series Title */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>
            {t('wizard.seriesTitle')} <span className='text-destructive'>*</span>
          </label>
          <input
            type='text'
            value={form.seriesTitle}
            onChange={(e) => onChange('seriesTitle', e.target.value)}
            placeholder={t('wizard.seriesTitlePlaceholder')}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          />
        </div>

        {/* Cover Image (object key) */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.coverImage')}</label>
          {form.coverImage ? (
            <div className='relative h-48 w-full overflow-hidden rounded-md border border-border bg-muted'>
              <img src={form.coverImage.preview} alt={t('wizard.coverImage')} className='h-full w-full object-cover' />
              <button
                type='button'
                onClick={clearCover}
                className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                aria-label={t('wizard.removeImage')}
              >
                <X className='h-3.5 w-3.5' />
              </button>
              <div className='absolute bottom-2 left-2 rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow'>
                {t('seriesDetail.editProposal.newCover')}
              </div>
            </div>
          ) : showExistingCover ? (
            <div className='relative h-48 w-full overflow-hidden rounded-md border border-border bg-muted'>
              <SignedImage
                r2Key={existingCoverKey}
                alt={t('wizard.coverImage')}
                className='h-full w-full object-cover'
              />
              <button
                type='button'
                onClick={clearCover}
                className='absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white shadow transition-all hover:bg-black/80 cursor-pointer'
                aria-label={t('wizard.removeImage')}
              >
                <X className='h-3.5 w-3.5' />
              </button>
              <div className='absolute bottom-2 left-2 rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground shadow'>
                {t('seriesDetail.editProposal.keepCover')}
              </div>
            </div>
          ) : (
            <div
              onClick={() => coverInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                handleCoverFile(e.dataTransfer.files)
              }}
              className='flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-background/40 transition-colors hover:border-primary/50 hover:bg-primary/5'
            >
              <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
                <ImageIcon className='h-5 w-5 text-primary' />
              </div>
              <p className='mt-3 text-sm font-semibold'>{t('wizard.uploadCoverTitle')}</p>
              <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.uploadCoverSubtitle')}</p>
            </div>
          )}
          <input
            ref={coverInputRef}
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className='hidden'
            onChange={(e) => handleCoverFile(e.target.files)}
          />
        </div>

        {/* Genres (multi-select, fixed enum) */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.genres')}</label>
          <div className='flex flex-wrap gap-2'>
            {GENRE_VALUES.map((genre) => {
              const active = form.genres.includes(genre)
              return (
                <button
                  type='button'
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  )}
                >
                  {active && <Check className='h-3 w-3' />}
                  <span>{t(`wizard.enums.genres.${genre}`)}</span>
                </button>
              )
            })}
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.genresHint')}</p>
        </div>

        {/* Demographic — label i18n + tooltip giải thích ý nghĩa */}
        <div>
          <label className='mb-1.5 flex items-center gap-1.5 text-sm font-semibold'>
            {t('wizard.demographic')}
            <span
              className='inline-flex h-4 w-4 cursor-help items-center justify-center text-muted-foreground'
              title={t('wizard.demographicHint')}
              aria-label={t('wizard.demographicHint')}
            >
              <HelpCircle className='h-4 w-4' />
            </span>
          </label>
          <select
            value={form.demographic}
            onChange={(e) => onChange('demographic', e.target.value)}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          >
            <option value=''>{t('wizard.selectOption')}</option>
            {DEMOGRAPHIC_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`wizard.enums.demographic.${value}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Publication Type — label i18n */}
        <div>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.publicationType')}</label>
          <select
            value={form.publicationType}
            onChange={(e) => onChange('publicationType', e.target.value)}
            className='w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none'
          >
            <option value=''>{t('wizard.selectOption')}</option>
            {PUBLICATION_TYPE_VALUES.map((value) => (
              <option key={value} value={value}>
                {t(`wizard.enums.publicationType.${value}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Estimated Length (number of chapters) */}
        <div className='sm:col-span-2'>
          <label className='mb-1.5 block text-sm font-semibold'>{t('wizard.estimatedLength')}</label>
          <input
            type='number'
            min={1}
            inputMode='numeric'
            value={form.estimatedLength}
            onChange={(e) => onChange('estimatedLength', e.target.value)}
            placeholder={t('wizard.estimatedLengthPlaceholder')}
            className={cn(
              'w-full rounded-md border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:ring-1 focus:outline-none',
              estimatedLengthInvalid
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : 'border-input focus:border-primary focus:ring-ring'
            )}
          />
          <p className='mt-1 text-xs text-muted-foreground'>{t('wizard.estimatedLengthHint')}</p>
        </div>
      </div>
    </div>
  )
}
