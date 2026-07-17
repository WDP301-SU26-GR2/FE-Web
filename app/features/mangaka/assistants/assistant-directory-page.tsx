import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Filter, Search, Users } from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/shared/lib/api/extract-api-error'
import type { AssistantDirectoryListResDtoOutputItemsItem } from '~/api/model/users'
import type { AssistantDirectoryListResDtoOutputItemsItemSpecializationsItem } from '~/api/model/users'
import { AssistantCard } from './components/assistant-card'
import { InviteAssistantDialog } from './components/invite-assistant-dialog'
import { useAssistantDirectory } from './use-assistant-directory'
import { useMyStudioAssignments } from '~/features/mangaka/studio/use-my-studio-assignments'
import { useCreateInvite } from '~/features/mangaka/invites/use-create-invite'

const SPECIALIZATION_FILTERS: ReadonlyArray<AssistantDirectoryListResDtoOutputItemsItemSpecializationsItem> = [
  'BACKGROUND',
  'SCREENTONE',
  'EFFECT_LINES',
  'INKING',
  'COLORING',
  'LETTERING'
]

/**
 * Assistant Directory page — Mangaka-facing assistant directory with the
 * "Invite to collaborate" CTA on each card.
 *
 * Composition (top → bottom):
 *  1. Header (title + subtitle)
 *  2. Filters row (specialization chips + level search input)
 *  3. Card grid (responsive: 1/2/3 columns)
 *  4. Pagination footer (1-based page numbers + showing-range)
 *  5. Empty / error states inline
 *
 * Side data: `useMyStudioAssignments` runs in parallel (already fetched on
 * the Studio page typically, but each hook owns its own state) to compute
 * the set of assistants with an ACTIVE relationship — those cards show an
 * "Active hire" badge instead of the invite CTA (BE rejects duplicates
 * with 409 `Error.DuplicateActiveCollaboration`).
 *
 * The "Invite assistant" modal collects `seriesId` (optional), `hireStart` /
 * `hireEnd`, and `taskTypes[]` then dispatches `useCreateInvite`. On success
 * the page re-pulls the active-assignments pool so the indicator updates.
 */
export function AssistantDirectoryPage() {
  const { t } = useTranslation('mangaka')

  const {
    items,
    total,
    page,
    perPage,
    isLoading,
    error,
    setPage,
    setSpecialization,
    setLevel,
    specialization,
    refresh
  } = useAssistantDirectory()
  const { items: enrichedAssignments, refresh: refreshAssignments } = useMyStudioAssignments()
  const { createInvite, isCreating } = useCreateInvite()

  const activeAssistantIds = new Set(enrichedAssignments.map((e) => e.assignment.assistantId))

  const [inviteTarget, setInviteTarget] = useState<AssistantDirectoryListResDtoOutputItemsItem | null>(null)
  const [searchInput, setSearchInput] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const handleSearchCommit = (value: string) => {
    setSearchInput(value)
    setLevel(value.trim().length > 0 ? value : undefined)
  }

  const handleInviteClick = (assistant: AssistantDirectoryListResDtoOutputItemsItem) => {
    setInviteTarget(assistant)
  }

  const handleInviteCancel = () => {
    setInviteTarget(null)
  }

  const handleInviteConfirm = useCallback(
    async (body: Parameters<typeof createInvite>[0]) => {
      const invite = await createInvite(body)
      if (invite) {
        setInviteTarget(null)
        // BE created a pending invite — the assignment indicator flips to
        // ACTIVE only after Assistant accepts. Pull anyway so we re-sync.
        refreshAssignments()
      }
      return invite !== null
    },
    [createInvite, refreshAssignments]
  )

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <div className='flex items-center gap-2'>
          <Users className='h-5 w-5 text-primary' />
          <h1 className='text-2xl font-bold tracking-tight'>{t('assistantDirectory.title')}</h1>
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>{t('assistantDirectory.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 flex-wrap items-center gap-2'>
          <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
            <Filter className='h-3.5 w-3.5' />
            <span>{t('assistantDirectory.filters.specialization')}</span>
          </div>
          <button
            type='button'
            onClick={() => setSpecialization(undefined)}
            aria-pressed={specialization === undefined}
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
              specialization === undefined
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
          >
            {t('assistantDirectory.filters.all')}
          </button>
          {SPECIALIZATION_FILTERS.map((spec) => (
            <button
              key={spec}
              type='button'
              onClick={() => setSpecialization(specialization === spec ? undefined : spec)}
              aria-pressed={specialization === spec}
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
                specialization === spec
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-card text-foreground hover:bg-muted'
              )}
            >
              {t(`assistantDirectory.card.specialization.${spec}`)}
            </button>
          ))}
        </div>
        <div className='relative sm:w-64'>
          <Search className='pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground' />
          <input
            type='text'
            value={searchInput}
            onChange={(e) => handleSearchCommit(e.target.value)}
            placeholder={t('assistantDirectory.filters.levelPlaceholder')}
            className='block w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring'
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('assistantDirectory.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            {t('assistantDirectory.error.retry')}
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
          <EmptyState
            onClearFilters={() => {
              setSpecialization(undefined)
              setLevel(undefined)
              setSearchInput('')
            }}
          />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {items.map((assistant) => (
                <AssistantCard
                  key={assistant.userId}
                  assistant={assistant}
                  hasActiveAssignment={activeAssistantIds.has(assistant.userId)}
                  onInvite={handleInviteClick}
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
                  aria-label={t('assistantDirectory.pagination.previousPage')}
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
                  aria-label={t('assistantDirectory.pagination.nextPage')}
                >
                  <ChevronRight className='h-4 w-4' />
                </button>
              </div>
              <span className='text-xs text-muted-foreground'>
                {t('assistantDirectory.pagination.showingRange', { from, to, total })}
              </span>
            </div>
          </>
        )}
      </div>

      <InviteAssistantDialog
        assistant={inviteTarget}
        isSubmitting={isCreating}
        open={inviteTarget !== null}
        onCancel={handleInviteCancel}
        onConfirm={handleInviteConfirm}
      />
    </div>
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
        <div className='h-7 w-24 animate-pulse rounded-md bg-muted' />
      </div>
    </div>
  )
}

function EmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Users className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('assistantDirectory.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('assistantDirectory.empty.description')}</p>
      <button
        type='button'
        onClick={onClearFilters}
        className='mt-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer'
      >
        {t('assistantDirectory.empty.clearFilters')}
      </button>
    </div>
  )
}
