import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { useSignedImageUrl } from '~/shared/hooks/use-signed-image-url'
import type { RegionResDtoOutput } from '~/api/model/task'

export type RegionType = 'PANEL' | 'BACKGROUND' | 'SPEECH_BUBBLE' | 'SFX' | 'CHARACTER'

export type ProposedRegion = {
  coordinates: { x: number; y: number; width: number; height: number }
  regionType: RegionType
  detectedSubtype: string | null
  confidenceScore: number | null
}

export type PixelRect = { x: number; y: number; width: number; height: number }

export type CanvasMode = 'view' | 'draw' | 'preview'

export interface PageRegionCanvasProps {
  /** Original R2 object key for the page image. */
  imageKey: string | null | undefined
  alt: string
  /** Existing regions (committed to BE). */
  regions: RegionResDtoOutput[]
  /** AI-proposed regions (ephemeral — not yet applied). */
  proposedRegions?: ProposedRegion[]
  /** Active drawing mode. */
  mode: CanvasMode
  /** Region the user has selected in the parent (for highlight). */
  selectedRegionId?: string | null
  /** Called when the user finishes a drag and commits a rect (in pixel coords). */
  onCommitDraft?: (rect: PixelRect) => void
  /** Called when the user clicks an existing region. */
  onSelectRegion?: (regionId: string) => void
  className?: string
}

const REGION_TYPE_COLOR: Record<RegionType, string> = {
  PANEL: 'border-primary bg-primary/10',
  BACKGROUND: 'border-info bg-info/10',
  SPEECH_BUBBLE: 'border-secondary-foreground/60 bg-secondary',
  SFX: 'border-warning bg-warning/10',
  CHARACTER: 'border-success bg-success/10'
}

/**
 * Overlay-on-image component used by `PageRegionPopup`.
 *
 * Responsibilities:
 *   1. Render the page image (signed-URL lookup) inside a known-aspect box.
 *   2. Overlay `regions[]` as a stack of borders + label chips.
 *   3. In `mode='draw'`, capture mouse drag → translate to **pixel rect**
 *      (relative to the image's natural size) and call `onCommitDraft`.
 *   4. In `mode='preview'`, render `proposedRegions[]` dashed (so users can
 *      apply / discard AI suggestions).
 *
 * Pixel mapping: we read `<img>.naturalWidth` after it loads and use it as
 * the source coordinate system. Server-stored regions also use this same
 * pixel space (`CreateRegionBodyDto.coordinates`).
 */
export function PageRegionCanvas({
  imageKey,
  alt,
  regions,
  proposedRegions = [],
  mode,
  selectedRegionId,
  onCommitDraft,
  onSelectRegion,
  className
}: PageRegionCanvasProps) {
  const { t } = useTranslation('mangaka')
  const signed = useSignedImageUrl(imageKey ?? null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

  // Drawing state — in pixel coordinates
  const [draftRect, setDraftRect] = useState<PixelRect | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })
      }
    },
    []
  )

  const clearDraft = useCallback(() => {
    setDraftRect(null)
    dragStartRef.current = null
  }, [])

  // Escape cancels an in-flight drag draft.
  useEffect(() => {
    if (mode !== 'draw') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearDraft()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, clearDraft])

  const toPixel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
      const rect = e.currentTarget.getBoundingClientRect()
      if (!naturalSize) return null
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      // Element sizes to match image's natural box (object-contain → image
      // fills the container while keeping its aspect). The rendered image
      // dimensions equal the container for our case because the container
      // is sized via CSS to match the image aspect via `aspect-[w/h]`.
      const x = Math.round((px / rect.width) * naturalSize.width)
      const y = Math.round((py / rect.height) * naturalSize.height)
      return {
        x: Math.max(0, Math.min(x, naturalSize.width - 1)),
        y: Math.max(0, Math.min(y, naturalSize.height - 1))
      }
    },
    [naturalSize]
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'draw' || !naturalSize) return
      // Only left-button (or touch/pen).
      if (e.button !== undefined && e.button !== 0) return
      const point = toPixel(e)
      if (!point) return
      e.preventDefault()
      dragStartRef.current = point
      setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 })
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
    },
    [mode, naturalSize, toPixel]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'draw' || !dragStartRef.current || !naturalSize) return
      const point = toPixel(e)
      if (!point) return
      const start = dragStartRef.current
      const x = Math.min(start.x, point.x)
      const y = Math.min(start.y, point.y)
      const width = Math.abs(point.x - start.x)
      const height = Math.abs(point.y - start.y)
      setDraftRect({ x, y, width, height })
    },
    [mode, naturalSize, toPixel]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (mode !== 'draw' || !draftRect) return
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
      // Reject tiny draws (< 4px both axes) — treat as misclick.
      if (draftRect.width < 4 || draftRect.height < 4) {
        clearDraft()
        return
      }
      onCommitDraft?.(draftRect)
      clearDraft()
    },
    [mode, draftRect, onCommitDraft, clearDraft]
  )

  const isImageReady = signed.status === 'ready' && !!imageKey

  const cursorClass = mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full select-none overflow-hidden rounded-md border border-border bg-muted/30', cursorClass, className)}
      style={{ aspectRatio: naturalSize ? `${naturalSize.width} / ${naturalSize.height}` : '3 / 4' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={clearDraft}
      aria-label={alt}
      data-mode={mode}
    >
      {/* 1. The image */}
      {isImageReady && signed.status === 'ready' && (
        <img
          src={signed.url}
          alt={alt}
          onLoad={handleImgLoad}
          draggable={false}
          className='absolute inset-0 h-full w-full select-none object-contain'
        />
      )}

      {/* 2. Existing regions */}
      {naturalSize &&
        regions.map((r) => {
          const isSelected = r.id === selectedRegionId
          const isAiUnconfirmed = r.createdBy === 'AI' && !r.confirmedByMangaka
          const tone = REGION_TYPE_COLOR[r.regionType as RegionType] ?? REGION_TYPE_COLOR.PANEL
          return (
            <button
              key={r.id}
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                onSelectRegion?.(r.id)
              }}
              style={{
                left: `${((r.coordinates?.x ?? 0) / naturalSize.width) * 100}%`,
                top: `${((r.coordinates?.y ?? 0) / naturalSize.height) * 100}%`,
                width: `${((r.coordinates?.width ?? 0) / naturalSize.width) * 100}%`,
                height: `${((r.coordinates?.height ?? 0) / naturalSize.height) * 100}%`
              }}
              className={cn(
                'absolute border-2 transition',
                tone,
                isAiUnconfirmed && 'border-dashed opacity-70',
                isSelected ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : 'hover:opacity-80'
              )}
              aria-label={t('studio.popup.region.label', {
                type: r.regionType ?? 'PANEL',
                id: r.id.slice(0, 6)
              })}
            />
          )
        })}

      {/* 3. AI proposed (preview mode only) */}
      {naturalSize &&
        mode === 'preview' &&
        proposedRegions.map((p, idx) => {
          const tone = REGION_TYPE_COLOR[p.regionType] ?? REGION_TYPE_COLOR.PANEL
          return (
            <div
              key={`proposed-${idx}`}
              style={{
                left: `${((p.coordinates?.x ?? 0) / naturalSize.width) * 100}%`,
                top: `${((p.coordinates?.y ?? 0) / naturalSize.height) * 100}%`,
                width: `${((p.coordinates?.width ?? 0) / naturalSize.width) * 100}%`,
                height: `${((p.coordinates?.height ?? 0) / naturalSize.height) * 100}%`
              }}
              className={cn('pointer-events-none absolute border-2 border-dashed', tone, 'opacity-60')}
              aria-hidden='true'
            />
          )
        })}

      {/* 4. Draft rect (during drag) */}
      {naturalSize && draftRect && mode === 'draw' && (
        <div
          style={{
            left: `${(draftRect.x / naturalSize.width) * 100}%`,
            top: `${(draftRect.y / naturalSize.height) * 100}%`,
            width: `${(draftRect.width / naturalSize.width) * 100}%`,
            height: `${(draftRect.height / naturalSize.height) * 100}%`
          }}
          className='pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10'
          aria-hidden='true'
        />
      )}

      {/* 5. Empty / loading */}
      {!imageKey && (
        <div className='absolute inset-0 flex items-center justify-center text-sm text-muted-foreground'>
          {t('studio.popup.noImage')}
        </div>
      )}
      {imageKey && !isImageReady && (
        <div className='absolute inset-0 animate-pulse bg-muted/60' aria-busy='true' />
      )}
    </div>
  )
}