import { CheckCircle2, CircleAlert, CircleMinus, Clock3, Radio } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

const DANGER_MARKERS = [
  'REJECT',
  'CANCEL',
  'FAIL',
  'BANNED',
  'BLOCKED',
  'EXPIRED',
  'OVERDUE',
  'CRITICAL',
  'TERMINATED',
  'ABANDONED',
  'WITHDRAWN',
  'DECLINED',
  'DISPUTED'
]

const SUCCESS_MARKERS = [
  'APPROVED',
  'ACCEPTED',
  'PAID',
  'PUBLISHED',
  'COMPLETED',
  'FULLY_EXECUTED',
  'RESOLVED',
  'REFLECTED',
  'SIGNED',
  'FINALIZED'
]

const WARNING_MARKERS = [
  'PENDING',
  'DRAFT',
  'UPCOMING',
  'IN_REVIEW',
  'UNDER_REVIEW',
  'SUBMITTED',
  'TRIGGERED',
  'ON_HOLD',
  'HIATUS',
  'REVISION',
  'WAITING'
]

const INFO_MARKERS = [
  'OPEN',
  'PRESENTING',
  'QA',
  'VOTING',
  'SERIALIZED',
  'READY',
  'IN_PROGRESS',
  'PROCESSING',
  'ASSIGNED'
]

const TONES = {
  success: {
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle2
  },
  warning: {
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    icon: Clock3
  },
  danger: {
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    icon: CircleAlert
  },
  info: {
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: Radio
  },
  neutral: {
    className: 'border-border bg-muted text-muted-foreground',
    icon: CircleMinus
  }
} as const

export type StatusTone = keyof typeof TONES

export function getStatusTone(value: string): StatusTone {
  const normalized = value.toUpperCase()
  if (['HIGH', 'SEVERE', 'RED'].includes(normalized)) return 'danger'
  if (['MEDIUM', 'YELLOW'].includes(normalized)) return 'warning'
  if (['LOW', 'NONE'].includes(normalized)) return normalized === 'LOW' ? 'success' : 'neutral'
  if (['INACTIVE', 'UNAVAILABLE', 'LOCKED', 'CONCLUDED'].includes(normalized)) return 'neutral'
  if (['ACTIVE', 'AVAILABLE'].includes(normalized)) return 'success'
  if (DANGER_MARKERS.some((marker) => normalized.includes(marker))) return 'danger'
  if (SUCCESS_MARKERS.some((marker) => normalized.includes(marker))) return 'success'
  if (WARNING_MARKERS.some((marker) => normalized.includes(marker))) return 'warning'
  if (INFO_MARKERS.some((marker) => normalized.includes(marker))) return 'info'
  return 'neutral'
}

export function SemanticStatusBadge({ value, label, className }: { value: string; label: string; className?: string }) {
  const tone = TONES[getStatusTone(value)]
  const Icon = tone.icon

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-extrabold leading-none',
        tone.className,
        className
      )}
    >
      <Icon className='size-3.5' aria-hidden='true' />
      {label}
    </span>
  )
}
