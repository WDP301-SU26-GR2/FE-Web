import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { useTaskComposerData, type UseTaskComposerDataOptions } from '../use-task-composer-data'
import { PagePickerWithPopup } from '~/features/mangaka/studio/components/page-picker-with-popup'

export interface TaskContextPickerProps {
  openFrom: 'studio' | 'workbench'
  preset?: UseTaskComposerDataOptions
  selected: {
    assignmentId?: string
    seriesId?: string
    chapterId?: string
    pageId?: string
    regionId?: string
  }
  onChange: (next: {
    assignmentId?: string
    seriesId?: string
    chapterId?: string
    pageId?: string
    regionId?: string
  }) => void
  className?: string
}

export function TaskContextPicker({ openFrom, preset, selected, onChange }: TaskContextPickerProps) {
  const { t } = useTranslation('mangaka')
  const { data, setAssignment, setSeries, setChapter, reload } = useTaskComposerData(preset ?? {})

  // Sync external selection changes back to internal state
  useEffect(() => {
    if (selected.assignmentId && selected.assignmentId !== selected.assignmentId) {
      setAssignment(selected.assignmentId)
    }
  }, [selected.assignmentId, setAssignment])

  const handleAssignmentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setAssignment(val)
      onChange({
        ...selected,
        assignmentId: val,
        seriesId: undefined,
        chapterId: undefined,
        pageId: undefined,
        regionId: undefined
      })
    },
    [onChange, selected]
  )

  const handleSeriesChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setSeries(val)
      onChange({ ...selected, seriesId: val, chapterId: undefined, pageId: undefined, regionId: undefined })
    },
    [onChange, selected]
  )

  const handleChapterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value || undefined
      setChapter(val)
      onChange({ ...selected, chapterId: val, pageId: undefined, regionId: undefined })
    },
    [onChange, selected]
  )

  const isStudio = openFrom === 'studio'
  const isWorkbench = openFrom === 'workbench'

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
            disabled={data.loading.assignments}
            className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50'
          >
            <option value=''>{t('studio.tasks.composer.selectAssistantPlaceholder')}</option>
            {data.assignments.map((a) => (
              <option key={a.id} value={a.assistantId}>
                {a.assistantId.slice(0, 8)}
              </option>
            ))}
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
            disabled={data.loading.series}
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

      {/* Chapter — shown in studio mode, or preset in workbench */}
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
      {(isStudio || isWorkbench) && (
        <PagePickerWithPopup
          preset={preset}
          selected={{ pageId: selected.pageId, regionId: selected.regionId }}
          onChange={(next) => onChange({ ...selected, ...next })}
        />
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
