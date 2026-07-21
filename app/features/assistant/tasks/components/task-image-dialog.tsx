import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Loader2, Download, ScanLine, X, ChevronLeft, ChevronRight, ZoomIn, FileText, ImageIcon } from 'lucide-react'

import { Dialog } from '~/shared/ui/dialog'
import { cn } from '~/shared/lib/cn'
import { ImageRegionOverlay } from '~/shared/components/image-region-overlay'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import { useTaskSignedUrl } from '~/shared/hooks/use-task-signed-url'
import type { TaskListResDtoOutputItemsItem } from '~/api/model/task'

/**
 * FE-API-Guide-v3.md §6 (2026-07-21):
 *
 * Dialog body for a single task on Assistant side.
 *
 * Shows 2 images:
 * 1. Original image from Mangaka (pageOriginalFile) — with region overlay
 * 2. Assistant's submitted work (versions[latest].file)
 *
 * Both images require POST /tasks/:id/download-url (via useTaskSignedUrl)
 * because Assistant cannot use /uploads/sign-download for Mangaka's uploaded files.
 */

export interface TaskImageDialogProps {
  open: boolean
  task: TaskListResDtoOutputItemsItem | null
  onOpenChange: (next: boolean) => void
}

export function TaskImageDialog({ open, task, onOpenChange }: TaskImageDialogProps) {
  const { t } = useTranslation('assistant')
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Ảnh 1: Gốc từ Mangaka (pageOriginalFile)
  const originalR2Key = task?.pageOriginalFile ?? null

  // Ảnh 2: Bản Assistant nộp (versions[latest].file)
  const latestVersion = task?.versions.length
    ? task.versions.reduce((latest, v) => (v.versionNumber > latest.versionNumber ? v : latest))
    : null
  const submittedR2Key = latestVersion?.file ?? null

  // Dùng task.id từ TaskRes — có sẵn, không cần resolve page
  const originalSigned = useTaskSignedUrl(task?.id, originalR2Key)
  const submittedSigned = useTaskSignedUrl(task?.id, submittedR2Key)

  // Images cho carousel
  const images = [
    {
      key: 'original',
      r2Key: originalR2Key,
      label: t('tasks.dialog.image.original'),
      signed: originalSigned
    },
    {
      key: 'submitted',
      r2Key: submittedR2Key,
      label: t('tasks.dialog.image.submitted'),
      signed: submittedSigned
    }
  ].filter((img) => img.r2Key) as {
    key: string
    r2Key: string
    label: string
    signed: ReturnType<typeof useTaskSignedUrl>
  }[]

  const currentImage = images[carouselIndex] ?? images[0] ?? null

  // Auto-switch to submitted image if available
  if (submittedR2Key && carouselIndex === 0 && images.length > 1) {
    // Don't auto-switch on first render, only after interaction
  }

  const hasImages = images.length > 0

  // Download handler: fetch blob then create local blob URL
  const handleDownload = async (filename: string, signed: ReturnType<typeof useTaskSignedUrl>) => {
    if (signed.status !== 'ready') return
    try {
      const response = await fetch(signed.url)
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
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    } catch (err) {
      toast.error(extractApiErrorMessage(err, t('tasks.dialog.downloadFailed')))
    }
  }

  if (!task) return null

  const titleId = 'task-image-dialog-title'
  const descriptionId = 'task-image-dialog-desc'

  return (
    <>
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        titleId={titleId}
        title={t('tasks.dialog.title')}
        descriptionId={descriptionId}
        description={t('tasks.dialog.description')}
        size='xl'
      >
        <div className='space-y-4'>
          {/* Region info */}
          {task.regions?.length ? (
            <div className='flex items-start gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs'>
              <ScanLine className='h-3.5 w-3.5 shrink-0 text-primary' />
              <div>
                <p className='font-semibold text-foreground'>
                  {t('tasks.dialog.regionCount', { count: task.regions.length })}
                </p>
                {task.regions.map((region) => (
                  <p key={region.id} className='text-muted-foreground'>
                    {t(`tasks.dialog.regionType.${region.regionType}`, { defaultValue: region.regionType })} ·{' '}
                    {t('tasks.dialog.regionCoords', {
                      x: region.coordinates?.x ?? 0,
                      y: region.coordinates?.y ?? 0,
                      w: region.coordinates?.width ?? 0,
                      h: region.coordinates?.height ?? 0
                    })}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {/* Image Carousel */}
          <div className='relative overflow-hidden rounded-lg border border-border bg-muted/30'>
            {hasImages ? (
              <>
                {/* Image container */}
                <div className='relative min-h-75'>
                  {/* Original image with region overlay */}
                  {currentImage?.key === 'original' && originalR2Key ? (
                    <>
                      <ImageRegionOverlay
                        src={originalSigned.status === 'ready' ? originalSigned.url : ''}
                        alt={currentImage.label}
                        containerClassName='flex justify-center'
                        className={cn(
                          'block max-h-[60vh] max-w-full transition-opacity',
                          originalSigned.status === 'ready' && imageLoaded ? 'opacity-100' : 'opacity-0'
                        )}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(false)}
                        draggable={false}
                        regions={task.regions}
                      />
                      {/* Loading state */}
                      {originalSigned.status === 'loading' && (
                        <div className='absolute inset-0 flex items-center justify-center'>
                          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                        </div>
                      )}
                      {/* Error state */}
                      {originalSigned.status === 'error' && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                          <X className='h-8 w-8' />
                          <span className='text-sm'>{t('tasks.dialog.loadFailed')}</span>
                        </div>
                      )}
                    </>
                  ) : currentImage?.key === 'submitted' && submittedR2Key ? (
                    <div>
                      <img
                        src={submittedSigned.status === 'ready' ? submittedSigned.url : ''}
                        alt={currentImage.label}
                        className={cn(
                          'max-h-[60vh] w-full object-contain transition-opacity',
                          submittedSigned.status === 'ready' && imageLoaded ? 'opacity-100' : 'opacity-0'
                        )}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(false)}
                        draggable={false}
                      />
                      {/* Loading state */}
                      {submittedSigned.status === 'loading' && (
                        <div className='absolute inset-0 flex items-center justify-center'>
                          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                        </div>
                      )}
                      {/* Error state */}
                      {submittedSigned.status === 'error' && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                          <X className='h-8 w-8' />
                          <span className='text-sm'>{t('tasks.dialog.loadFailed')}</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Zoom button */}
                  <button
                    type='button'
                    onClick={() => setLightboxOpen(true)}
                    className='absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 cursor-pointer'
                    aria-label={t('tasks.dialog.viewFullsize')}
                  >
                    <ZoomIn className='h-4 w-4' />
                  </button>
                </div>

                {/* Carousel controls */}
                {images.length > 1 && (
                  <>
                    {/* Dot indicators */}
                    <div className='absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1'>
                      {images.map((img, idx) => (
                        <button
                          key={img.key}
                          type='button'
                          onClick={() => {
                            setCarouselIndex(idx)
                            setImageLoaded(false)
                          }}
                          className={cn(
                            'h-2 w-2 rounded-full transition-colors cursor-pointer',
                            idx === carouselIndex ? 'bg-white' : 'bg-white/50'
                          )}
                          aria-label={img.label}
                        />
                      ))}
                    </div>

                    {/* Navigation arrows */}
                    <button
                      type='button'
                      onClick={() => {
                        setCarouselIndex((i) => (i > 0 ? i - 1 : images.length - 1))
                        setImageLoaded(false)
                      }}
                      className='absolute left-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 cursor-pointer'
                      aria-label='Previous'
                    >
                      <ChevronLeft className='h-4 w-4' />
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setCarouselIndex((i) => (i < images.length - 1 ? i + 1 : 0))
                        setImageLoaded(false)
                      }}
                      className='absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 cursor-pointer'
                      aria-label='Next'
                    >
                      <ChevronRight className='h-4 w-4' />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className='flex min-h-75 items-center justify-center text-sm text-muted-foreground'>
                <X className='mr-2 h-4 w-4' />
                {t('tasks.dialog.noImage')}
              </div>
            )}
          </div>

          {task.assets?.length ? (
            <section aria-labelledby='task-reference-assets-title' className='space-y-2'>
              <h3 id='task-reference-assets-title' className='text-sm font-bold text-foreground'>
                {t('tasks.dialog.attachments')}
              </h3>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                {task.assets.map((asset) => (
                  <ReferenceAsset key={asset.id} taskId={task.id} asset={asset} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Actions */}
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='text-xs text-muted-foreground'>
              {currentImage && (
                <span className='inline-flex items-center gap-1.5'>
                  {currentImage.key === 'original' ? (
                    <ScanLine className='h-3 w-3' />
                  ) : (
                    <ScanLine className='h-3 w-3' />
                  )}
                  {currentImage.label}
                  {images.length > 1 && ` (${carouselIndex + 1}/${images.length})`}
                </span>
              )}
            </div>

            <div className='flex items-center gap-2'>
              {submittedR2Key && (
                <button
                  type='button'
                  onClick={() =>
                    handleDownload(`task-${task.id.slice(0, 8)}-v${latestVersion?.versionNumber}.png`, submittedSigned)
                  }
                  disabled={submittedSigned.status !== 'ready'}
                  className='inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                >
                  <Download className='h-3.5 w-3.5' />
                  {t('tasks.dialog.downloadSubmitted')}
                </button>
              )}
              {originalR2Key && (
                <button
                  type='button'
                  onClick={() => handleDownload(`task-${task.id.slice(0, 8)}-original.png`, originalSigned)}
                  disabled={originalSigned.status !== 'ready'}
                  className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm transition-opacity hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                >
                  <Download className='h-3.5 w-3.5' />
                  {t('tasks.dialog.downloadOriginal')}
                </button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Lightbox */}
      {lightboxOpen && currentImage && (
        <LightboxDialog
          task={task}
          images={images}
          currentIndex={carouselIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={setCarouselIndex}
        />
      )}
    </>
  )
}

type ReferenceAsset = NonNullable<TaskListResDtoOutputItemsItem['assets']>[number]

function ReferenceAsset({ taskId, asset }: { taskId: string; asset: ReferenceAsset }) {
  const { t } = useTranslation('assistant')
  const signed = useTaskSignedUrl(taskId, asset.filePath)
  const isImage = /\.(png|jpe?g|webp)$/i.test(asset.filePath)
  const label = isImage
    ? t('tasks.dialog.attachmentImage', { name: asset.name })
    : t('tasks.dialog.attachmentDocument', { name: asset.name })

  return (
    <article className='overflow-hidden rounded-lg border border-border bg-card'>
      {isImage ? (
        signed.status === 'ready' ? (
          <a href={signed.url} target='_blank' rel='noreferrer' aria-label={label} className='block bg-muted/30'>
            <img src={signed.url} alt={label} className='h-36 w-full object-cover transition-opacity hover:opacity-85' />
          </a>
        ) : (
          <div className='flex h-36 items-center justify-center bg-muted/30 text-muted-foreground'>
            {signed.status === 'loading' ? <Loader2 className='h-5 w-5 animate-spin' /> : <ImageIcon className='h-5 w-5' />}
          </div>
        )
      ) : (
        <div className='flex h-20 items-center justify-center bg-muted/30 text-muted-foreground'>
          <FileText className='h-7 w-7' />
        </div>
      )}
      <div className='flex items-center gap-2 p-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-xs font-semibold text-foreground' title={asset.name}>{asset.name}</p>
          {asset.assetType && <p className='mt-0.5 text-[11px] text-muted-foreground'>{asset.assetType}</p>}
        </div>
        {signed.status === 'ready' && (
          <a
            href={signed.url}
            target='_blank'
            rel='noreferrer'
            className='inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted'
          >
            <Download className='h-3.5 w-3.5' />
            {isImage ? t('tasks.dialog.viewAttachment') : t('tasks.dialog.downloadAttachment')}
          </a>
        )}
      </div>
    </article>
  )
}

interface LightboxDialogProps {
  task: TaskListResDtoOutputItemsItem
  images: Array<{
    key: string
    r2Key: string
    label: string
    signed: ReturnType<typeof useTaskSignedUrl>
  }>
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}

function LightboxDialog({ task, images, currentIndex, onClose, onNavigate }: LightboxDialogProps) {
  const { t } = useTranslation('assistant')
  const currentImage = images[currentIndex]

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
        {currentIndex + 1} / {images.length} — {currentImage?.label}
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

      {/* Image */}
      <div className='flex items-center justify-center' onClick={(e) => e.stopPropagation()}>
        {currentImage?.key === 'original' && (
          <ImageRegionOverlay
            src={currentImage.signed.status === 'ready' ? currentImage.signed.url : ''}
            alt={currentImage.label}
            className='block max-h-[90vh] max-w-[90vw]'
            regions={task.regions}
          />
        )}
        {currentImage?.key === 'submitted' && (
          <img
            src={currentImage.signed.status === 'ready' ? currentImage.signed.url : ''}
            alt={currentImage.label}
            className='max-h-[90vh] max-w-[90vw] object-contain'
          />
        )}
        {(currentImage?.signed.status === 'loading' || currentImage?.signed.status === 'idle') && (
          <Loader2 className='h-12 w-12 animate-spin text-white/60' />
        )}
      </div>
    </div>
  )
}
