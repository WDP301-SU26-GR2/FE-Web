import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { SignedImage } from '~/shared/components/signed-image'

export type ImageStripItem = {
  /** Stable identifier used as React key. */
  id: string
  /** R2 object key to render via `<SignedImage>`. Falsy values render a neutral placeholder. */
  r2Key: string | null
  /** Accessible label, e.g. "Character design 2" or "Name page #3". */
  alt: string
}

export type ImageOverflowStripProps = {
  items: ImageStripItem[]
  /** Click handler — receives the visible index of the clicked slot. */
  onOpen: (index: number) => void
  /** Optional extra classes on the outer flex container. */
  className?: string
  /**
   * Hard cap on how many thumbnails the strip will render before swapping the
   * last visible slot for a "+N" chip. Defaults to 6 — character designs and
   * proposal name pages follow the rule "show 6 then chip"; consumers that want
   * a different limit can override.
   */
  maxVisible?: number
  /** Lower bound for one slot (px). Default 64. Slot will shrink below this only if forced. */
  minSlotWidth?: number
  /** Upper bound for one slot (px). Default 160. Slots won't grow past this. */
  maxSlotWidth?: number
  /** Horizontal gap between slots (px). Default 8 = `gap-2`. */
  gap?: number
}

const DEFAULT_MAX_VISIBLE = 6
const DEFAULT_MIN_SLOT = 64
const DEFAULT_MAX_SLOT = 160
const DEFAULT_GAP = 8

/**
 * Horizontal strip that fills its container width with as many thumbnails as
 * can fit while keeping each slot within `[minSlotWidth, maxSlotWidth]`.
 *
 * Hard cap: at most `maxVisible` (default 6) thumbnails are rendered. If the
 * source list is longer than `maxVisible`, the last visible slot is replaced
 * by a `+N` chip (where N = items.length - (maxVisible - 1)) that opens the
 * carousel starting at the first hidden image.
 *
 * - When `items.length <= maxVisible` and they all fit at `preferred` width,
 *   the row stretches edge-to-edge of its parent — no awkward shrunk-in-the-
 *   corner look inside a `grid-cols-3` card.
 * - When `items.length > maxVisible`, the chip occupies the last slot so the
 *   row stays full-width and the limit is visible at a glance.
 * - On viewport resize (or sidebar toggles, etc.) a `ResizeObserver` recomputes
 *   the slot width so the strip stays responsive.
 *
 * Accessibility: each thumbnail is a real `<button>` with an aria-label, the
 * chip is also focusable and exposes its remaining count.
 */
export function ImageOverflowStrip({
  items,
  onOpen,
  className,
  maxVisible = DEFAULT_MAX_VISIBLE,
  minSlotWidth = DEFAULT_MIN_SLOT,
  maxSlotWidth = DEFAULT_MAX_SLOT,
  gap = DEFAULT_GAP
}: ImageOverflowStripProps) {
  const { t } = useTranslation('mangaka')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // `useLayoutEffect` avoids a 1-frame flash where the strip might briefly
  // show all items before ResizeObserver fires. SSR-safe (skipped there).
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.clientWidth)
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.round(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute (a) how many slots fit at the preferred size, and (b) when the row
  // would overflow, we swap the LAST slot for a chip instead of clipping.
  // Two overflow reasons apply, in priority order:
  //   1) Hard cap `maxVisible` — items exceed the per-row slot budget → show
  //      maxVisible - 1 real tiles + a "+N" chip (N = remaining).
  //   2) Width cap — even `maxVisible` tiles wouldn't fit → fall back to as
  //      many as the container can hold, with a chip in the last slot.
  const { visibleCount, overflow } = useMemo(() => {
    const width = containerWidth
    if (width <= 0 || items.length === 0) {
      return { visibleCount: items.length, overflow: 0 }
    }

    // Compute the largest slot size that lets `items.length` slots fit.
    const idealForAll = (width - gap * (items.length - 1)) / items.length
    const preferred = Math.min(maxSlotWidth, Math.max(minSlotWidth, idealForAll))

    // 1) Hard cap: if items > maxVisible, the last visible slot is the chip.
    if (items.length > maxVisible) {
      const show = Math.max(1, maxVisible - 1)
      return { visibleCount: show, overflow: items.length - show }
    }

    // 2) Width cap: how many slots fit at `preferred` width?
    const fitsAtPreferred = Math.max(
      1,
      Math.floor((width + gap) / (preferred + gap))
    )

    if (items.length <= fitsAtPreferred) {
      // Everything fits — slots are `flex-1` so they stretch to fill the row;
      // the `preferred` value is only used as a sizing hint (clamped to max).
      return { visibleCount: items.length, overflow: 0 }
    }

    // Width overflow: show `fitsAtPreferred - 1` thumbnails and replace the
    // last visible slot with a chip. The chip occupies the same width as a
    // thumbnail so the row stays full-width.
    const show = Math.max(1, fitsAtPreferred - 1)
    const overflowCount = items.length - show
    return { visibleCount: show, overflow: overflowCount }
  }, [containerWidth, items.length, minSlotWidth, maxSlotWidth, gap, maxVisible])

  if (items.length === 0) return null

  const renderedItems = items.slice(0, visibleCount)

  return (
    <div
      ref={containerRef}
      className={cn('flex w-full items-stretch', className)}
      style={{ gap }}
      role='group'
      aria-label={t('lightbox.stripGroupLabel')}
    >
      {renderedItems.map((item, idx) => (
        <button
          key={item.id}
          type='button'
          onClick={() => onOpen(idx)}
          aria-label={item.alt}
          className='group relative block aspect-square flex-1 min-w-0 cursor-pointer overflow-hidden rounded-md border border-border bg-muted transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <SignedImage
            r2Key={item.r2Key}
            alt={item.alt}
            aspectClassName='aspect-square'
            className='h-full w-full'
          />
        </button>
      ))}

      {overflow > 0 && (
        <button
          type='button'
          onClick={() => onOpen(visibleCount)}
          aria-label={t('lightbox.moreCount', { count: overflow })}
          className='flex aspect-square flex-1 min-w-0 shrink cursor-pointer items-center justify-center rounded-md border border-border bg-card/80 text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <span className='flex items-center gap-1 text-xs font-semibold sm:text-sm'>
            <Plus className='h-4 w-4' aria-hidden='true' />
            <span className='tabular-nums'>{overflow}</span>
          </span>
        </button>
      )}
    </div>
  )
}