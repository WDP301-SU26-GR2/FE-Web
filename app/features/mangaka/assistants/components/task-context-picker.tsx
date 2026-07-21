import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import type { UseTaskComposerDataOptions, UseTaskComposerDataResult } from '../use-task-composer-data'
import { PagePickerWithPopup } from '~/features/mangaka/studio/components/page-picker-with-popup'

export interface TaskContextPickerProps {
  openFrom: 'studio' | 'workbench'
  preset?: UseTaskComposerDataOptions
  /** Shared composer state (must be a SINGLE instance across the dialog). */
  composer: UseTaskComposerDataResult
  selected: {
    assignmentId?: string
    seriesId?: string
    chapterId?: string
    pageId?: string
    pageIds: string[]
    regionIds: string[]
  }
  onChange: (next: {
    assignmentId?: string
    assistantId?: string
    seriesId?: string
    chapterId?: string
    pageId?: string
    pageIds?: string[]
    regionIds?: string[]
  }) => void
  className?: string
}

/**
 * Step 1 of the assign-task composer.
 *
 * Picks (in this order, for `openFrom='studio'`):
 *   1. Assistant — chosen via a StudioAssignment. The picker's internal
 *      `useTaskComposerData` already loads `activeNow=true` assignments, so
 *      each `<option>` carries the resolved `assistantId` (userId).
 *   2. Series / chapter / page / region — cascading dropdowns.
 *
 * IMPORTANT (BR-ASSIST-01): the value we report via `onChange` for an
 * assignment pick is **the assignment id** (so the parent hook can resolve
 * the assistant userId + assignedTaskTypes). We DO NOT swap them.
 */
export function TaskContextPicker({ openFrom, preset, composer, selected, onChange }: TaskContextPickerProps) {
  const { t } = useTranslation('mangaka')
  const { data, setAssignment, setSeries, setChapter, selected: composerSelected, reload } = composer

  // Map assignmentId → assistantId for the parent hook's convenience.
  const assistantByAssignmentId = useMemo(() => {
    const map = new Map<string, { assistantId: string; displayName?: string | null }>()
    for (const a of data.assignments) {
      map.set(a.id, {
        assistantId: a.assistantId,
        displayName: a.assistant?.displayName ?? null
      })
    }
    return map
  }, [data.assignments])

  const handleAssignmentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setAssignment(val)
      const resolved = val ? assistantByAssignmentId.get(val) : undefined
      onChange({
        assignmentId: val,
        assistantId: resolved?.assistantId,
        seriesId: undefined,
        chapterId: undefined,
        pageId: undefined,
        pageIds: [],
        regionIds: []
      })
    },
    [onChange, setAssignment, assistantByAssignmentId]
  )

  const handleSeriesChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setSeries(val)
      onChange({
        ...selected,
        seriesId: val,
        chapterId: undefined,
        pageId: undefined,
        pageIds: [],
        regionIds: []
      })
    },
    [onChange, selected, setSeries]
  )

  const handleChapterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setChapter(val)
      onChange({ ...selected, chapterId: val, pageId: undefined, pageIds: [], regionIds: [] })
    },
    [onChange, selected, setChapter]
  )

  const isStudio = openFrom === 'studio'
  const isAssignmentLocked = Boolean(preset?.presetAssignmentId)
  const isSeriesLocked = Boolean(preset?.presetSeriesId)

  return (
    <div className='space-y-4'>
      {/* Assistant / Assignment selector — shown in studio mode */}
      {isStudio && (
        <div className='space-y-1.5'>
          <label htmlFor='assign-task-assignment' className='block text-sm font-medium text-foreground'>
            {t('studio.tasks.composer.selectAssistant')}
          </label>
          <select
            id='assign-task-assignment'
            value={selected.assignmentId ?? ''}
            onChange={handleAssignmentChange}
            disabled={data.loading.assignments || isAssignmentLocked}
            className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
          >
            <option value=''>{t('studio.tasks.composer.selectAssistantPlaceholder')}</option>
            {data.assignments.map((a) => {
              const display = a.assistant?.displayName
              return (
                <option key={a.id} value={a.id}>
                  {display ?? t('myStudio.card.unnamedAssistant')}
                </option>
              )
            })}
          </select>
          {data.errors.assignments && <p className='text-xs text-destructive'>{data.errors.assignments}</p>}
        </div>
      )}

      {/* Series — shown in studio mode */}
      {isStudio && (
        <div className='space-y-1.5'>
          <label htmlFor='assign-task-series' className='block text-sm font-medium text-foreground'>
            {t('studio.tasks.composer.selectSeries')}
          </label>
          <select
            id='assign-task-series'
            value={selected.seriesId ?? ''}
            onChange={handleSeriesChange}
            disabled={data.loading.series || isSeriesLocked}
            className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
          >
            <option value=''>{t('studio.tasks.composer.selectSeriesPlaceholder')}</option>
            {data.series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          {data.errors.series && <p className='text-xs text-destructive'>{data.errors.series}</p>}
        </div>
      )}

      {/* Chapter — shown in studio mode */}
      {isStudio && (
        <div className='space-y-1.5'>
          <label htmlFor='assign-task-chapter' className='block text-sm font-medium text-foreground'>
            {t('studio.tasks.composer.selectChapter')}
          </label>
          <select
            id='assign-task-chapter'
            value={selected.chapterId ?? ''}
            onChange={handleChapterChange}
            disabled={data.loading.chapters || !selected.seriesId}
            className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
          >
            <option value=''>{t('studio.tasks.composer.selectChapterPlaceholder')}</option>
            {data.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {t('seriesDetail.publication.chapterLabel', { n: c.chapterNumber })}
                {c.title ? ` — ${c.title}` : ''}
              </option>
            ))}
          </select>
          {data.errors.chapters && <p className='text-xs text-destructive'>{data.errors.chapters}</p>}
        </div>
      )}

      {/* Page — shown in studio mode or preset in workbench */}
      <PagePickerWithPopup
        preset={preset}
        composer={composer}
        selected={{
          chapterId: selected.chapterId ?? composerSelected.chapterId,
          pageId: selected.pageId,
          regionIds: selected.regionIds
        }}
        onChange={(next) => onChange({ ...selected, ...next, pageIds: next.pageId ? [next.pageId] : [] })}
      />

      {data.pages.length > 1 && (
        <fieldset className='space-y-2'>
          <legend className='text-sm font-medium text-foreground'>
            {t('studio.tasks.composer.selectMultiplePages')}
          </legend>
          <p className='text-xs text-muted-foreground'>{t('studio.tasks.composer.multiplePagesHint')}</p>
          <div className='grid max-h-40 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border p-3 sm:grid-cols-3'>
            {data.pages.map((page) => {
              const checked = selected.pageIds.includes(page.id)
              return (
                <label key={page.id} className='flex cursor-pointer items-center gap-2 text-sm text-foreground'>
                  <input
                    type='checkbox'
                    checked={checked}
                    onChange={() => {
                      const pageIds = checked
                        ? selected.pageIds.filter((id) => id !== page.id)
                        : [...selected.pageIds, page.id]
                      const pageId = pageIds.length === 1 ? pageIds[0] : undefined
                      onChange({
                        ...selected,
                        pageIds,
                        pageId,
                        regionIds: pageIds.length === 1 ? selected.regionIds : []
                      })
                    }}
                    className='h-4 w-4 rounded border-border text-primary focus:ring-ring'
                  />
                  {t('publication.nameSection.pageNumber', { n: page.pageNumber })}
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* Reload button */}
      {(data.errors.assignments || data.errors.series || data.errors.chapters || data.errors.pages) && (
        <Button variant='ghost' size='sm' onClick={() => reload('assignments')} className='text-xs'>
          {t('tasks.board.refresh')}
        </Button>
      )}
    </div>
  )
}
