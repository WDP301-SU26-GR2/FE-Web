import type { LucideIcon } from 'lucide-react'

export interface DistributionItem {
  key: string
  label: string
  value: number
}

export interface DistributionPanelProps {
  title: string
  description: string
  icon: LucideIcon
  items: DistributionItem[]
  emptyLabel: string
}

export function DistributionPanel({ title, description, icon: Icon, items, emptyLabel }: DistributionPanelProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 0)

  return (
    <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
          <Icon className='size-5' aria-hidden='true' />
        </div>
        <div>
          <h2 className='font-bold text-foreground'>{title}</h2>
          <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{description}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className='mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
          {emptyLabel}
        </p>
      ) : (
        <div className='mt-6 space-y-4'>
          {items.map((item) => {
            const percentage = maxValue === 0 ? 0 : Math.max((item.value / maxValue) * 100, 3)
            return (
              <div key={item.key}>
                <div className='mb-1.5 flex items-center justify-between gap-4 text-xs'>
                  <span className='truncate font-semibold text-foreground'>{item.label}</span>
                  <span className='font-bold text-muted-foreground tabular-nums'>{item.value}</span>
                </div>
                <div className='h-2 overflow-hidden rounded-full bg-muted'>
                  <div
                    className='h-full rounded-full bg-primary transition-[width] duration-500'
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
