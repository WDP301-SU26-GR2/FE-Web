import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X, SlidersHorizontal, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '~/shared/lib/cn'
import {
  useMangakaSeriesList,
  useMangakaChapterList,
  useMangakaChapterPages
} from '~/features/mangaka/hooks/use-task-scope'
import { useMangakaTasks } from '~/features/mangaka/assistants/use-mangaka-tasks'
import type { TaskControllerListTasksStatus } from '~/api/model/task/taskControllerListTasksStatus'
import { TaskBoard } from '~/features/mangaka/assistants/components/task-board'
import type { PageResDtoOutput } from '~/api/model/chapters/pageResDtoOutput'
import { chapterControllerListPages } from '~/api/operations/chapters/chapters'
import { isFetchError } from '~/api/mutator/custom-fetch'

const STATUS_OPTIONS: TaskControllerListTasksStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REVISION_REQUESTED',
  'ON_HOLD',
  'CANCELLED'
]

/**
 * Tasks tab for the Mangaka Studio page.
 *
 * Redesigned UI:
 * - Single horizontal filter bar
 * - Status filter is a dropdown on the right
 * - Pagination with 4 items per page
 * - Image carousel with original + submitted versions
 * - Region overlay for task regions
 */
export function StudioTasksTab() {
  const { t } = useTranslation('mangaka')

  const seriesQuery = useMangakaSeriesList()
  const [seriesId, setSeriesId] = useState<string | undefined>(undefined)
  const [chapterId, setChapterId] = useState<string | undefined>(undefined)
  const [pageId, setPageId] = useState<string | undefined>(undefined)
  const [status, setStatus] = useState<TaskControllerListTasksStatus | undefined>(undefined)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Cache pages from all chapters we've fetched
  const [pagesCache, setPagesCache] = useState<Record<string, PageResDtoOutput[]>>({})
  const [isLoadingPagesCache, setIsLoadingPagesCache] = useState(false)

  const chapterQuery = useMangakaChapterList(seriesId ?? null)
  const pageQuery = useMangakaChapterPages(chapterId ?? null)

  // Add fetched pages to cache when pageQuery completes
  useEffect(() => {
    if (chapterId && pageQuery.items.length > 0) {
      setPagesCache((prev) => ({ ...prev, [chapterId]: pageQuery.items }))
    }
  }, [chapterId, pageQuery.items])

  // Get all cached pages as a flat array
  const allCachedPages = useMemo(
    () => Object.values(pagesCache).flat(),
    [pagesCache]
  )

  const taskQuery = useMangakaTasks({
    seriesId,
    chapterId,
    pageId,
    status,
    page: currentPage
  })

  const hasActiveFilters = seriesId || chapterId || pageId || status
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [seriesId, chapterId, pageId, status])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    if (statusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [statusDropdownOpen])

  const handleSeriesChange = (next: string | undefined) => {
    setSeriesId(next)
    setChapterId(undefined)
    setPageId(undefined)
    setPagesCache({}) // Clear cache when changing series
  }

  const handleChapterChange = (next: string | undefined) => {
    setChapterId(next)
    setPageId(undefined)
  }

  const clearAllFilters = () => {
    setSeriesId(undefined)
    setChapterId(undefined)
    setPageId(undefined)
    setStatus(undefined)
    setCurrentPage(1)
    setPagesCache({})
  }

  const getStatusLabel = (s: TaskControllerListTasksStatus | undefined) => {
    if (!s) return t('studio.tasksTab.allStatuses')
    return t(`tasks.status.${s}`)
  }

  return (
    <div className='space-y-4'>
      {/* Single horizontal filter bar */}
      <div className='rounded-xl border border-border bg-card p-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <SlidersHorizontal className='h-4 w-4 text-muted-foreground shrink-0' />

          {/* Series dropdown */}
          <select
            value={seriesId ?? ''}
            onChange={(e) => handleSeriesChange(e.target.value || undefined)}
            disabled={seriesQuery.isLoading}
            className={cn(
              'h-8 rounded-md border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none',
              seriesId
                ? 'border-primary text-foreground'
                : 'border-border text-muted-foreground'
            )}
          >
            <option value=''>{t('studio.tasksTab.allSeries')}</option>
            {seriesQuery.items.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>

          {/* Chapter dropdown */}
          <select
            value={chapterId ?? ''}
            onChange={(e) => handleChapterChange(e.target.value || undefined)}
            disabled={chapterQuery.isLoading || !seriesId}
            className={cn(
              'h-8 rounded-md border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none',
              chapterId
                ? 'border-primary text-foreground'
                : 'border-border text-muted-foreground',
              !seriesId && 'opacity-50'
            )}
          >
            <option value=''>{t('studio.tasksTab.allChapters')}</option>
            {chapterQuery.items.map((c) => (
              <option key={c.id} value={c.id}>
                {t('studio.tasksTab.chapterLabel', { n: c.chapterNumber })}
                {c.title ? ` — ${c.title}` : ''}
              </option>
            ))}
          </select>

          {/* Page dropdown */}
          <select
            value={pageId ?? ''}
            onChange={(e) => setPageId(e.target.value || undefined)}
            disabled={pageQuery.isLoading || !chapterId}
            className={cn(
              'h-8 rounded-md border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none',
              pageId
                ? 'border-primary text-foreground'
                : 'border-border text-muted-foreground',
              !chapterId && 'opacity-50'
            )}
          >
            <option value=''>{t('studio.tasksTab.allPages')}</option>
            {pageQuery.items.map((p) => (
              <option key={p.id} value={p.id}>
                {t('studio.tasksTab.pageLabel', { n: p.pageNumber })}
              </option>
            ))}
          </select>

          {/* Spacer */}
          <div className='flex-1' />

          {/* Status dropdown */}
          <div ref={dropdownRef} className='relative'>
            <button
              type='button'
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={cn(
                'h-8 rounded-md border bg-background pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer flex items-center gap-2 transition-colors',
                status
                  ? 'border-primary text-foreground bg-primary/5'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              <span>{getStatusLabel(status)}</span>
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 transition-transform',
                statusDropdownOpen && 'rotate-180'
              )} />
            </button>

            {/* Dropdown menu */}
            {statusDropdownOpen && (
              <div className='absolute right-0 top-full mt-1 z-50 min-w-40 rounded-lg border border-border bg-card shadow-lg py-1'>
                <button
                  type='button'
                  onClick={() => {
                    setStatus(undefined)
                    setStatusDropdownOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer',
                    !status && 'bg-primary/10 text-primary'
                  )}
                >
                  <span>{t('studio.tasksTab.allStatuses')}</span>
                  {!status && <Check className='h-4 w-4' />}
                </button>
                <div className='h-px bg-border my-1' />
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type='button'
                    onClick={() => {
                      setStatus(s)
                      setStatusDropdownOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer',
                      status === s && 'bg-primary/10 text-primary'
                    )}
                  >
                    <span>{t(`tasks.status.${s}`)}</span>
                    {status === s && <Check className='h-4 w-4' />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              type='button'
              onClick={clearAllFilters}
              className='flex h-8 items-center gap-1 rounded-md border border-border bg-muted/50 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
            >
              <X className='h-3 w-3' />
              {t('studio.tasksTab.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Task list area */}
      <div className='rounded-xl border border-border bg-card shadow-sm'>
        {taskQuery.isLoading && (
          <div className='flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            {t('studio.tasksTab.loading')}
          </div>
        )}
        {!taskQuery.isLoading && taskQuery.error && (
          <div className='px-4 py-6 text-sm text-destructive'>{taskQuery.error}</div>
        )}
        {!taskQuery.isLoading && !taskQuery.error && (
          <TaskBoard
            tasks={taskQuery.tasks}
            isLoading={taskQuery.isLoading}
            error={taskQuery.error}
            onRefresh={taskQuery.refresh}
            onApprove={(id) => {
              void taskQuery.approveTask(id).then((r) => {
                if (r.success) toast.success(t('studio.tasksTab.toast.approved'))
                else toast.error(r.error ?? t('studio.tasksTab.toast.approveFailed'))
              })
            }}
            onRequestRevision={(id) => {
              const note = window.prompt(t('studio.tasksTab.revisionPrompt'))?.trim()
              if (!note) return
              void taskQuery.requestRevision(id, note).then((r) => {
                if (r.success) toast.success(t('studio.tasksTab.toast.revisionRequested'))
                else toast.error(r.error ?? t('studio.tasksTab.toast.revisionFailed'))
              })
            }}
            onCancel={(id) => {
              const reason = window.prompt(t('studio.tasksTab.cancelPrompt'))?.trim()
              if (reason === undefined) return
              void taskQuery.cancelTask(id, reason || undefined).then((r) => {
                if (r.success) toast.success(t('studio.tasksTab.toast.cancelled'))
                else toast.error(r.error ?? t('studio.tasksTab.toast.cancelFailed'))
              })
            }}
            page={currentPage}
            totalPages={taskQuery.totalPages}
            total={taskQuery.total}
            onPageChange={(page) => setCurrentPage(page)}
            pages={allCachedPages}
            isLoadingPages={pageQuery.isLoading || isLoadingPagesCache}
          />
        )}
      </div>
    </div>
  )
}
