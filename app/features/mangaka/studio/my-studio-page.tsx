import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight, Filter, Users, Briefcase, Plus, Workflow } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import { StudioAssignmentCard } from '~/features/mangaka/studio/components/studio-assignment-card'
import { AssignTaskDialog } from '~/features/mangaka/assistants/components/assign-task-dialog'
import { StudioTasksTab } from '~/features/mangaka/studio/components/studio-tasks-tab'
import { useMyStudioAssignments } from './use-my-studio-assignments'
import { useState } from 'react'
import { toast } from 'sonner'
import type { UseTaskComposerDataOptions } from '~/features/mangaka/assistants/use-task-composer-data'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import { Dialog } from '~/shared/ui/dialog'
import { useAssignmentLifecycle } from './use-assignment-lifecycle'
import { useReviewedAssistantIds } from './use-reviewed-assistant-ids'
import { useAuth } from '~/features/auth/context/auth-context'

const STATUS_FILTERS: ReadonlyArray<StudioControllerListAssignmentsStatus> = ['ACTIVE', 'COMPLETED', 'TERMINATED']

/**
 * Studio page — Mangaka-facing list of studio assignments (their hires).
 *
 * Composition (top → bottom):
 *  1. Header (title + subtitle + CTA "Open assistant directory")
 *  2. Status filter chips (All / ACTIVE / COMPLETED / TERMINATED)
 *  3. Card grid (responsive: 1/2/3 columns)
 *  4. Pagination footer (1-based page numbers + showing-range)
 *  5. Empty / error states inline
 *
 * Each card is hydrated with the assistant profile from a parallel
 * `GET /assistants` pool (handled inside `useMyStudioAssignments`) so we
 * can show displayName/avatar/specializations without n+1 round trips.
 */
export function MyStudioPage() {
  const { t } = useTranslation('mangaka')
  const navigate = useNavigate()

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskPreset, setTaskPreset] = useState<UseTaskComposerDataOptions>({})
  const [taskContextLocks, setTaskContextLocks] = useState<{ assistant?: boolean; series?: boolean }>({})
  const [lifecycleAction, setLifecycleAction] = useState<{
    assignment: AssignmentListResDtoOutputItemsItem
    type: 'terminate' | 'review'
  } | null>(null)
  const [lifecycleNote, setLifecycleNote] = useState('')
  const [rating, setRating] = useState(5)
  const lifecycle = useAssignmentLifecycle()
  const { session } = useAuth()

  const openTaskComposer = (
    preset: UseTaskComposerDataOptions,
    contextLocks: { assistant?: boolean; series?: boolean }
  ) => {
    setTaskPreset(preset)
    setTaskContextLocks(contextLocks)
    setTaskDialogOpen(true)
  }

  const { items, total, page, perPage, isLoading, error, status, setStatus, setPage, refresh } =
    useMyStudioAssignments()
  const endedAssistantIds = items
    .filter(({ assignment }) => assignment.status !== 'ACTIVE')
    .map(({ assignment }) => assignment.assistantId)
  const reviews = useReviewedAssistantIds(endedAssistantIds, session?.user?.id)

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Briefcase className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('myStudio.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('myStudio.subtitle')}</p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={() => navigate('/dashboard/mangaka/studio/overview')}
            className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted cursor-pointer'
          >
            <Workflow className='h-3.5 w-3.5' />
            <span>{t('studio.overview.open')}</span>
          </button>
          <button
            type='button'
            onClick={() => {
              // Same assignment flow as the card CTA, without a fixed hire
              // context so Mangaka can choose both assistant and series.
              openTaskComposer({}, {})
            }}
            className='flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer'
          >
            <Plus className='h-3.5 w-3.5' />
            <span>{t('studio.tasks.composer.title')}</span>
          </button>
          <button
            type='button'
            onClick={() => navigate('/dashboard/mangaka/assistants')}
            className='flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted cursor-pointer'
          >
            <Users className='h-3.5 w-3.5' />
            <span>{t('myStudio.empty.goToDirectory')}</span>
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('myStudio.filters.status')}</span>
        </div>
        <button
          type='button'
          onClick={() => setStatus(undefined)}
          aria-pressed={status === undefined}
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            status === undefined
              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
        >
          {t('myStudio.filters.all')}
        </button>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value}
            type='button'
            onClick={() => setStatus(status === value ? undefined : value)}
            aria-pressed={status === value}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
              status === value
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {t(`myStudio.status.${value}`)}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('myStudio.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            {t('myStudio.error.retry')}
          </button>
        </div>
      )}

      {/* Card grid */}
      <div className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {Array.from({ length: perPage }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState onBrowse={() => navigate('/dashboard/mangaka/assistants')} />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {items.map(({ assignment }) => (
                <StudioAssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  reviewed={reviews.reviewedAssistantIds.has(assignment.assistantId)}
                  reviewEligibilityKnown={!reviews.isLoading && reviews.isReliable}
                  onAssignClick={(a) => {
                    // The same composer is used by the header CTA. This entry
                    // point only fixes the hire context that the card represents.
                    openTaskComposer(
                      {
                        presetAssignmentId: a.id,
                        ...(a.seriesId ? { presetSeriesId: a.seriesId } : {})
                      },
                      { assistant: true, series: Boolean(a.seriesId) }
                    )
                  }}
                  onTerminateClick={(assignment) => {
                    setLifecycleNote('')
                    setLifecycleAction({ assignment, type: 'terminate' })
                  }}
                  onReviewClick={(assignment) => {
                    setLifecycleNote('')
                    setRating(5)
                    setLifecycleAction({ assignment, type: 'review' })
                  }}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className='mt-5 flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('myStudio.pagination.previousPage')}
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type='button'
                    onClick={() => setPage(num)}
                    disabled={isLoading}
                    className={cn(
                      'flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-sm font-medium transition-colors cursor-pointer',
                      page === num
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type='button'
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || isLoading}
                  className='flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer'
                  aria-label={t('myStudio.pagination.nextPage')}
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
              <span className='text-xs text-muted-foreground'>
                {t('myStudio.pagination.showingRange', { from, to, total })}
              </span>
            </div>
          </>
        )}
      </div>

      <section className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-bold uppercase tracking-wider text-foreground'>{t('studio.tasks.title')}</h2>
        </div>
        <StudioTasksTab />
      </section>

      {/* Task Assignment Dialog */}
      <AssignTaskDialog
        open={taskDialogOpen}
        openFrom='studio'
        preset={taskPreset}
        contextLocks={taskContextLocks}
        onClose={() => {
          setTaskDialogOpen(false)
          setTaskPreset({})
          setTaskContextLocks({})
        }}
        onSuccess={() => {
          refresh()
          toast.success(t('tasks.toast.created'))
        }}
      />
      <StudioLifecycleDialog
        action={lifecycleAction}
        note={lifecycleNote}
        rating={rating}
        isSubmitting={lifecycle.isMutating}
        onClose={() => setLifecycleAction(null)}
        onNoteChange={setLifecycleNote}
        onRatingChange={setRating}
        onSubmit={() => {
          if (!lifecycleAction) return
          if (lifecycleAction.type === 'terminate' && !lifecycleNote.trim()) {
            toast.error(t('myStudio.lifecycle.reasonRequired'))
            return
          }
          const action = lifecycleAction
          const request =
            action.type === 'terminate'
              ? lifecycle.terminate(action.assignment.id, lifecycleNote.trim())
              : lifecycle.review({
                  assignmentId: action.assignment.id,
                  assistantId: action.assignment.assistantId,
                  seriesId: action.assignment.seriesId,
                  rating,
                  comment: lifecycleNote
                })
          void request.then((result) => {
            if (result.success) {
              if (action.type === 'review') reviews.markReviewed(action.assignment.assistantId)
              toast.success(
                t(
                  action.type === 'terminate'
                    ? 'myStudio.lifecycle.terminateSuccess'
                    : 'myStudio.lifecycle.reviewSuccess'
                )
              )
              setLifecycleAction(null)
              refresh()
            } else {
              toast.error(
                result.error ??
                  t(
                    action.type === 'terminate'
                      ? 'myStudio.lifecycle.terminateFailed'
                      : 'myStudio.lifecycle.reviewFailed'
                  )
              )
            }
          })
        }}
      />
    </div>
  )
}

interface StudioLifecycleDialogProps {
  action: { assignment: AssignmentListResDtoOutputItemsItem; type: 'terminate' | 'review' } | null
  note: string
  rating: number
  isSubmitting: boolean
  onClose: () => void
  onNoteChange: (value: string) => void
  onRatingChange: (value: number) => void
  onSubmit: () => void
}

function StudioLifecycleDialog({
  action,
  note,
  rating,
  isSubmitting,
  onClose,
  onNoteChange,
  onRatingChange,
  onSubmit
}: StudioLifecycleDialogProps) {
  const { t } = useTranslation('mangaka')
  const isTerminate = action?.type === 'terminate'
  return (
    <Dialog
      open={action !== null}
      onClose={onClose}
      titleId='studio-lifecycle-title'
      title={t(isTerminate ? 'myStudio.lifecycle.terminateTitle' : 'myStudio.lifecycle.reviewTitle')}
      description={t(isTerminate ? 'myStudio.lifecycle.terminateDescription' : 'myStudio.lifecycle.reviewDescription')}
      footer={
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            className='rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer'
          >
            {t('myStudio.lifecycle.cancel')}
          </button>
          <button
            type='button'
            onClick={onSubmit}
            disabled={isSubmitting}
            className='rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer'
          >
            {t(isTerminate ? 'myStudio.lifecycle.confirmTerminate' : 'myStudio.lifecycle.confirmReview')}
          </button>
        </div>
      }
    >
      {action && (
        <div className='space-y-4'>
          <p className='text-sm text-muted-foreground'>
            {t('myStudio.lifecycle.forAssistant', {
              name: action.assignment.assistant?.displayName ?? t('myStudio.card.unnamedAssistant')
            })}
          </p>
          {!isTerminate && (
            <label className='block text-sm font-medium text-foreground'>
              {t('myStudio.lifecycle.rating')}
              <select
                value={rating}
                onChange={(event) => onRatingChange(Number(event.target.value))}
                className='mt-1.5 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground'
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {t('myStudio.lifecycle.stars', { count: value })}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className='block text-sm font-medium text-foreground'>
            {t(isTerminate ? 'myStudio.lifecycle.reason' : 'myStudio.lifecycle.comment')}
            <textarea
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              maxLength={isTerminate ? 500 : 1000}
              className='mt-1.5 min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
            />
          </label>
        </div>
      )}
    </Dialog>
  )
}

function CardSkeleton() {
  return (
    <div className='flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='h-12 w-12 animate-pulse rounded-full bg-muted' />
        <div className='flex-1 space-y-2'>
          <div className='h-3 w-2/3 animate-pulse rounded bg-muted' />
          <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
        </div>
      </div>
      <div className='flex gap-2'>
        <div className='h-5 w-16 animate-pulse rounded-full bg-muted' />
        <div className='h-5 w-20 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='flex gap-1.5'>
        <div className='h-4 w-16 animate-pulse rounded-full bg-muted' />
        <div className='h-4 w-12 animate-pulse rounded-full bg-muted' />
        <div className='h-4 w-20 animate-pulse rounded-full bg-muted' />
      </div>
      <div className='mt-auto flex items-center justify-between border-t border-border pt-3'>
        <div className='h-2.5 w-24 animate-pulse rounded bg-muted' />
        <div className='h-3 w-16 animate-pulse rounded bg-muted' />
      </div>
    </div>
  )
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Briefcase className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('myStudio.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('myStudio.empty.description')}</p>
      <button
        type='button'
        onClick={onBrowse}
        className='mt-2 flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
      >
        <Users className='h-4 w-4' />
        <span>{t('myStudio.empty.goToDirectory')}</span>
      </button>
    </div>
  )
}
