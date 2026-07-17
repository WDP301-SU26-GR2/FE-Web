import type { StatusTone } from '~/shared/ui/status-badge'

// TaskStatus → semantic tone
export const TASK_STATUS_TONE: Record<string, StatusTone> = {
  ASSIGNED: 'primary',
  IN_PROGRESS: 'info',
  SUBMITTED: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REVISION_REQUESTED: 'warning',
  ON_HOLD: 'neutral',
  CANCELLED: 'destructive'
}

export type TaskStatus = keyof typeof TASK_STATUS_TONE

export function getTaskStatusTone(status: string): StatusTone {
  return TASK_STATUS_TONE[status] ?? 'neutral'
}
