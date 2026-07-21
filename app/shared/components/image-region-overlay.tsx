import { useState, type ImgHTMLAttributes } from 'react'

export interface ImageRegion {
  coordinates?: { x?: number; y?: number; width?: number; height?: number } | null
}

export interface ImageRegionOverlayProps extends ImgHTMLAttributes<HTMLImageElement> {
  regions?: ImageRegion[] | null
  containerClassName?: string
}

/** Aligns a stored pixel-space region with the actual rendered image. */
export function ImageRegionOverlay({
  regions,
  containerClassName,
  className,
  onLoad,
  ...imageProps
}: ImageRegionOverlayProps) {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null)

  return (
    <div className={containerClassName}>
      <div className='relative inline-block max-h-full max-w-full leading-none'>
        <img
          {...imageProps}
          className={className}
          onLoad={(event) => {
            setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })
            onLoad?.(event)
          }}
        />
        {naturalSize &&
          regions?.map((region, index) => {
            const coordinates = region.coordinates
            if (!coordinates) return null
            return (
              <div
                key={index}
                aria-hidden='true'
                className='pointer-events-none absolute border-2 border-primary bg-primary/20 shadow-sm'
                style={{
                  left: `${((coordinates.x ?? 0) / naturalSize.width) * 100}%`,
                  top: `${((coordinates.y ?? 0) / naturalSize.height) * 100}%`,
                  width: `${((coordinates.width ?? 0) / naturalSize.width) * 100}%`,
                  height: `${((coordinates.height ?? 0) / naturalSize.height) * 100}%`
                }}
              />
            )
          })}
      </div>
    </div>
  )
}
