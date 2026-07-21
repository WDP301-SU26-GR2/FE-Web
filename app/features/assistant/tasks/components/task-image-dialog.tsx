import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Download, ScanLine, X } from 'lucide-react'

import { Dialog } from '~/shared/ui/dialog'
import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { seriesControllerListSeries } from '~/api/operations/series/series'
import { chapterControllerListBySeries, chapterControllerListPages } from '~/api/operations/chapters/chapters'
import type { PageResDtoOutput } from '~/api/model/chapters/pageResDtoOutput'
import type { TaskListResDtoOutputItemsItem, RegionResDtoOutput } from '~/api/model/task'
import { taskControllerListRegions } from '~/api/operations/task/task'
import { storageControllerSignDownload } from '~/api/operations/uploads/uploads'

const REGION_CLASS: Record<string, string> = {
  PANEL: 'border-primary bg-primary/20',
  BACKGROUND: 'border-emerald-500 bg-emerald-500/20',
  SPEECH_BUBBLE: 'border-sky-500 bg-sky-500/20',
  SFX: 'border-amber-500 bg-amber-500/20',
  CHARACTER: 'border-rose-500 bg-rose-500/20'
}

/**
 * Dialog body for a single task.
 *
 * Surfaces:
 *  1. The original page image at `task.pageId` (signed download URL).
 *  2. Region overlay bounding boxes for the regions of that page.
 *  3. A "Download original" button that opens the signed URL in a new tab —
 *     the **original** file only, never a composite/region preview.
 *
 * Discovery chain:
 *   The task card only carries `pageId`. There's no single `GET /pages/:id`
 *   endpoint, so we enumerate the user's series → chapters → pages and cache
 *   the first hit. Once a `PageResDtoOutput` is found for a `pageId` we keep
 *   it in `pageCacheRef.current` for the session — subsequent opens are O(1).
 */
export interface TaskImageDialogProps {
  open: boolean
  task: TaskListResDtoOutputItemsItem | null
  onOpenChange: (next: boolean) => void
}

export function TaskImageDialog({ open, task, onOpenChange }: TaskImageDialogProps) {
  const { t } = useTranslation('assistant')
  const pageCacheRef = useRef<Map<string, PageResDtoOutput>>(new Map())

  const [page, setPage] = useState<PageResDtoOutput | null>(null)
  const [regions, setRegions] = useState<RegionResDtoOutput[]>([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !task) return

    const ctrl = new AbortController()
    // Defer reset to next microtask to satisfy `react-hooks/set-state-in-effect`:
    // we want the loading flag AND clean state to settle together rather than
    // triggering cascading renders. Behaviorally identical — the user only
    // ever sees the loading spinner that follows.
    Promise.resolve().then(() => {
      setIsLoading(true)
      setError(null)
      setRegions([])
      setDownloadUrl(null)
      setImageDims(null)
      setPage(pageCacheRef.current.get(task.pageId) ?? null)
    })

    void (async () => {
      try {
        // 1) Resolve `pageId` → `PageResDtoOutput` (cache-first).
        let resolvedPage = pageCacheRef.current.get(task.pageId) ?? null
        if (!resolvedPage) {
          resolvedPage = await resolvePage(task.pageId, ctrl.signal)
          if (ctrl.signal.aborted) return
          if (resolvedPage) pageCacheRef.current.set(task.pageId, resolvedPage)
        }
        if (!resolvedPage) {
          setError(t('tasks.dialog.pageUnavailable'))
          return
        }
        setPage(resolvedPage)

        // 2) Fetch regions of the page; narrow to the one this task targets.
        const regionsRes = await taskControllerListRegions({ id: task.pageId }, { signal: ctrl.signal })
        if (ctrl.signal.aborted) return
        const regionList = (regionsRes.data?.items ?? []) as RegionResDtoOutput[]
        setRegions(task.regionId ? regionList.filter((r) => r.id === task.regionId) : regionList)

        // 3) Sign-download the original file so the <img> can render it.
        if (resolvedPage.originalFile) {
          const signed = await storageControllerSignDownload({ key: resolvedPage.originalFile })
          if (ctrl.signal.aborted) return
          const data = signed.data as { downloadUrl?: string } | null
          setDownloadUrl(data?.downloadUrl ?? null)
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        if (ctrl.signal.aborted) return
        setError(extractApiErrorMessage(err, t('tasks.dialog.loadFailed')))
      } finally {
        if (!ctrl.signal.aborted) setIsLoading(false)
      }
    })()

    return () => ctrl.abort()
  }, [open, task, t])

  const handleDownloadOriginal = useCallback(async () => {
    if (!page?.originalFile) return
    try {
      const signed = await storageControllerSignDownload({ key: page.originalFile })
      const data = signed.data as { downloadUrl?: string } | null
      const url = data?.downloadUrl
      if (!url) {
        toast.error(t('tasks.dialog.downloadFailed'))
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('tasks.dialog.downloadFailed')))
    }
  }, [page, t])

  if (!task) return null

  const titleId = 'task-image-dialog-title'
  const descriptionId = 'task-image-dialog-desc'

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      titleId={titleId}
      title={t('tasks.dialog.title', { n: page?.pageNumber ?? '?', id: task.pageId.slice(0, 8) })}
      descriptionId={descriptionId}
      description={t('tasks.dialog.description')}
      size='xl'
    >
        <div className='space-y-4'>
          {error && (
            <div className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive'>
              {error}
            </div>
          )}

          <div className='flex min-h-[300px] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/30'>
            {isLoading ? (
              <div className='flex items-center gap-2 p-10 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                {t('tasks.dialog.loading')}
              </div>
            ) : !downloadUrl ? (
              <div className='flex items-center gap-2 p-10 text-sm text-muted-foreground'>
                <X className='h-4 w-4' />
                {t('tasks.dialog.noOriginalFile')}
              </div>
            ) : (
              <div className='relative max-h-[60vh]'>
                <img
                  src={downloadUrl}
                  alt={t('tasks.dialog.imageAlt', { n: page?.pageNumber ?? '?' })}
                  className='max-h-[60vh] w-auto object-contain'
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setImageDims({ w: img.naturalWidth, h: img.naturalHeight })
                  }}
                />
                {imageDims &&
                  imageDims.w > 0 &&
                  imageDims.h > 0 &&
                  regions.map((region) => {
                    if (!region.coordinates) return null
                    const cls = REGION_CLASS[region.regionType ?? ''] ?? 'border-primary bg-primary/20'
                    return (
                      <div
                        key={region.id}
                        style={{
                          left: `${(region.coordinates.x / imageDims.w) * 100}%`,
                          top: `${(region.coordinates.y / imageDims.h) * 100}%`,
                          width: `${(region.coordinates.width / imageDims.w) * 100}%`,
                          height: `${(region.coordinates.height / imageDims.h) * 100}%`
                        }}
                        className={cn('pointer-events-none absolute border-2', cls)}
                        aria-hidden
                      />
                    )
                  })}
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='text-xs text-muted-foreground'>
              {task.regionId ? (
                <span className='inline-flex items-center gap-1.5'>
                  <ScanLine className='h-3 w-3' />
                  {t('tasks.dialog.regionCount', { count: regions.length })}
                </span>
              ) : (
                <span className='inline-flex items-center gap-1.5'>
                  <ScanLine className='h-3 w-3' />
                  {t('tasks.dialog.fullPageHint')}
                </span>
              )}
            </div>

            <button
              type='button'
              onClick={handleDownloadOriginal}
              disabled={!page?.originalFile}
              className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              <Download className='h-3.5 w-3.5' />
              {t('tasks.dialog.downloadOriginal')}
            </button>
          </div>
        </div>
    </Dialog>
  )
}

async function resolvePage(pageId: string, signal: AbortSignal): Promise<PageResDtoOutput | null> {
  const seriesRes = await seriesControllerListSeries({ limit: 100 }, { signal })
  if (signal.aborted) return null
  const seriesList = (seriesRes.data?.items ?? []) as Array<{ id: string }>

  for (const series of seriesList) {
    if (signal.aborted) return null
    const chaptersRes = await chapterControllerListBySeries({ seriesId: series.id }, { signal })
    if (signal.aborted) return null
    const chapters = (chaptersRes.data?.items ?? []) as Array<{ id: string }>
    for (const chapter of chapters) {
      if (signal.aborted) return null
      const pagesRes = await chapterControllerListPages({ id: chapter.id }, { signal })
      if (signal.aborted) return null
      const pages = (pagesRes.data?.items ?? []) as PageResDtoOutput[]
      const hit = pages.find((p) => p.id === pageId)
      if (hit) return hit
    }
  }
  return null
}
