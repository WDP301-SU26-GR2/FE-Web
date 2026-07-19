import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '~/shared/lib/cn'

export interface AdminStatCardProps {
  icon: LucideIcon
  label: string
  value: string
  description: string
  tone?: 'primary' | 'secondary' | 'destructive' | 'muted'
  href?: string
}

const TONE_CLASSES = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground'
} as const

export function AdminStatCard({ icon: Icon, label, value, description, tone = 'primary', href }: AdminStatCardProps) {
  const content = (
    <article className='h-full rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md'>
      <div className='flex items-start justify-between gap-4'>
        <div className={cn('flex size-11 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
          <Icon className='size-5' aria-hidden='true' />
        </div>
        <span className='rounded-md border border-border bg-background/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
          KPI
        </span>
      </div>
      <p className='mt-5 text-3xl font-extrabold tracking-tight text-foreground tabular-nums'>{value}</p>
      <h2 className='mt-2 text-sm font-bold text-foreground'>{label}</h2>
      <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>{description}</p>
    </article>
  )
  return href ? <Link to={href}>{content}</Link> : content
}
