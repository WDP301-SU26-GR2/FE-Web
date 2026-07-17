import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X, Send } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { Button } from '~/shared/ui'
import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import type { CreateInviteBodyDto } from '~/api/model/studio/createInviteBodyDto'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { useMangakaSeries } from '~/features/mangaka/series/use-mangaka-series'

type TaskType = (typeof TASK_TYPES)[number]

const TASK_TYPES = ['BACKGROUND', 'SCREENTONE', 'EFFECT_LINES', 'INKING', 'COLORING', 'LETTERING'] as const

const HIREABLE_STATUSES: ReadonlySet<SeriesListResDtoOutputItemsItem['status']> = new Set([
  'IN_REVIEW',
  'READY_TO_PITCH',
  'PITCHED',
  'SERIALIZED',
  'HIATUS'
])

function toLocalDateInputValue(d: Date): string {
  // YYYY-MM-DDTHH:mm in local time
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function localInputToIso(local: string): string | null {
  if (!local) return null
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export type InviteAssistantDialogProps = {
  /** The assistant being invited. The dialog prefills `assistantId` from this. */
  assistant: AssistantDirectoryListResDtoOutputItemsItem | null
  isSubmitting: boolean
  open: boolean
  onCancel: () => void
  onConfirm: (body: CreateInviteBodyDto) => Promise<boolean>
}

/**
 * "Mời cộng tác" modal — sends `POST /collaboration-invites` per
 * FE-API-Guide-v2.md §10.1.
 *
 * Fields:
 * - assistantId (hidden, prefilled)
 * - seriesId (optional — dropdown of Mangaka's hireable series; omit = no
 *   series context, BE does not validate ownership per the schema note)
 * - hireStart, hireEnd (datetime-local inputs; sent as ISO datetime). Must
 *   satisfy `start < end` and `end > now` (422 `Error.InvalidHirePeriod`).
 * - taskTypes (multi-select chips, ≥1 required).
 *
 * Series dropdown excludes DRAFT/REJECTED/ABANDONED/WITHDRAWN/CANCELLED/COMPLETED
 * since inviting against them makes no sense. Pre-selected specializations
 * from the assistant's profile to reduce friction.
 */
export function InviteAssistantDialog({
  assistant,
  isSubmitting,
  open,
  onCancel,
  onConfirm
}: InviteAssistantDialogProps) {
  const { t } = useTranslation('mangaka')
  const cancelRef = useRef<HTMLButtonElement>(null)

  const { items: series, isLoading: isSeriesLoading } = useMangakaSeries()

  // Pre-fill seriesId with the first hireable series (sorted by createdAt desc).
  const hireableSeries = useMemo(
    () => series.filter((s) => HIREABLE_STATUSES.has(s.status)).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [series]
  )

  const [seriesId, setSeriesId] = useState<string>('')
  const [hireStart, setHireStart] = useState<string>('')
  const [hireEnd, setHireEnd] = useState<string>('')
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])

  // Reset form whenever the dialog opens with a new assistant. Defaults:
  // - hireStart = now
  // - hireEnd = now + 30 days
  // - taskTypes = assistant.specializations (filtered to known enum values)
  useEffect(() => {
    if (!open || !assistant) return
    const now = new Date()
    const oneMonthLater = new Date(now)
    oneMonthLater.setDate(oneMonthLater.getDate() + 30)
    void Promise.resolve().then(() => {
      setSeriesId(hireableSeries[0]?.id ?? '')
      setHireStart(toLocalDateInputValue(now))
      setHireEnd(toLocalDateInputValue(oneMonthLater))
      setTaskTypes(
        assistant.specializations.filter((s): s is TaskType => (TASK_TYPES as readonly string[]).includes(s))
      )
    })
  }, [open, assistant, hireableSeries])

  // Escape closes the dialog when not submitting.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel()
    }
    window.addEventListener('keydown', onKey)
    cancelRef.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, isSubmitting, onCancel])

  if (!open || !assistant) return null

  const toggleTaskType = (spec: TaskType) => {
    setTaskTypes((prev) => (prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]))
  }

  const validate = (): { ok: boolean; errorKey?: string } => {
    if (!assistant) return { ok: false }
    const start = hireStart ? new Date(hireStart) : null
    const end = hireEnd ? new Date(hireEnd) : null
    const now = new Date()
    if (!start || Number.isNaN(start.getTime()))
      return { ok: false, errorKey: 'assistantDirectory.invite.errorInvalidHire' }
    if (!end || Number.isNaN(end.getTime()))
      return { ok: false, errorKey: 'assistantDirectory.invite.errorInvalidHire' }
    if (start >= end) return { ok: false, errorKey: 'assistantDirectory.invite.errorHireOrder' }
    if (end <= now) return { ok: false, errorKey: 'assistantDirectory.invite.errorHirePast' }
    if (taskTypes.length === 0) return { ok: false, errorKey: 'assistantDirectory.invite.errorNoTaskType' }
    return { ok: true }
  }

  const handleConfirm = async () => {
    const v = validate()
    if (!v.ok) return
    const body: CreateInviteBodyDto = {
      assistantId: assistant.userId,
      seriesId: seriesId.trim().length > 0 ? seriesId : undefined,
      hireStart: localInputToIso(hireStart) as string,
      hireEnd: localInputToIso(hireEnd) as string,
      taskTypes
    }
    await onConfirm(body)
  }

  const validation = validate()
  const submitDisabled = isSubmitting || !validation.ok

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='invite-assistant-dialog-title'
      aria-describedby='invite-assistant-dialog-desc'
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'
      onClick={() => {
        if (!isSubmitting) onCancel()
      }}
    >
      <div
        className={cn('relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className='space-y-4 p-5'>
          <div className='flex items-start gap-3'>
            <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
              <Send className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1'>
              <h2 id='invite-assistant-dialog-title' className='text-base font-semibold text-foreground'>
                {t('assistantDirectory.invite.dialogTitle', { name: assistant.displayName ?? assistant.userId })}
              </h2>
              <p id='invite-assistant-dialog-desc' className='mt-1 text-sm text-muted-foreground'>
                {t('assistantDirectory.invite.dialogDescription')}
              </p>
            </div>
            <button
              type='button'
              aria-label={t('assistantDirectory.invite.close')}
              onClick={onCancel}
              disabled={isSubmitting}
              className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <div className='space-y-3 rounded-lg border border-border bg-background/40 p-4'>
            {/* Series */}
            <label className='block space-y-1.5'>
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                {t('assistantDirectory.invite.seriesLabel')}
              </span>
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                disabled={isSubmitting || isSeriesLoading}
                className='block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
              >
                <option value=''>{t('assistantDirectory.invite.seriesNone')}</option>
                {hireableSeries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <span className='text-[11px] text-muted-foreground'>{t('assistantDirectory.invite.seriesHint')}</span>
            </label>

            {/* Hire window */}
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
              <label className='block space-y-1.5'>
                <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                  {t('assistantDirectory.invite.hireStartLabel')}
                </span>
                <input
                  type='datetime-local'
                  value={hireStart}
                  onChange={(e) => setHireStart(e.target.value)}
                  disabled={isSubmitting}
                  className='block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                />
              </label>
              <label className='block space-y-1.5'>
                <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                  {t('assistantDirectory.invite.hireEndLabel')}
                </span>
                <input
                  type='datetime-local'
                  value={hireEnd}
                  onChange={(e) => setHireEnd(e.target.value)}
                  disabled={isSubmitting}
                  className='block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                />
              </label>
            </div>

            {/* Task types */}
            <div className='space-y-1.5'>
              <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                {t('assistantDirectory.invite.taskTypesLabel')}
              </span>
              <div className='flex flex-wrap gap-1.5'>
                {TASK_TYPES.map((spec) => {
                  const active = taskTypes.includes(spec)
                  return (
                    <button
                      key={spec}
                      type='button'
                      onClick={() => toggleTaskType(spec)}
                      disabled={isSubmitting}
                      aria-pressed={active}
                      className={cn(
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-card text-foreground hover:bg-muted'
                      )}
                    >
                      {t(`assistantDirectory.card.specialization.${spec}`)}
                    </button>
                  )
                })}
              </div>
              <span className='text-[11px] text-muted-foreground'>{t('assistantDirectory.invite.taskTypesHint')}</span>
            </div>

            {!validation.ok && validation.errorKey && (
              <p role='alert' className='text-xs font-medium text-destructive'>
                {t(validation.errorKey)}
              </p>
            )}
          </div>
        </div>

        <div className='flex items-center justify-end gap-2 border-t border-border bg-background/40 px-5 py-3'>
          <Button ref={cancelRef} type='button' variant='outline' size='sm' disabled={isSubmitting} onClick={onCancel}>
            {t('assistantDirectory.invite.cancel')}
          </Button>
          <Button type='button' variant='primary' size='sm' disabled={submitDisabled} onClick={handleConfirm}>
            {isSubmitting ? (
              <>
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                {t('assistantDirectory.invite.sending')}
              </>
            ) : (
              <>
                <Send className='h-3.5 w-3.5' />
                {t('assistantDirectory.invite.confirm')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
