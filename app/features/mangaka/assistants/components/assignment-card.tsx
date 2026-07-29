import { useTranslation } from 'react-i18next'
import { ChevronDown, ListChecks, Loader2, Plus, Sparkles, Star, XCircle } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { SignedImage } from '~/shared/components/signed-image'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { AssignmentListResDtoOutputItemsItemStatus } from '~/api/model/studio/assignmentListResDtoOutputItemsItemStatus'

export type AssignmentCardProps = {
  assignment: AssignmentListResDtoOutputItemsItem
  /** Detail-only assigned task types from GET /studio-assignments/:id. */
  taskTypes?: readonly string[]
  /** Detail-only termination reason from GET /studio-assignments/:id. */
  terminatedReason?: string | null
  /** Optional API-backed disclosure for list-omitted assignment details. */
  onDetailsClick?: () => void
  isDetailsOpen?: boolean
  isDetailsLoading?: boolean
  detailError?: string | null
  /** When provided, renders a "Assign task" CTA in the footer (only enabled
   *  while the assignment is ACTIVE — you can only assign work to a hired
   *  assistant whose hire window covers "now"). */
  onAssignClick?: (assignment: AssignmentListResDtoOutputItemsItem) => void
  onTerminateClick?: (assignment: AssignmentListResDtoOutputItemsItem) => void
  onReviewClick?: (assignment: AssignmentListResDtoOutputItemsItem) => void
  reviewed?: boolean
  reviewEligibilityKnown?: boolean
}

const STATUS_META: Record<AssignmentListResDtoOutputItemsItemStatus, { className: string }> = {
  ACTIVE: { className: 'bg-success/10 text-success border-success/20' },
  COMPLETED: { className: 'bg-info/10 text-info border-info/20' },
  TERMINATED: { className: 'bg-destructive/10 text-destructive border-destructive/20' }
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

const AVATAR_GRADIENTS = [
  'from-info to-info/70 text-info-foreground',
  'from-primary to-primary/70 text-primary-foreground',
  'from-warning to-warning/70 text-warning-foreground',
  'from-success to-success/70 text-success-foreground',
  'from-destructive to-destructive/70 text-destructive-foreground',
  'from-accent to-accent/70 text-accent-foreground'
] as const

function pickGradient(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]
}

function isKnownTaskType(value: string): boolean {
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
export function AssignmentCard({
  assignment,
  taskTypes: detailTaskTypes,
  terminatedReason,
  onDetailsClick,
  isDetailsOpen,
  isDetailsLoading,
  detailError,
  onAssignClick,
  onTerminateClick,
  onReviewClick,
  reviewed = false,
  reviewEligibilityKnown = true
}: AssignmentCardProps) {
  const { t, i18n } = useTranslation('mangaka')
  const locale = i18n.language

  // Per Spec 20 the BE embeds `assistant?: UserMini` directly on the assignment.
  const embeddedAssistant = assignment.assistant
  const statusMeta = STATUS_META[assignment.status] ?? STATUS_META.ACTIVE
  const displayName = embeddedAssistant?.displayName ?? t('myStudio.card.unnamedAssistant')
  const fallbackSeed = embeddedAssistant?.displayName ?? assignment.assistantId
  const hireFrom = formatDate(assignment.hireStart, locale)
  const hireTo = formatDate(assignment.hireEnd, locale)

  // List responses intentionally omit `assignedTaskTypes`; only an assignment
  // detail response includes it. Keep the card resilient to that compact API
  // shape instead of calling `.filter()` on an absent field after Orval regen.
  const taskTypes = detailTaskTypes?.filter(isKnownTaskType) ?? []

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start gap-3'>
        {embeddedAssistant?.avatar ? (
          <SignedImage
            r2Key={embeddedAssistant.avatar}
            alt={displayName}
            aspectClassName='aspect-square'
            className='h-12 w-12 shrink-0 rounded-full shadow-sm'
          />
        ) : (
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold shadow-sm',
              pickGradient(fallbackSeed)
            )}
            aria-hidden='true'
          >
            {getInitials(embeddedAssistant?.displayName, assignment.assistantId)}
          </div>
        )}
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
                className='inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success'
              >
                <Sparkles className='h-3 w-3' />
                {t('myStudio.card.activeNowBadge')}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className='grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2'>
        <div className='text-muted-foreground'>
          <span>
            {assignment.hireEnd
              ? t('myStudio.card.hireWindow', { from: hireFrom, to: hireTo })
              : hireFrom
                ? t('myStudio.card.hireWindowNoEnd', { from: hireFrom })
                : '—'}
          </span>
        </div>
        <div className='text-muted-foreground'>
          <span>{t('myStudio.card.series', { title: assignment.series?.title ?? t('myStudio.card.seriesNone') })}</span>
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

      {detailError && <p className='text-xs text-destructive'>{detailError}</p>}

      {assignment.status === 'TERMINATED' && (
        <div className='flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive'>
          <XCircle className='mt-0.5 h-3 w-3 shrink-0' />
          <span>
            {terminatedReason
              ? t('myStudio.card.terminatedReason', { reason: terminatedReason })
              : t('myStudio.card.noReason')}
          </span>
        </div>
      )}

      <footer className='mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground'>
        <div className='flex items-center gap-2'>
          <span>{t(`myStudio.card.${assignment.activeNow ? 'activeNowBadge' : 'endedBadge'}`)}</span>
          {onAssignClick && (
            <button
              type='button'
              onClick={() => onAssignClick(assignment)}
              disabled={!assignment.activeNow}
              aria-label={t('studio.tasks.composer.assignFor', {
                name: displayName
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
        <div className='flex items-center gap-1.5'>
          {onDetailsClick && (
            <button
              type='button'
              onClick={onDetailsClick}
              aria-expanded={isDetailsOpen}
              className='inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer'
            >
              {isDetailsLoading ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <ChevronDown className={cn('h-3 w-3 transition-transform', isDetailsOpen && 'rotate-180')} />
              )}
              {t(isDetailsOpen ? 'myStudio.details.hide' : 'myStudio.details.show')}
            </button>
          )}
          {assignment.status === 'ACTIVE' && onTerminateClick && (
            <button
              type='button'
              onClick={() => onTerminateClick(assignment)}
              className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 cursor-pointer'
            >
              <XCircle className='h-3 w-3' />
              {t('myStudio.lifecycle.terminate')}
            </button>
          )}
          {assignment.status !== 'ACTIVE' && reviewed && (
            <span className='inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2 py-1 text-[11px] font-semibold text-success'>
              <Star className='h-3 w-3' /> {t('myStudio.lifecycle.reviewed')}
            </span>
          )}
          {assignment.status !== 'ACTIVE' && onReviewClick && reviewEligibilityKnown && !reviewed && (
            <button
              type='button'
              onClick={() => onReviewClick(assignment)}
              className='inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 cursor-pointer'
            >
              <Star className='h-3 w-3' />
              {t('myStudio.lifecycle.review')}
            </button>
          )}
        </div>
      </footer>
    </article>
  )
}
