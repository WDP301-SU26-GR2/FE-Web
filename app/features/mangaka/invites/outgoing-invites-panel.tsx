import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronDown, Loader2, Mail, RefreshCw, X } from 'lucide-react'

import type { InviteListResDtoOutputItemsItem } from '~/api/model/studio'
import { cn } from '~/shared/lib/cn'
import { Dialog } from '~/shared/ui/dialog'
import { Pagination } from '~/shared/components/pagination'
import { OutgoingInviteDetail } from './outgoing-invite-detail'
import { useMangakaOutgoingInvites } from './use-mangaka-outgoing-invites'

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_CLASS: Record<InviteListResDtoOutputItemsItem['status'], string> = {
  PENDING: 'border-primary/40 bg-primary/10 text-primary',
  ACCEPTED: 'border-border bg-muted text-foreground',
  DECLINED: 'border-border bg-muted text-muted-foreground',
  EXPIRED: 'border-border bg-muted text-muted-foreground',
  CANCELLED: 'border-border bg-muted text-muted-foreground'
}

/**
 * Compact outbound-invite control surface on the Mangaka assistant directory.
 * The primary operating queue is PENDING invites, while the All filter and
 * pagination keep every outbound invite reachable for review or cancellation.
 */
export function OutgoingInvitesPanel({ reloadToken }: { reloadToken: number }) {
  const { t, i18n } = useTranslation('mangaka')
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
    cancelInvite,
    isCancelling
  } = useMangakaOutgoingInvites()
  const [confirmationTarget, setConfirmationTarget] = useState<InviteListResDtoOutputItemsItem | null>(null)
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null)

  // The directory owns creation. Pull its newly-created PENDING invite into
  // this panel without coupling the create hook to the list hook.
  const lastReloadToken = useRef(reloadToken)
  useEffect(() => {
    if (lastReloadToken.current === reloadToken) return
    lastReloadToken.current = reloadToken
    refresh()
  }, [refresh, reloadToken])

  const handleConfirmCancel = () => {
    if (!confirmationTarget) return
    void cancelInvite(confirmationTarget).then((didCancel) => {
      if (didCancel) {
        setConfirmationTarget(null)
        setExpandedInviteId((current) => (current === confirmationTarget.id ? null : current))
      }
    })
  }

  return (
    <section
      className='rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5'
      aria-labelledby='outgoing-invites-title'
    >
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <Mail className='h-4 w-4 text-primary' />
            <h2 id='outgoing-invites-title' className='text-base font-bold tracking-tight text-foreground'>
              {t('outgoingInvites.title')}
            </h2>
          </div>
          <p className='mt-1 text-xs text-muted-foreground'>{t('outgoingInvites.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={refresh}
          disabled={isLoading}
          className='inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          {t('outgoingInvites.actions.refresh')}
        </button>
      </div>

      <div className='mt-4 flex gap-2'>
        <button
          type='button'
          onClick={() => setStatus('PENDING')}
          aria-pressed={status === 'PENDING'}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            status === 'PENDING'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground hover:bg-muted'
          )}
        >
          {t('outgoingInvites.filters.pending')}
        </button>
        <button
          type='button'
          onClick={() => setStatus(undefined)}
          aria-pressed={status === undefined}
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
            status === undefined
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-foreground hover:bg-muted'
          )}
        >
          {t('outgoingInvites.filters.all')}
        </button>
      </div>

      {error ? (
        <div
          role='alert'
          className='mt-4 flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'
        >
          <span>{error}</span>
          <button type='button' onClick={refresh} className='font-bold underline cursor-pointer'>
            {t('outgoingInvites.actions.retry')}
          </button>
        </div>
      ) : isLoading ? (
        <div className='mt-4 flex items-center gap-2 py-5 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          {t('outgoingInvites.loading')}
        </div>
      ) : items.length === 0 ? (
        <div className='mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center'>
          <p className='text-sm font-semibold text-foreground'>{t('outgoingInvites.empty.title')}</p>
          <p className='mt-1 text-xs text-muted-foreground'>{t('outgoingInvites.empty.description')}</p>
        </div>
      ) : (
        <div className='mt-4 space-y-2'>
          {items.map((invite) => {
            const assistantName = invite.assistant?.displayName ?? t('outgoingInvites.card.unknownAssistant')
            const isPending = invite.status === 'PENDING'
            const isExpanded = expandedInviteId === invite.id
            return (
              <article key={invite.id} className='rounded-lg border border-border bg-background p-3'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='truncate text-sm font-semibold text-foreground'>{assistantName}</h3>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          STATUS_CLASS[invite.status]
                        )}
                      >
                        {t(`outgoingInvites.status.${invite.status}`)}
                      </span>
                    </div>
                    <div className='mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                      <span>{invite.series?.title ?? t('outgoingInvites.card.noSeries')}</span>
                      <span className='inline-flex items-center gap-1'>
                        <Calendar className='h-3 w-3' />
                        {t('outgoingInvites.card.hireWindow', {
                          from: formatDate(invite.hireStart, i18n.language),
                          to: formatDate(invite.hireEnd, i18n.language)
                        })}
                      </span>
                    </div>
                  </div>
                  <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <button
                      type='button'
                      onClick={() => setExpandedInviteId(isExpanded ? null : invite.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`outgoing-invite-detail-${invite.id}`}
                      className='inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer'
                    >
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isExpanded && 'rotate-180')} />
                      {t(isExpanded ? 'outgoingInvites.actions.hideDetails' : 'outgoingInvites.actions.showDetails')}
                    </button>
                    {isPending && (
                      <button
                        type='button'
                        disabled={isCancelling}
                        onClick={() => setConfirmationTarget(invite)}
                        className='inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
                      >
                        <X className='h-3.5 w-3.5' />
                        {t('outgoingInvites.actions.cancel')}
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div id={`outgoing-invite-detail-${invite.id}`} className='mt-3'>
                    <OutgoingInviteDetail inviteId={invite.id} />
                  </div>
                )}
              </article>
            )
          })}
          {total > perPage && (
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(total / perPage))}
              setPage={setPage}
              from={(page - 1) * perPage + 1}
              to={Math.min(page * perPage, total)}
              total={total}
              tKeyPrefix='outgoingInvites.pagination'
              t={t}
            />
          )}
        </div>
      )}

      <Dialog
        open={confirmationTarget !== null}
        onClose={() => {
          if (!isCancelling) setConfirmationTarget(null)
        }}
        titleId='cancel-outgoing-invite-title'
        descriptionId='cancel-outgoing-invite-description'
        title={t('outgoingInvites.confirm.title')}
        description={t('outgoingInvites.confirm.description', {
          name: confirmationTarget?.assistant?.displayName ?? t('outgoingInvites.card.unknownAssistant')
        })}
        footer={
          <div className='flex justify-end gap-2'>
            <button
              type='button'
              disabled={isCancelling}
              onClick={() => setConfirmationTarget(null)}
              className='rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              {t('outgoingInvites.actions.keep')}
            </button>
            <button
              type='button'
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className='inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer'
            >
              {isCancelling && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
              {t(isCancelling ? 'outgoingInvites.actions.cancelling' : 'outgoingInvites.actions.confirmCancel')}
            </button>
          </div>
        }
      >
        <p className='text-sm text-muted-foreground'>{t('outgoingInvites.confirm.notice')}</p>
      </Dialog>
    </section>
  )
}
