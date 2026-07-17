import { useEffect } from 'react'
import { Loader2, MessageSquareWarning, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { useAuth } from '~/features/auth/context/auth-context'
import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'

import { useRevisionRequestsDrawer } from '../use-revision-requests-drawer'

type RevisionRequestsDrawerProps = {
  open: boolean
  onClose: () => void
  seriesId: string
  nameId: string | null | undefined
}

const PAGE_SIZE = 4

const TARGET_LABEL_KEY = {
  PROPOSAL: 'seriesDetail.revisions.target.PROPOSAL',
  NAME: 'seriesDetail.revisions.target.NAME',
  MANUSCRIPT: 'seriesDetail.revisions.target.MANUSCRIPT',
  TASK: 'seriesDetail.revisions.target.TASK'
} as const satisfies Record<
  RevisionRequestListResDtoOutputItemsItem['targetType'],
  string
>

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

/**
 * Slide-in drawer (from the right) listing every RevisionRequest the Editor
 * team has opened against the current series — both PROPOSAL- and NAME-scoped.
 * The owner can resolve any round where they are the recipient.
 *
 * - Closing paths: X button, overlay click, ESC, or click outside.
 * - Pagination: PAGE_SIZE rounds per page.
 * - Items are intentionally rendered WITHOUT the backend id.
 */
export function RevisionRequestsDrawer({
  open,
  onClose,
  seriesId,
  nameId
}: RevisionRequestsDrawerProps) {
  const { t, i18n } = useTranslation('mangaka')
  const { session } = useAuth()
  const currentUserId = session?.user?.id ?? null
  const locale = i18n.language

  const {
    items,
    isLoading,
    error,
    page,
    totalPages,
    setPage,
    paginatedItems,
    resolvingId,
    resolve,
    refresh
  } = useRevisionRequestsDrawer(open, seriesId, nameId)

  // Lock body scroll + listen for ESC while the drawer is open.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const titleId = 'revision-drawer-title'
  const descId = 'revision-drawer-desc'
  const from = items.length === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(items.length, (page + 1) * PAGE_SIZE)

  return (
    <>
      {/* Overlay — sits behind the panel (z-40) and fades in/out */}
      <div
        aria-hidden='true'
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Drawer panel — slides in from the right via translate-x */}
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={descId}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-lg',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <header className='flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4'>
          <div className='min-w-0 flex-1'>
            <h2 id={titleId} className='flex items-center gap-2 text-base font-bold tracking-tight'>
              <MessageSquareWarning className='h-5 w-5 text-primary' />
              {t('seriesDetail.revisions.title')}
            </h2>
            <p id={descId} className='mt-0.5 text-xs text-muted-foreground'>
              {t('seriesDetail.revisions.drawer.subtitle')}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label={t('seriesDetail.revisions.drawer.close')}
            className='rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <X className='h-5 w-5' />
          </button>
        </header>

        {/* Body */}
        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {isLoading && items.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-16 text-center text-muted-foreground'>
              <Loader2 className='h-6 w-6 animate-spin' />
              <p className='text-sm'>{t('seriesDetail.revisions.drawer.loading')}</p>
            </div>
          ) : error ? (
            <div className='mx-auto max-w-sm space-y-3 py-10 text-center'>
              <div
                role='alert'
                className='rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
              >
                {error}
              </div>
              <button
                type='button'
                onClick={refresh}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted'
              >
                <RefreshCw className='h-3.5 w-3.5' />
                {t('seriesDetail.revisions.drawer.error.retry')}
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-16 text-center'>
              <MessageSquareWarning className='h-10 w-10 text-muted-foreground/40' />
              <h3 className='text-sm font-semibold text-foreground'>
                {t('seriesDetail.revisions.drawer.empty.title')}
              </h3>
              <p className='max-w-xs text-xs text-muted-foreground'>
                {t('seriesDetail.revisions.drawer.empty.description')}
              </p>
            </div>
          ) : (
            <ul className='space-y-3'>
              {paginatedItems.map((item) => {
                const targetKey = TARGET_LABEL_KEY[item.targetType]
                const targetLabel = i18n.exists(targetKey) ? t(targetKey) : item.targetType
                const canResolve =
                  !!currentUserId && item.recipientId === currentUserId && !item.isResolved
                return (
                  <li
                    key={item.id}
                    className='rounded-lg border border-border bg-background/40 p-3 text-sm'
                  >
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
                        {targetLabel}
                      </span>
                      <span className='inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                        {t('seriesDetail.revisions.round', { round: item.round })}
                      </span>
                    </div>
                    <p className='whitespace-pre-wrap text-sm text-foreground'>{item.reason}</p>
                    <div className='mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                      <span>
                        {t('seriesDetail.revisions.drawer.requestedByEditorFallback')}
                        {' · '}
                        {formatDateTime(item.createdAt, locale)}
                      </span>
                      {item.isResolved && (
                        <span className='inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600'>
                          {t('seriesDetail.revisions.drawer.resolved')}
                        </span>
                      )}
                    </div>
                    {canResolve && (
                      <button
                        type='button'
                        disabled={resolvingId !== null}
                        onClick={() => void resolve(item)}
                        className='mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {resolvingId === item.id && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                        {resolvingId === item.id
                          ? t('seriesDetail.revisions.resolving')
                          : t('seriesDetail.revisions.resolve')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <footer className='flex shrink-0 flex-col gap-2 border-t border-border px-5 py-3 text-xs text-muted-foreground'>
          {items.length > 0 && (
            <div className='flex items-center justify-between gap-3'>
              <span>
                {t('seriesDetail.revisions.drawer.paginationInfo', { from, to, total: items.length })}
              </span>
              <div className='flex items-center gap-1'>
                <button
                  type='button'
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  aria-label={t('seriesDetail.revisions.drawer.close')}
                  className='rounded-md border border-border px-2 py-1 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'
                >
                  ‹
                </button>
                <span className='px-1'>
                  {page + 1} / {totalPages}
                </span>
                <button
                  type='button'
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  aria-label={t('seriesDetail.revisions.drawer.close')}
                  className='rounded-md border border-border px-2 py-1 text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40'
                >
                  ›
                </button>
              </div>
            </div>
          )}
          <span className='block'>{t('seriesDetail.revisions.drawer.footerHint')}</span>
        </footer>
      </aside>
    </>
  )
}
