import type { LucideIcon } from 'lucide-react'

import type { DistributionItem } from './distribution-panel'

const SEGMENT_COLORS = [
  'var(--color-primary)',
  'var(--color-foreground)',
  'var(--color-destructive)',
  'var(--color-muted-foreground)',
  'var(--color-secondary-foreground)'
]

export function DistributionDonut({
  title,
  description,
  centerLabel,
  icon: Icon,
  items,
  emptyLabel
}: {
  title: string
  description: string
  centerLabel: string
  icon: LucideIcon
  items: DistributionItem[]
  emptyLabel: string
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const visibleItems = items.filter((item) => item.value > 0)
  const segments = visibleItems.map((item, index) => {
    const consumed = visibleItems.slice(0, index).reduce((sum, previous) => sum + previous.value / total, 0)
    const fraction = item.value / total
    return {
      ...item,
      length: fraction * circumference,
      offset: -consumed * circumference
    }
  })

  return (
    <section className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
      <div className='flex items-start gap-3 border-b border-border p-5'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <Icon className='size-5' />
        </div>
        <div>
          <h2 className='font-bold text-foreground'>{title}</h2>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{description}</p>
        </div>
      </div>

      {total === 0 ? (
        <p className='m-5 rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground'>
          {emptyLabel}
        </p>
      ) : (
        <div className='grid items-center gap-6 p-5 sm:grid-cols-[11rem_1fr]'>
          <div className='relative mx-auto size-40'>
            <svg viewBox='0 0 100 100' className='size-full -rotate-90' role='img' aria-label={title}>
              <circle cx='50' cy='50' r={radius} fill='none' stroke='var(--color-muted)' strokeWidth='11' />
              {segments.map((item, index) => (
                <circle
                  key={item.key}
                  cx='50'
                  cy='50'
                  r={radius}
                  fill='none'
                  stroke={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
                  strokeWidth='11'
                  strokeDasharray={`${Math.max(item.length - 1.5, 0)} ${circumference}`}
                  strokeDashoffset={item.offset}
                  strokeLinecap='round'
                />
              ))}
            </svg>
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center'>
              <strong className='text-2xl font-black tabular-nums text-foreground'>{total}</strong>
              <span className='mt-0.5 max-w-20 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                {centerLabel}
              </span>
            </div>
          </div>

          <div className='space-y-3'>
            {items.map((item, index) => (
              <div key={item.key} className='flex items-center justify-between gap-3 text-xs'>
                <div className='flex min-w-0 items-center gap-2'>
                  <span
                    className='size-2.5 shrink-0 rounded-full'
                    style={{ backgroundColor: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
                  />
                  <span className='truncate font-semibold text-foreground'>{item.label}</span>
                </div>
                <span className='font-extrabold tabular-nums text-muted-foreground'>
                  {item.value} · {Math.round((item.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
