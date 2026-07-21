import { useState, useLayoutEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  X,
  ZoomIn,
  ChevronDown,
  Loader2
} from 'lucide-react'
import { cn } from '~/shared/lib/cn'
import { ImageRegionOverlay, type ImageRegion } from '~/shared/components/image-region-overlay'
import { SignedImage } from '~/shared/components/signed-image'
import { StatusBadge } from '~/shared/ui'
import { getTaskStatusTone } from '../lib/task-status-meta'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task/taskListResDtoOutputItemsItem'
import { TaskSignedImage } from './task-signed-image'
import { useTaskSignedUrl } from '../lib/use-task-signed-url'

export interface TaskBoardProps {
  tasks: TaskListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onApprove: (taskId: string) => void
  onRequestRevision: (taskId: string) => void
  onCancel: (taskId: string) => void
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

function formatDeadline(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

export function TaskBoard({
  tasks,
  isLoading,
  error,
  onRefresh,
  onApprove,
  onRequestRevision,
  onCancel,
  page,
  totalPages,
  total,
  onPageChange
}: TaskBoardProps) {
  const { t } = useTranslation('mangaka')

  return (
    <div className='space-y-3'>
      {/* Error */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive'
        >
          <div className='flex items-center gap-2'>
            <AlertCircle className='h-4 w-4' />
            <span>{error}</span>
          </div>
          <button type='button' onClick={onRefresh} className='text-xs font-semibold hover:underline'>
            {t('tasks.board.refresh')}
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className='grid grid-cols-1 gap-3'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='h-48 animate-pulse rounded-lg border border-border bg-muted' />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && tasks.length === 0 && !error && (
        <div className='flex flex-col items-center gap-2 py-12 text-center'>
          <p className='text-sm font-semibold text-muted-foreground'>{t('tasks.board.empty')}</p>
        </div>
      )}

      {/* Task list */}
      {!isLoading && tasks.length > 0 && (
        <>
          <div className='space-y-3'>
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onApprove={onApprove}
                onRequestRevision={onRequestRevision}
                onCancel={onCancel}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between border-t border-border pt-3'>
              <span className='text-xs text-muted-foreground'>
                {t('tasks.pagination.showing', { from: (page - 1) * 4 + 1, to: Math.min(page * 4, total), total })}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                <span className='min-w-15 text-center text-sm text-foreground'>
                  {page} / {totalPages}
                </span>
                <button
                  type='button'
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: TaskListResDtoOutputItemsItem
  onApprove: (taskId: string) => void
  onRequestRevision: (taskId: string) => void
  onCancel: (taskId: string) => void
}

function TaskCard({ task, onApprove, onRequestRevision, onCancel }: TaskCardProps) {
  const { t, i18n } = useTranslation('mangaka')
  const tone = getTaskStatusTone(task.status)
  const overdue = isOverdue(task.deadline)
  const statusLabel = t(`tasks.status.${task.status}`, { defaultValue: task.status })
  const taskTypeLabel = task.taskType
    ? t(`tasks.composer.taskTypeEnum.${task.taskType}`, { defaultValue: task.taskType })
    : '—'

  // FE-API-Guide-v3.md §6 (2026-07-21):
  // ẢNH 1 — ẢNH GỐC (Mangaka giao): dùng `task.pageOriginalFile` (R2 key)
  // → Đọc qua POST /tasks/:id/download-url (useTaskSignedUrl)
  const originalR2Key = task.pageOriginalFile ?? null

  // Lấy version mới nhất (nếu có)
  const latestVersion =
    task.versions.length > 0
      ? task.versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest))
      : null

  // FE-API-Guide-v3.md §6 (2026-07-21):
  // ẢNH 2 — BẢN ASSISTANT NỘP: dùng `versions[].file` (R2 key)
  // → Đọc qua POST /tasks/:id/download-url (useTaskSignedUrl)
  const submittedR2Key = latestVersion?.file ?? null
  const submitter = latestVersion?.submitter

  // Signed URL cho ảnh submitted (dùng cho download)
  const submittedSignedUrl = useTaskSignedUrl(task.id, submittedR2Key)

  const [carouselIndex, setCarouselIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Dùng task.pageOriginalFile (không dùng pageData từ cache nữa)
  const images = [
    { r2Key: originalR2Key, label: t('studio.tasksTab.image.original'), key: 'original' },
    { r2Key: submittedR2Key, label: t('studio.tasksTab.image.submitted'), key: 'submitted' }
  ].filter((img) => img.r2Key) as { r2Key: string; label: string; key: string }[]

  const currentImage = images[carouselIndex] ?? images[0] ?? null
  const hasImages = images.length > 0

  // Auto-switch to submitted image if available (useLayoutEffect to avoid visual flicker)
  useLayoutEffect(() => {
    if (submittedR2Key && carouselIndex === 0 && images.length > 1) {
      setCarouselIndex(1)
    }
  }, [submittedR2Key])

  // Reset carouselIndex if it goes out of bounds
  useLayoutEffect(() => {
    if (carouselIndex >= images.length && images.length > 0) {
      setCarouselIndex(images.length - 1)
    }
  }, [carouselIndex, images.length])

  // Download: fetch blob then create local blob URL for download
  // (Browser's download attribute doesn't work with cross-origin signed URLs)
  const handleDownload = async (filename: string) => {
    if (submittedSignedUrl.status !== 'ready' || isDownloading) return
    setIsDownloading(true)
    try {
      const response = await fetch(submittedSignedUrl.url)
      if (!response.ok) throw new Error('Fetch failed')
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Revoke after a short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className='overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/30'>
      {/* Header - Task info */}
      <div className='flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <StatusBadge tone={tone}>{statusLabel}</StatusBadge>
          <div className='min-w-0 flex-1 space-y-0.5'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='text-sm font-medium'>{taskTypeLabel}</span>
              {task.regions?.length ? (
                <span className='rounded bg-primary/10 px-2 py-0.5 text-xs text-primary'>
                  {t('studio.tasks.board.regions', { count: task.regions.length })}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Deadline & Priority */}
        <div className='flex items-center gap-2'>
          {task.deadline && (
            <div
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                overdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              )}
            >
              <span>{t('studio.tasks.board.deadline', { date: formatDeadline(task.deadline, i18n.language) })}</span>
            </div>
          )}
          {task.priority !== undefined && task.priority > 0 && (
            <div className='flex items-center gap-1 rounded bg-warning/10 px-2 py-0.5 text-xs text-warning'>
              <span>{t('studio.tasks.board.priority', { value: task.priority })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content - Images & Info */}
      <div className='flex flex-col md:flex-row'>
        {/* Image Carousel */}
        {hasImages ? (
          <div className='group relative w-full md:w-80 shrink-0 bg-muted'>
            {/* Image — dùng TaskSignedImage cho cả 2 loại ảnh */}
            <div className='relative aspect-3/4 md:aspect-auto md:h-52'>
              {currentImage ? (
                <TaskSignedImage
                  taskId={task.id}
                  r2Key={currentImage.r2Key}
                  alt={currentImage.label}
                  className='absolute inset-0 h-full w-full'
                  imgClassName='h-full w-full object-contain'
                />
              ) : null}

              {/* Zoom button */}
              <button
                type='button'
                onClick={() => setLightboxOpen(true)}
                className='absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100'
                aria-label={t('studio.tasksTab.viewFullsize')}
              >
                <ZoomIn className='h-4 w-4' />
              </button>
            </div>

            {/* Carousel controls */}
            {images.length > 1 && (
              <div className='absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1'>
                {images.map((img, idx) => (
                  <button
                    key={img.key}
                    type='button'
                    onClick={() => setCarouselIndex(idx)}
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors cursor-pointer',
                      idx === carouselIndex ? 'bg-white' : 'bg-white/50'
                    )}
                    aria-label={img.label}
                  />
                ))}
              </div>
            )}

            {/* Image navigation arrows */}
            {images.length > 1 && (
              <>
                <button
                  type='button'
                  onClick={() => setCarouselIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                  className='absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100'
                  aria-label='Previous image'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setCarouselIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                  className='absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100'
                  aria-label='Next image'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </>
            )}

            {/* Download button for submitted image */}
            {submittedR2Key && (
              <button
                type='button'
                onClick={() => handleDownload(`task-${task.id.slice(0, 8)}-v${latestVersion?.versionNumber}.png`)}
                disabled={submittedSignedUrl.status !== 'ready' || isDownloading}
                className='absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 cursor-pointer disabled:opacity-50'
                aria-label={t('studio.tasksTab.download')}
              >
                {submittedSignedUrl.status === 'loading' || isDownloading ? (
                  <span className='h-3 w-3 animate-spin rounded-full border border-white border-t-transparent' />
                ) : (
                  <Download className='h-3 w-3' />
                )}
                <span>{t('studio.tasksTab.download')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className='flex w-full md:w-80 shrink-0 items-center justify-center bg-muted/50 md:h-52'>
            <div className='flex flex-col items-center gap-1 text-xs text-muted-foreground'>
              <FileText className='h-6 w-6' />
              <span>{t('studio.tasksTab.noImage')}</span>
            </div>
          </div>
        )}

        {/* Info panel */}
        <div className='min-w-0 flex-1 space-y-3 p-4'>
          {/* Assistant info */}
          {task.assistant && (
            <div className='flex items-center gap-2'>
              {task.assistant.avatar ? (
                <SignedImage
                  r2Key={task.assistant.avatar}
                  alt={task.assistant.displayName ?? ''}
                  aspectClassName='aspect-square'
                  className='h-8 w-8 rounded-full'
                />
              ) : (
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10'>
                  <User className='h-4 w-4 text-primary' />
                </div>
              )}
              <div>
                <p className='text-sm font-medium'>{task.assistant.displayName ?? task.assistant.displayName}</p>
                <p className='text-xs text-muted-foreground'>{t('studio.tasksTab.assistant')}</p>
              </div>
            </div>
          )}

          {/* Submitted version info */}
          {latestVersion && submitter && (
            <div className='rounded-lg bg-muted/50 p-3'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('studio.tasksTab.latestSubmission')}
                </span>
                <span className='text-xs text-muted-foreground'>v{latestVersion.versionNumber}</span>
              </div>
              <div className='flex items-center gap-2'>
                {submitter.avatar ? (
                  <SignedImage
                    r2Key={submitter.avatar}
                    alt={submitter.displayName ?? ''}
                    aspectClassName='aspect-square'
                    className='h-6 w-6 rounded-full'
                  />
                ) : (
                  <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10'>
                    <User className='h-3 w-3 text-primary' />
                  </div>
                )}
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm'>{submitter.displayName}</p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(latestVersion.submittedAt).toLocaleDateString(i18n.language, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <StatusBadge tone={getReviewStatusTone(latestVersion.reviewStatus)}>
                  {t(`studio.tasksTab.reviewStatus.${latestVersion.reviewStatus}`)}
                </StatusBadge>
              </div>
              {latestVersion.reviewerNote && (
                <p className='mt-2 rounded bg-warning/10 p-2 text-xs text-warning'>{latestVersion.reviewerNote}</p>
              )}
            </div>
          )}

          {/* Version history toggle */}
          {task.versions.length > 1 && (
            <details className='group'>
              <summary className='flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground'>
                <ChevronDown className='h-3 w-3 transition-transform group-open:rotate-180' />
                {t('studio.tasksTab.versionHistory', { count: task.versions.length })}
              </summary>
              <div className='mt-2 space-y-2'>
                {task.versions
                  .slice()
                  .reverse()
                  .map((v) => (
                    <div key={v.versionNumber} className='flex items-center gap-2 rounded bg-muted/30 p-2 text-xs'>
                      <span className='font-medium'>v{v.versionNumber}</span>
                      <span className='text-muted-foreground'>
                        {new Date(v.submittedAt).toLocaleDateString(i18n.language)}
                      </span>
                      <StatusBadge tone={getReviewStatusTone(v.reviewStatus)}>
                        {t(`studio.tasksTab.reviewStatus.${v.reviewStatus}`)}
                      </StatusBadge>
                    </div>
                  ))}
              </div>
            </details>
          )}

          {/* Actions */}
          <div className='flex flex-wrap items-center gap-2 pt-2'>
            {task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' ? (
              <>
                <button
                  type='button'
                  onClick={() => onApprove(task.id)}
                  className='rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white hover:bg-success/90 cursor-pointer transition-colors'
                >
                  {t('tasks.board.approve')}
                </button>
                <button
                  type='button'
                  onClick={() => onRequestRevision(task.id)}
                  className='rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-white hover:bg-warning/90 cursor-pointer transition-colors'
                >
                  {t('tasks.board.revision')}
                </button>
              </>
            ) : task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS' || task.status === 'REVISION_REQUESTED' ? (
              <button
                type='button'
                onClick={() => onCancel(task.id)}
                className='rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 cursor-pointer transition-colors'
              >
                {t('tasks.board.cancel')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <Lightbox
          taskId={task.id}
          images={images}
          regions={task.regions}
          currentIndex={carouselIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCarouselIndex}
        />
      )}
    </div>
  )
}

interface LightboxProps {
  taskId: string
  images: { r2Key: string | null; label: string; key: string }[]
  regions?: ImageRegion[] | null
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

function LightboxImage({
  taskId,
  r2Key,
  alt,
  regions
}: {
  taskId: string
  r2Key: string
  alt: string
  regions?: ImageRegion[] | null
}) {
  const signed = useTaskSignedUrl(taskId, r2Key)
  const [imgErrored, setImgErrored] = useState(false)

  if (signed.status === 'loading' || signed.status === 'idle') {
    return (
      <div className='flex items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-white/60' />
      </div>
    )
  }

  if (signed.status === 'error' || imgErrored) {
    return (
      <div className='flex flex-col items-center justify-center gap-2 text-white/60'>
        <X className='h-12 w-12' />
        <span className='text-sm'>Failed to load image</span>
      </div>
    )
  }

  return (
    <ImageRegionOverlay
      src={signed.url}
      alt={alt}
      className='max-h-[90vh] max-w-[90vw] object-contain'
      onError={() => setImgErrored(true)}
      regions={regions}
    />
  )
}

function Lightbox({ taskId, images, regions, currentIndex, onClose, onNavigate }: LightboxProps) {
  const currentImage = images[currentIndex]
  if (!currentImage || !currentImage.r2Key) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/90' onClick={onClose}>
      {/* Close button */}
      <button
        type='button'
        onClick={onClose}
        className='absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer z-10'
        aria-label='Close'
      >
        <X className='h-5 w-5' />
      </button>

      {/* Image counter */}
      <div className='absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-3 py-1 text-sm text-white'>
        {currentIndex + 1} / {images.length} — {currentImage.label}
      </div>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(currentIndex > 0 ? currentIndex - 1 : images.length - 1)
            }}
            className='absolute left-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer'
            aria-label='Previous'
          >
            <ChevronLeft className='h-6 w-6' />
          </button>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(currentIndex < images.length - 1 ? currentIndex + 1 : 0)
            }}
            className='absolute right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer'
            aria-label='Next'
          >
            <ChevronRight className='h-6 w-6' />
          </button>
        </>
      )}

      {/* Image — render directly for lightbox */}
      <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
        <LightboxImage
          taskId={taskId}
          r2Key={currentImage.r2Key}
          alt={currentImage.label}
          regions={currentImage.key === 'original' ? regions : null}
        />
      </div>
    </div>
  )
}

function getReviewStatusTone(status: string): 'success' | 'warning' | 'destructive' | 'neutral' {
  switch (status) {
    case 'APPROVED':
      return 'success'
    case 'REVISION_REQUESTED':
      return 'destructive'
    case 'PENDING':
      return 'warning'
    default:
      return 'neutral'
  }
}
