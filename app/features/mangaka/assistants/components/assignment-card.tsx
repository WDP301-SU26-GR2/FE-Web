import { useTranslation } from 'react-i18next'
import { Calendar, ListChecks, Plus, Sparkles, XCircle, Hash, Briefcase } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { AssignmentListResDtoOutputItemsItemStatus } from '~/api/model/studio/assignmentListResDtoOutputItemsItemStatus'
import type { AssignmentListResDtoOutputItemsItemAssignedTaskTypesItem } from '~/api/model/studio/assignmentListResDtoOutputItemsItemAssignedTaskTypesItem'

export type AssignmentCardProps = {
  assignment: AssignmentListResDtoOutputItemsItem
  /** When provided, renders a "Assign task" CTA in the footer (only enabled
   *  while the assignment is ACTIVE — you can only assign work to a hired
   *  assistant whose hire window covers "now"). */
  onAssignClick?: (assignment: AssignmentListResDtoOutputItemsItem) => void
}

const STATUS_META: Record<AssignmentListResDtoOutputItemsItemStatus, { className: string }> = {
  ACTIVE: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  COMPLETED: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  TERMINATED: { className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
}

function getInitials(name: string | null | undefined, fallback: string): string {
  const cleaned = (name ?? '').trim()
  if (!cleaned) return fallback.slice(0, 2).toUpperCase()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatShortId(id: string): string {
  return id.slice(0, 8)
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-purple-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-sky-600 to-cyan-700'
] as const

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function isKnownTaskType(value: string): value is AssignmentListResDtoOutputItemsItemAssignedTaskTypesItem {
  return (
    value === 'BACKGROUND' ||
    value === 'SCREENTONE' ||
    value === 'EFFECT_LINES' ||
    value === 'INKING' ||
    value === 'COLORING' ||
    value === 'LETTERING'
  )
}

/**
 * Card representing a single StudioAssignment (one hire relationship).
 *
 * Source data: `AssignmentResDto_Output` (per FE-API-Guide-v2.md §10.2).
 * - assistantName comes from the parallel pool fetch in `useMyStudioAssignments`.
 * - When the pool is missing the assistant, fall back to a "Trợ lý #xxxxxxxx"
 *   placeholder so the card still renders.
 */
export function AssignmentCard({ assignment, onAssignClick }: AssignmentCardProps) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language

  // Per Spec 20 the BE embeds `assistant?: UserMini` directly on the assignment.
  const embeddedAssistant = assignment.assistant
  const statusMeta = STATUS_META[assignment.status] ?? STATUS_META.ACTIVE
  const displayName =
    embeddedAssistant?.displayName ?? t('myStudio.card.unnamedAssistant', { id: formatShortId(assignment.assistantId) })
  const fallbackSeed = embeddedAssistant?.displayName ?? assignment.assistantId
  const hireFrom = formatDate(assignment.hireStart, locale)
  const hireTo = formatDate(assignment.hireEnd, locale)

  const taskTypes = assignment.assignedTaskTypes.filter(isKnownTaskType)

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start gap-3'>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-sm',
            pickGradient(fallbackSeed)
          )}
          aria-hidden='true'
        >
          {getInitials(embeddedAssistant?.displayName, assignment.assistantId)}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-1.5'>
            <h3 className='truncate text-sm font-bold text-foreground'>{displayName}</h3>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                statusMeta.className
              )}
            >
              {t(`myStudio.status.${assignment.status}`)}
            </span>
            {assignment.activeNow && (
              <span
                title={t('myStudio.card.activeNowBadge')}
                className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600'
              >
                <Sparkles className='h-3 w-3' />
                {t('myStudio.card.activeNowBadge')}
              </span>
            )}
          </div>
          <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
            <Hash className='inline h-3 w-3 align-text-bottom' /> {assignment.id}
          </p>
        </div>
      </header>

      <div className='grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2'>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Calendar className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            {assignment.hireEnd
              ? t('myStudio.card.hireWindow', { from: hireFrom, to: hireTo })
              : hireFrom
                ? t('myStudio.card.hireWindowNoEnd', { from: hireFrom })
                : '—'}
          </span>
        </div>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Briefcase className='mt-0.5 h-3 w-3 shrink-0' />
          <span>{assignment.seriesId ?? t('myStudio.card.seriesNone')}</span>
        </div>
      </div>

      {taskTypes.length > 0 && (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            <ListChecks className='h-3 w-3' />
            <span>{t('myStudio.card.taskTypesTitle')}</span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {taskTypes.map((tt) => (
              <span
                key={tt}
                className='inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
              >
                {t(`myStudio.taskType.${tt}`)}
              </span>
            ))}
          </div>
        </div>
      )}

      {assignment.status === 'TERMINATED' && (
        <div className='flex items-start gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-[11px] text-rose-600'>
          <XCircle className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            {assignment.terminatedReason
              ? t('myStudio.card.terminatedReason', { reason: assignment.terminatedReason })
              : t('myStudio.card.noReason')}
          </span>
        </div>
      )}

      <footer className='mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground'>
        <span>{t('myStudio.card.ended', { date: formatDate(assignment.createdAt, locale) || '—' })}</span>
        <div className='flex items-center gap-2'>
          <span>{t(`myStudio.card.${assignment.activeNow ? 'activeNowBadge' : 'endedBadge'}`)}</span>
          {onAssignClick && (
            <button
              type='button'
              onClick={() => onAssignClick(assignment)}
              disabled={!assignment.activeNow}
              aria-label={t('studio.tasks.composer.assignFor', {
                name: embeddedAssistant?.displayName ?? formatShortId(assignment.assistantId)
              })}
              title={
                assignment.activeNow
                  ? t('studio.tasks.composer.assignCta')
                  : t('studio.tasks.composer.assignDisabledReason')
              }
              className='inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              <Plus className='h-3 w-3' />
              <span>{t('studio.tasks.composer.assignCta')}</span>
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}
