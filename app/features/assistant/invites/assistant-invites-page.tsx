import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Calendar,
  Check,
  Filter,
  Hash,
  ListChecks,
  Mail,
  RefreshCw,
  X
} from 'lucide-react'

import { cn } from '~/shared/lib/cn'
import { extractApiErrorMessage } from '~/features/auth/lib/extract-api-error'
import { FilterChip, Pagination } from '~/shared/components/pagination'
import type { InviteListResDtoOutputItemsItem } from '~/api/model/studio'
import type { InviteListResDtoOutputItemsItemStatus } from '~/api/model/studio/inviteListResDtoOutputItemsItemStatus'
import type { InviteListResDtoOutputItemsItemTaskTypesItem } from '~/api/model/studio/inviteListResDtoOutputItemsItemTaskTypesItem'
import type { StudioControllerListInvitesStatus } from '~/api/model/studio/studioControllerListInvitesStatus'
import { useAssistantInvites } from './use-assistant-invites'

const STATUS_FILTERS: ReadonlyArray<StudioControllerListInvitesStatus> = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'CANCELLED'
]

export function AssistantInvitesPage() {
  const { t } = useTranslation('assistant')

  const {
    items,
    total,
    page,
    perPage,
    isLoading,
    error,
    status,
    setStatus,
    setPage,
    refresh,
    acceptInvite,
    declineInvite,
    isMutating
  } = useAssistantInvites()

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Mail className='h-5 w-5 text-primary' />
            <h1 className='text-2xl font-bold tracking-tight'>{t('invites.title')}</h1>
          </div>
          <p className='mt-1 text-sm text-muted-foreground'>{t('invites.subtitle')}</p>
        </div>
        <a
          href='/dashboard/assistant'
          className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted'
        >
          <ArrowLeft className='h-3.5 w-3.5' />
          {t('invites.back')}
        </a>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground'>
          <Filter className='h-3.5 w-3.5' />
          <span>{t('invites.filters.status')}</span>
        </div>
        <FilterChip
          active={status === undefined}
          onClick={() => setStatus(undefined)}
          label={t('invites.filters.all')}
        />
        {STATUS_FILTERS.map((value) => (
          <FilterChip
            key={value}
            active={status === value}
            onClick={() => setStatus(status === value ? undefined : value)}
            label={t(`invites.filters.statuses.${value}`)}
          />
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive'
        >
          <span>{extractApiErrorMessage({ message: error }, t('invites.error.loadFailed'))}</span>
          <button
            type='button'
            onClick={refresh}
            className='inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-bold hover:bg-destructive/10 cursor-pointer'
          >
            <RefreshCw className='h-3 w-3' />
            {t('invites.error.retry')}
          </button>
        </div>
      )}

      {/* Card list */}
      <div className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'>
        {isLoading ? (
          <div className='space-y-3'>
            {Array.from({ length: perPage }).map((_, i) => (
              <InviteSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className='space-y-3'>
              {items.map((invite) => (
                <InviteCard
                  key={invite.id}
                  invite={invite}
                  onAccept={(id) => void acceptInvite(id)}
                  onDecline={(id) => void declineInvite(id)}
                  isMutating={isMutating}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              from={from}
              to={to}
              total={total}
              tKeyPrefix='invites.pagination'
            />
          </>
        )}
      </div>
    </div>
  )
}

const STATUS_META: Record<InviteListResDtoOutputItemsItemStatus, { className: string }> = {
  PENDING: { className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  ACCEPTED: { className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  DECLINED: { className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  EXPIRED: { className: 'bg-muted text-muted-foreground border-border' },
  CANCELLED: { className: 'bg-muted text-muted-foreground border-border' }
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

function isKnownTaskType(value: string): value is InviteListResDtoOutputItemsItemTaskTypesItem {
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
 * Compact list-style row representing one collaboration invite received by
 * the current Assistant. The Mangaka on the other side is identified only by
 * `mangakaId`, so we render a `Mangaka #hash` placeholder (see also
 * `AssistantAssignmentCard`).
 */
function InviteCard({
  invite,
  onAccept,
  onDecline,
  isMutating
}: {
  invite: InviteListResDtoOutputItemsItem
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  isMutating: boolean
}) {
  const { t, i18n } = useTranslation('assistant')
  const locale = i18n.language

  const statusMeta = STATUS_META[invite.status] ?? STATUS_META.PENDING
  const displayName = t('invites.card.mangakaFallback', { id: formatShortId(invite.mangakaId) })
  const hireFrom = formatDate(invite.hireStart, locale)
  const hireTo = formatDate(invite.hireEnd, locale)
  const taskTypes = invite.taskTypes.filter(isKnownTaskType)
  const isPending = invite.status === 'PENDING'

  return (
    <article className='flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md sm:flex-row sm:items-center'>
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-extrabold text-white shadow-sm',
          pickGradient(invite.mangakaId)
        )}
        aria-hidden='true'
      >
        {formatShortId(invite.mangakaId).slice(0, 2).toUpperCase()}
      </div>
      <div className='min-w-0 flex-1 space-y-2'>
        <div className='flex flex-wrap items-center gap-1.5'>
          <h3 className='truncate text-sm font-bold text-foreground'>{displayName}</h3>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              statusMeta.className
            )}
          >
            {t(`invites.filters.statuses.${invite.status}`)}
          </span>
          <span className='inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
            <Hash className='h-3 w-3' />
            {invite.id.slice(0, 8)}
          </span>
        </div>

        <div className='grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2'>
          <div className='flex items-start gap-1.5'>
            <Calendar className='mt-0.5 h-3 w-3 shrink-0' />
            <span>
              {invite.hireEnd
                ? t('invites.card.hireWindow', { from: hireFrom, to: hireTo })
                : hireFrom
                  ? t('invites.card.hireWindowNoEnd', { from: hireFrom })
                  : '—'}
            </span>
          </div>
          <div className='flex items-start gap-1.5'>
            <Mail className='mt-0.5 h-3 w-3 shrink-0' />
            <span>{invite.seriesId ?? t('invites.card.seriesNone')}</span>
          </div>
        </div>

        {taskTypes.length > 0 && (
          <div className='flex flex-wrap items-center gap-1.5'>
            <span className='inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
              <ListChecks className='h-3 w-3' />
              {t('invites.card.taskTypesTitle')}:
            </span>
            {taskTypes.map((tt) => (
              <span
                key={tt}
                className='inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground'
              >
                {t(`invites.taskType.${tt}`)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className='flex shrink-0 items-center gap-2 sm:flex-col sm:items-end'>
        <span className='text-[10px] font-medium text-muted-foreground'>
          {t('invites.card.receivedAt', { date: formatDate(invite.createdAt, locale) || '—' })}
        </span>
        {isPending && (
          <div className='flex gap-2'>
            <button
              type='button'
              disabled={isMutating}
              onClick={() => onAccept(invite.id)}
              className='inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              <Check className='h-3.5 w-3.5' />
              {t('invites.actions.accept')}
            </button>
            <button
              type='button'
              disabled={isMutating}
              onClick={() => onDecline(invite.id)}
              className='inline-flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              <X className='h-3.5 w-3.5' />
              {t('invites.actions.decline')}
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

function InviteSkeleton() {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm'>
      <div className='h-12 w-12 animate-pulse rounded-full bg-muted' />
      <div className='flex-1 space-y-2'>
        <div className='flex gap-2'>
          <div className='h-3 w-1/3 animate-pulse rounded bg-muted' />
          <div className='h-3 w-12 animate-pulse rounded-full bg-muted' />
        </div>
        <div className='h-2.5 w-1/2 animate-pulse rounded bg-muted' />
        <div className='flex gap-1.5'>
          <div className='h-3 w-12 animate-pulse rounded-full bg-muted' />
          <div className='h-3 w-16 animate-pulse rounded-full bg-muted' />
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <div className='h-7 w-20 animate-pulse rounded-md bg-muted' />
        <div className='h-7 w-20 animate-pulse rounded-md bg-muted' />
      </div>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation('assistant')
  return (
    <div className='flex flex-col items-center gap-3 py-12 text-center'>
      <Mail className='h-8 w-8 text-muted-foreground/40' />
      <p className='text-sm font-semibold text-foreground'>{t('invites.empty.title')}</p>
      <p className='max-w-sm text-xs text-muted-foreground'>{t('invites.empty.description')}</p>
    </div>
  )
}
