import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImageIcon } from 'lucide-react'

import { Button } from '~/shared/ui'
import type {
  UseTaskComposerDataOptions,
  UseTaskComposerDataResult
} from '~/features/mangaka/assistants/use-task-composer-data'
import { PageRegionPopup } from './page-region-popup'
import { productionStageControllerListPages } from '~/api/operations/production-stages/production-stages'

export interface PagePickerWithPopupProps {
  preset?: UseTaskComposerDataOptions
  /** Shared composer state — same instance used by sibling TaskContextPicker. */
  composer: UseTaskComposerDataResult
  selected: {
    chapterId?: string
    pageId?: string
    regionIds: string[]
  }
  onChange: (next: { chapterId?: string; pageId?: string; regionIds: string[] }) => void
  stageId?: string
  locked?: boolean
}

export function PagePickerWithPopup({
  preset,
  composer,
  selected,
  onChange,
  stageId,
  locked = false
}: PagePickerWithPopupProps) {
  const { t } = useTranslation('mangaka')
  const { data, setChapter, setPage, selected: composerSelected, reload } = composer
  const [popupOpen, setPopupOpen] = useState(false)
  const [stageSnapshot, setStageSnapshot] = useState<{
    key: string
    inputByPage: Record<string, string>
    error: boolean
  }>({ key: '', inputByPage: {}, error: false })

  // Sync chapterId from the shared composer (so page list refreshes as soon as
  // TaskContextPicker picks a chapter — no separate hook instance to keep in
  // sync). Only act when the preset explicitly changed OR the parent passed a
  // different chapterId than what we already mirror locally.
  useEffect(() => {
    const presetChapter = preset?.presetChapterId
    if (presetChapter && composerSelected.chapterId !== presetChapter) {
      setChapter(presetChapter)
      return
    }
    if (selected.chapterId && composerSelected.chapterId !== selected.chapterId) {
      setChapter(selected.chapterId)
    }
  }, [preset?.presetChapterId, selected.chapterId, composerSelected.chapterId, setChapter])

  const page = data.pages.find((p) => p.id === selected.pageId) ?? null
  const selectedRegions = data.regions.filter((item) => selected.regionIds.includes(item.id))
  // Use either the prop or the composer's resolved chapterId so the page
  // dropdown enables the moment the chapter is known anywhere in the dialog.
  const effectiveChapterId = selected.chapterId ?? composerSelected.chapterId
  const stageSnapshotKey = stageId && effectiveChapterId ? `${effectiveChapterId}:${stageId}` : ''
  const stageSnapshotLoading = Boolean(stageSnapshotKey && stageSnapshot.key !== stageSnapshotKey)
  const stageSnapshotError = Boolean(stageSnapshotKey && stageSnapshot.key === stageSnapshotKey && stageSnapshot.error)
  const stageInputByPage = stageSnapshot.key === stageSnapshotKey ? stageSnapshot.inputByPage : {}

  useEffect(() => {
    if (!stageId || !effectiveChapterId || !stageSnapshotKey) return
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await productionStageControllerListPages(
          { id: effectiveChapterId, stageId },
          { signal: controller.signal }
        )
        if (!controller.signal.aborted) {
          setStageSnapshot({
            key: stageSnapshotKey,
            inputByPage: Object.fromEntries(
              (response.data.items ?? []).map((item) => [item.pageId, item.inputFileKey])
            ),
            error: false
          })
        }
      } catch (error) {
        if (!controller.signal.aborted && !(error instanceof Error && error.name === 'AbortError')) {
          setStageSnapshot({ key: stageSnapshotKey, inputByPage: {}, error: true })
        }
      }
    })()
    return () => controller.abort()
  }, [effectiveChapterId, stageId, stageSnapshotKey])

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
            setPage(val)
            onChange({ chapterId: effectiveChapterId, pageId: val, regionIds: [] })
          }}
          disabled={data.loading.pages || !effectiveChapterId || locked}
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
          disabled={!selected.pageId || stageSnapshotLoading || stageSnapshotError}
          aria-label={t('studio.popup.openVisual')}
          title={t('studio.popup.openVisual')}
        >
          <ImageIcon className='mr-1.5 h-4 w-4' />
          {t('studio.popup.openVisual')}
        </Button>
      </div>
      {data.errors.pages && <p className='text-xs text-destructive'>{data.errors.pages}</p>}
      {stageSnapshotError && (
        <p className='text-xs text-destructive'>{t('studio.tasks.composer.errors.stageSnapshotError')}</p>
      )}

      {selected.pageId && data.regions.length > 0 && (
        <fieldset className='space-y-2 rounded-md border border-border p-3'>
          <legend className='px-1 text-xs font-medium text-foreground'>
            {t('studio.tasks.composer.selectRegions')}
          </legend>
          <p className='text-xs text-muted-foreground'>{t('studio.tasks.composer.selectRegionsHint')}</p>
          <div className='grid gap-2 sm:grid-cols-2'>
            {data.regions.map((item) => {
              const checked = selected.regionIds.includes(item.id)
              return (
                <label key={item.id} className='flex cursor-pointer items-center gap-2 text-xs text-foreground'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() =>
                      onChange({
                        chapterId: effectiveChapterId,
                        pageId: selected.pageId,
                        regionIds: checked
                          ? selected.regionIds.filter((id) => id !== item.id)
                          : [...selected.regionIds, item.id]
                      })
                    }
                    className='h-4 w-4 rounded border-border text-primary focus:ring-ring'
                  />
                  {item.label}
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {selectedRegions.length > 0 && (
        <p className='mt-1 flex items-center gap-1.5 text-xs text-muted-foreground'>
          <span className='rounded bg-primary/10 px-1.5 py-0.5 font-mono text-primary'>
            {selectedRegions.map((region) => region.label).join(', ')}
          </span>
          <button
            type='button'
            className='text-xs text-primary underline-offset-2 hover:underline'
            onClick={() => onChange({ chapterId: effectiveChapterId, pageId: selected.pageId, regionIds: [] })}
          >
            {t('studio.tasks.composer.regionClear')}
          </button>
        </p>
      )}

      {popupOpen && page && (
        <PageRegionPopup
          pageId={page.id}
          pageNumber={page.pageNumber}
          pageImageKey={
            stageId ? (stageInputByPage[page.id] ?? null) : (page.compositeFile ?? page.originalFile ?? null)
          }
          stageId={stageId}
          onRegionsChanged={() => reload('regions')}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </div>
  )
}
