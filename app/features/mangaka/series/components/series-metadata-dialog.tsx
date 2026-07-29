import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SeriesResDtoOutput } from '~/api/model/series'
import { Button } from '~/shared/ui'
import { Dialog } from '~/shared/ui/dialog'

import type { SeriesMetadataInput } from '../use-series-lifecycle'

type SeriesMetadataDialogProps = {
  open: boolean
  series: SeriesResDtoOutput
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (input: SeriesMetadataInput) => Promise<boolean>
}

const MAX_FILE_SIZE = 15 * 1024 * 1024
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

function isSupportedImage(file: File): boolean {
  return IMAGE_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE
}

/** Edits the presentational metadata that remains editable after serialization. */
export function SeriesMetadataDialog({ open, series, isSubmitting, onClose, onSubmit }: SeriesMetadataDialogProps) {
  const { t } = useTranslation('mangaka')
  const initialSynopsis = series.proposal?.synopsis ?? ''
  const initialDesigns = useMemo(() => series.proposal?.characterDesigns ?? [], [series.proposal?.characterDesigns])
  const [title, setTitle] = useState(series.title)
  const [synopsis, setSynopsis] = useState(initialSynopsis)
  const [coverIntent, setCoverIntent] = useState<'keep' | 'remove' | 'replace'>('keep')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [designKeys, setDesignKeys] = useState<string[]>(initialDesigns)
  const [newDesignFiles, setNewDesignFiles] = useState<File[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(series.title)
    setSynopsis(series.proposal?.synopsis ?? '')
    setCoverIntent('keep')
    setCoverFile(null)
    setDesignKeys(series.proposal?.characterDesigns ?? [])
    setNewDesignFiles([])
    setFormError(null)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, series])

  const hasChanges = useMemo(
    () =>
      title.trim() !== series.title ||
      synopsis !== initialSynopsis ||
      coverIntent !== 'keep' ||
      designKeys.length !== initialDesigns.length ||
      designKeys.some((key, index) => key !== initialDesigns[index]) ||
      newDesignFiles.length > 0,
    [coverIntent, designKeys, initialDesigns, initialSynopsis, newDesignFiles.length, series.title, synopsis, title]
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setFormError(t('seriesDetail.lifecycle.metadata.titleRequired'))
      return
    }
    if (trimmedTitle.length > 200) {
      setFormError(t('seriesDetail.lifecycle.metadata.titleTooLong'))
      return
    }
    if (synopsis.length > 5000) {
      setFormError(t('seriesDetail.lifecycle.metadata.synopsisTooLong'))
      return
    }
    if (coverIntent === 'replace' && !coverFile) {
      setFormError(t('seriesDetail.lifecycle.metadata.coverRequired'))
      return
    }

    setFormError(null)
    const coverImage: SeriesMetadataInput['coverImage'] =
      coverIntent === 'replace'
        ? { intent: 'replace', file: coverFile as File }
        : coverIntent === 'remove'
          ? { intent: 'remove' }
          : { intent: 'keep' }
    const saved = await onSubmit({
      ...(trimmedTitle === series.title ? {} : { title: trimmedTitle }),
      ...(synopsis === initialSynopsis ? {} : { synopsis }),
      coverImage,
      ...(designKeys.length === initialDesigns.length &&
      designKeys.every((key, index) => key === initialDesigns[index]) &&
      newDesignFiles.length === 0
        ? {}
        : { characterDesigns: { existingKeys: designKeys, newFiles: newDesignFiles } })
    })
    if (saved) onClose()
  }

  const handleCoverChange = (file: File | undefined) => {
    if (!file) return
    if (!isSupportedImage(file)) {
      setFormError(t('seriesDetail.lifecycle.metadata.invalidImage'))
      return
    }
    setFormError(null)
    setCoverFile(file)
    setCoverIntent('replace')
  }

  const handleDesignFiles = (files: FileList | null) => {
    const selected = Array.from(files ?? [])
    if (selected.length === 0) return
    if (selected.some((file) => !isSupportedImage(file))) {
      setFormError(t('seriesDetail.lifecycle.metadata.invalidImage'))
      return
    }
    setFormError(null)
    setNewDesignFiles((current) => [...current, ...selected])
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId='series-metadata-dialog-title'
      descriptionId='series-metadata-dialog-description'
      title={t('seriesDetail.lifecycle.metadata.dialogTitle')}
      description={t('seriesDetail.lifecycle.metadata.dialogDescription')}
      size='lg'
      footer={
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onClose}>
            {t('seriesDetail.lifecycle.metadata.cancel')}
          </Button>
          <Button type='submit' form='series-metadata-form' size='sm' disabled={isSubmitting || !hasChanges}>
            {isSubmitting
              ? t('seriesDetail.lifecycle.metadata.submitting')
              : t('seriesDetail.lifecycle.metadata.confirm')}
          </Button>
        </div>
      }
    >
      <form id='series-metadata-form' className='space-y-5' onSubmit={handleSubmit}>
        <div>
          <label htmlFor='series-metadata-title' className='mb-1.5 block text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.metadata.titleLabel')}
          </label>
          <input
            id='series-metadata-title'
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
            className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
        </div>
        <div>
          <label htmlFor='series-metadata-synopsis' className='mb-1.5 block text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.metadata.synopsisLabel')}
          </label>
          <textarea
            id='series-metadata-synopsis'
            value={synopsis}
            onChange={(event) => setSynopsis(event.target.value)}
            disabled={isSubmitting}
            maxLength={5000}
            rows={5}
            placeholder={t('seriesDetail.lifecycle.metadata.synopsisPlaceholder')}
            className='w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
          />
        </div>
        <fieldset className='space-y-2'>
          <legend className='text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.metadata.coverLabel')}
          </legend>
          <div className='flex flex-wrap items-center gap-2'>
            <label className='inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted'>
              <ImagePlus className='h-4 w-4' />
              {coverIntent === 'replace'
                ? t('seriesDetail.lifecycle.metadata.replaceCover')
                : t('seriesDetail.lifecycle.metadata.chooseCover')}
              <input
                type='file'
                accept='image/png,image/jpeg,image/webp'
                disabled={isSubmitting}
                className='sr-only'
                onChange={(event) => handleCoverChange(event.target.files?.[0])}
              />
            </label>
            {series.coverImage && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isSubmitting}
                onClick={() => {
                  setCoverFile(null)
                  setCoverIntent('remove')
                }}
              >
                <Trash2 className='h-3.5 w-3.5' />
                {t('seriesDetail.lifecycle.metadata.removeCover')}
              </Button>
            )}
            {coverIntent === 'remove' && (
              <span className='text-xs text-muted-foreground'>
                {t('seriesDetail.lifecycle.metadata.coverWillBeRemoved')}
              </span>
            )}
            {coverFile && <span className='max-w-52 truncate text-xs text-muted-foreground'>{coverFile.name}</span>}
          </div>
        </fieldset>
        <fieldset className='space-y-2'>
          <legend className='text-sm font-medium text-foreground'>
            {t('seriesDetail.lifecycle.metadata.characterDesignsLabel')}
          </legend>
          <div className='space-y-2'>
            {designKeys.map((key) => (
              <div
                key={key}
                className='flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs'
              >
                <span className='min-w-0 truncate text-muted-foreground'>{key}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={isSubmitting}
                  onClick={() => setDesignKeys((keys) => keys.filter((item) => item !== key))}
                >
                  {t('seriesDetail.lifecycle.metadata.remove')}
                </Button>
              </div>
            ))}
            {newDesignFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className='flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs'
              >
                <span className='min-w-0 truncate text-muted-foreground'>{file.name}</span>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={isSubmitting}
                  onClick={() => setNewDesignFiles((files) => files.filter((_, itemIndex) => itemIndex !== index))}
                >
                  {t('seriesDetail.lifecycle.metadata.remove')}
                </Button>
              </div>
            ))}
            <label className='inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted'>
              <ImagePlus className='h-4 w-4' />
              {t('seriesDetail.lifecycle.metadata.addDesigns')}
              <input
                type='file'
                multiple
                accept='image/png,image/jpeg,image/webp'
                disabled={isSubmitting}
                className='sr-only'
                onChange={(event) => handleDesignFiles(event.target.files)}
              />
            </label>
          </div>
          <p className='text-xs text-muted-foreground'>{t('seriesDetail.lifecycle.metadata.imageHint')}</p>
        </fieldset>
        {formError && (
          <p role='alert' className='text-sm text-destructive'>
            {formError}
          </p>
        )}
      </form>
    </Dialog>
  )
}
