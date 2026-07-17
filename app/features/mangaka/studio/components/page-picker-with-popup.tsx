import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { Button } from '~/shared/ui'
import { useTaskComposerData, type UseTaskComposerDataOptions } from '~/features/mangaka/assistants/use-task-composer-data'
import { PageRegionPopup } from './page-region-popup'

export interface PagePickerWithPopupProps {
  preset?: UseTaskComposerDataOptions
  selected: {
    chapterId?: string
    pageId?: string
    regionId?: string
  }
  onChange: (next: { chapterId?: string; pageId?: string; regionId?: string }) => void
}

export function PagePickerWithPopup({ preset, selected, onChange }: PagePickerWithPopupProps) {
  const { t } = useTranslation('mangaka')
  const { data, setChapter } = useTaskComposerData(preset ?? {})
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    if (preset?.presetChapterId) setChapter(preset.presetChapterId)
  }, [preset?.presetChapterId, setChapter])

  const page = data.pages.find((p) => p.id === selected.pageId) ?? null

  return (
    <div className='space-y-1.5'>
      <label htmlFor='assign-task-page' className='block text-sm font-medium text-foreground'>
        {t('studio.tasks.composer.selectPage')}
      </label>
      <div className='flex items-center gap-2'>
        <select
          id='assign-task-page'
          value={selected.pageId ?? ''}
          onChange={(e) => {
            const val = e.target.value || undefined
            onChange({ chapterId: selected.chapterId, pageId: val, regionId: undefined })
          }}
          disabled={data.loading.pages || !selected.chapterId}
          className='flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
        >
          <option value=''>{t('studio.tasks.composer.selectPagePlaceholder')}</option>
          {data.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {t('publication.nameSection.pageNumber', { n: p.pageNumber })}
            </option>
          ))}
        </select>
        <Button
          variant='secondary'
          size='md'
          type='button'
          onClick={() => setPopupOpen(true)}
          disabled={!selected.pageId}
          aria-label={t('studio.popup.openVisual')}
          title={t('studio.popup.openVisual')}
        >
          <ImageIcon className='mr-1.5 h-4 w-4' />
          {t('studio.popup.openVisual')}
        </Button>
      </div>
      {data.errors.pages && <p className='text-xs text-destructive'>{data.errors.pages}</p>}

      {selected.regionId && (
        <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary'>
            {t('studio.tasks.composer.regionSelected', { id: selected.regionId.slice(0, 8) })}
          </span>
          <button
            type='button'
            className='text-xs text-primary underline-offset-2 hover:underline'
            onClick={() => onChange({ chapterId: selected.chapterId, pageId: selected.pageId, regionId: undefined })}
          >
            {t('studio.tasks.composer.regionClear')}
          </button>
        </p>
      )}

      {popupOpen && page && (
        <PageRegionPopup
          pageId={page.id}
          pageNumber={page.pageNumber}
          pageImageKey={page.originalFile ?? page.compositeFile ?? null}
          onPickRegion={(regionId) => {
            onChange({ chapterId: selected.chapterId, pageId: selected.pageId, regionId })
            setPopupOpen(false)
          }}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  )
}
