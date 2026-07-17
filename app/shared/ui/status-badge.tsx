import { cn } from '~/shared/lib/cn'

export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive' | 'primary'

const TONE_CLASSES: Record<StatusTone, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border'
  },
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    border: 'border-primary/20'
  },
  info: {
    bg: 'bg-info/10',
    text: 'text-info',
    border: 'border-info/20'
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20'
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20'
  },
  destructive: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    border: 'border-destructive/20'
  }
}

export interface StatusBadgeProps {
  tone: StatusTone
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  const { bg, text, border } = TONE_CLASSES[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        bg,
        text,
        border,
        className
      )}
    >
      {children}
    </span>
  )
}
