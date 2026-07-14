import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Filter,
  Hash,
  ListChecks,
  Mail,
  RefreshCw,
  Sparkles,
  XCircle
} from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { FilterChip, Pagination } from '~/shared/components/pagination'
import type { AssignmentListResDtoOutputItemsItem } from '~/api/model/studio'
import type { AssignmentListResDtoOutputItemsItemAssignedTaskTypesItem } from '~/api/model/studio/assignmentListResDtoOutputItemsItemAssignedTaskTypesItem'
import type { AssignmentListResDtoOutputItemsItemStatus } from '~/api/model/studio/assignmentListResDtoOutputItemsItemStatus'
import type { StudioControllerListAssignmentsStatus } from '~/api/model/studio/studioControllerListAssignmentsStatus'
import { useAssistantStudio } from './use-assistant-studio'

const STATUS_FILTERS: ReadonlyArray<StudioControllerListAssignmentsStatus> = ['ACTIVE', 'COMPLETED', 'TERMINATED']

export function AssistantStudioPage() {
  const { t } = useTranslation('assistant')
  const navigate = useNavigate()

  const { items, total, page, perPage, isLoading, error, status, setStatus, setPage, refresh } = useAssistantStudio()

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
            <h1 className='text-2xl font-bold tracking-tight'>{t('studio.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('studio.subtitle')}</p>
        </div>
        <a
          href='/dashboard/assistant'
          className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          {t('studio.back')}
        </a>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('studio.filters.status')}</span>
        </div>
        <FilterChip
          active={status === undefined}
          onClick={() => setStatus(undefined)}
          label={t('studio.filters.all')}
        />
        {STATUS_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={status === value}
            onClick={() => setStatus(status === value ? undefined : value)}
            label={t(`studio.filters.statuses.${value}`)}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('studio.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('studio.error.retry')}
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
          <EmptyState onBrowse={() => navigate('/dashboard/assistant')} />
        ) : (
          <>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {items.map((assignment) => (
                <AssistantAssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={total}
              tKeyPrefix='studio.pagination'
            />
          </>
        )}
      </div>
    </div>
  )
}

const STATUS_META: Record<AssignmentListResDtoOutputItemsItemStatus, { className: string }> = {
  ACTIVE: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  COMPLETED: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
  TERMINATED: { className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' }
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

function formatShortId(id: string): string {
  return id.slice(0, 8)
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
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
 * Card representing one StudioAssignment from the Assistant's POV — the
 * `mangakaId` is the other party (the hiring Mangaka). The full BE response
 * carries only the UUID, so we render a `Mangaka #xxxxxxxx` placeholder.
 * A future enhancement can fetch `GET /mangakas/{id}` per-card to hydrate the
 * real displayName/avatar.
 */
function AssistantAssignmentCard({ assignment }: { assignment: AssignmentListResDtoOutputItemsItem }) {
  const { t, i18n } = useTranslation('assistant')
  const locale = i18n.language

  const statusMeta = STATUS_META[assignment.status] ?? STATUS_META.ACTIVE
  const displayName = t('studio.card.mangakaFallback', { id: formatShortId(assignment.mangakaId) })
  const hireFrom = formatDate(assignment.hireStart, locale)
  const hireTo = formatDate(assignment.hireEnd, locale)
  const taskTypes = assignment.assignedTaskTypes.filter(isKnownTaskType)

  return (
    <article className='flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md'>
      <header className='flex items-start gap-3'>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-sm',
            pickGradient(assignment.mangakaId)
          )}
          aria-hidden='true'
        >
          {formatShortId(assignment.mangakaId).slice(0, 2).toUpperCase()}
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
              {t(`studio.filters.statuses.${assignment.status}`)}
            </span>
            {assignment.activeNow && (
              <span
                title={t('studio.card.activeNowBadge')}
                className='inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600'
              >
                <Sparkles className='h-3 w-3' />
                {t('studio.card.activeNowBadge')}
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
              ? t('studio.card.hireWindow', { from: hireFrom, to: hireTo })
              : hireFrom
                ? t('studio.card.hireWindowNoEnd', { from: hireFrom })
                : '—'}
          </span>
        </div>
        <div className='flex items-start gap-1.5 text-muted-foreground'>
          <Mail className='mt-0.5 h-3 w-3 shrink-0' />
          <span>{assignment.seriesId ?? t('studio.card.seriesNone')}</span>
        </div>
      </div>

      {taskTypes.length > 0 && (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            <ListChecks className='h-3 w-3' />
            <span>{t('studio.card.taskTypesTitle')}</span>
          </div>
          <div className='flex flex-wrap gap-1.5'>
            {taskTypes.map((tt) => (
              <span
                key={tt}
                className='inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
              >
                {t(`studio.taskType.${tt}`)}
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
              ? t('studio.card.terminatedReason', { reason: assignment.terminatedReason })
              : t('studio.card.noReason')}
          </span>
        </div>
      )}

      <footer className='mt-auto flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground'>
        <span>{t('studio.card.ended', { date: formatDate(assignment.createdAt, locale) || '—' })}</span>
        <span>{t(assignment.activeNow ? 'studio.card.activeNowBadge' : 'studio.card.endedBadge')}</span>
      </footer>
    </article>
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
      </div>
      <div className='mt-auto flex items-center justify-between border-t border-border pt-3'>
        <div className='h-2.5 w-24 animate-pulse rounded bg-muted' />
        <div className='h-3 w-16 animate-pulse rounded bg-muted' />
      </div>
    </div>
  )
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  const { t } = useTranslation('assistant')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Briefcase className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('studio.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('studio.empty.description')}</p>
      <button
        type='button'
        onClick={onBrowse}
        className='mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 cursor-pointer'
      >
        <span>{t('studio.back')}</span>
      </button>
    </div>
  )
}
