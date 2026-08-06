import { useEffect, useState } from 'react'
import { Loader2, MessageSquareWarning, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { RevisionRequestListResDtoOutputItemsItem } from '~/api/model/revision'
import { useAuth } from '~/features/auth/context/auth-context'
import { cn } from '~/shared/lib/cn'

type StoryboardRevisionRequestsDrawerProps = {
  open: boolean
  onClose: () => void
  onRevisionResolved: () => void
  revisions: RevisionRequestListResDtoOutputItemsItem[]
  isLoading: boolean
  error: string | null
  resolvingRevisionId: string | null
  resolveRevision: (revisionId: string) => Promise<boolean>
  refreshRevisions: () => void
}

function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' })
}

/** Right-side revision history drawer for the chapter Name storyboard. */
export function StoryboardRevisionRequestsDrawer({
  open,
  onClose,
  onRevisionResolved,
  revisions,
  isLoading,
  error,
  resolvingRevisionId,
  resolveRevision,
  refreshRevisions
}: StoryboardRevisionRequestsDrawerProps) {
  const { t, i18n } = useTranslation('mangaka')
  const { session } = useAuth()
  const currentUserId = session?.user?.id ?? null
  const [pendingResolution, setPendingResolution] = useState<RevisionRequestListResDtoOutputItemsItem | null>(null)
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <>
      <div
        aria-hidden='true'
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-muted-foreground/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside
        role='dialog'
        aria-modal='true'
        aria-labelledby='storyboard-revision-drawer-title'
        aria-describedby='storyboard-revision-drawer-description'
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card text-card-foreground shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-lg',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className='flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4'>
          <div className='min-w-0 flex-1'>
            <h2
              id='storyboard-revision-drawer-title'
              className='flex items-center gap-2 text-base font-bold tracking-tight'
            >
              <MessageSquareWarning className='h-5 w-5 text-primary' />
              {t('seriesDetail.revisions.title')}
            </h2>
            <p id='storyboard-revision-drawer-description' className='mt-0.5 text-xs text-muted-foreground'>
              {t('publication.name.revisions.drawerSubtitle')}
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

        <div className='flex-1 overflow-y-auto px-5 py-4'>
          {isLoading && revisions.length === 0 ? (
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
                onClick={refreshRevisions}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted'
              >
                <RefreshCw className='h-3.5 w-3.5' />
                {t('seriesDetail.revisions.drawer.error.retry')}
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-16 text-center'>
              <MessageSquareWarning className='h-10 w-10 text-muted-foreground/40' />
              <h3 className='text-sm font-semibold text-foreground'>
                {t('seriesDetail.revisions.drawer.empty.title')}
              </h3>
              <p className='max-w-xs text-xs text-muted-foreground'>
                {t('publication.name.revisions.emptyDescription')}
              </p>
            </div>
          ) : (
            <ul className='space-y-3'>
              {revisions.map((revision) => {
                const canResolve = !!currentUserId && revision.recipientId === currentUserId && !revision.isResolved
                return (
                  <li key={revision.id} className='rounded-lg border border-border bg-background/40 p-3 text-sm'>
                    <div className='mb-2 flex items-center justify-between gap-2'>
                      <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary'>
                        {t('seriesDetail.revisions.target.STORYBOARD')}
                      </span>
                      <span className='inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                        {t('seriesDetail.revisions.round', { round: revision.round })}
                      </span>
                    </div>
                    <p className='whitespace-pre-wrap text-sm text-foreground'>{revision.reason}</p>
                    <div className='mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                      <span>
                        {t('seriesDetail.revisions.drawer.requestedByEditorFallback')} ·{' '}
                        {formatDateTime(revision.createdAt, i18n.language)}
                      </span>
                      {revision.isResolved && (
                        <span className='inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success'>
                          {t('seriesDetail.revisions.drawer.resolved')}
                        </span>
                      )}
                    </div>
                    {canResolve && (
                      <button
                        type='button'
                        disabled={resolvingRevisionId !== null}
                        onClick={() => setPendingResolution(revision)}
                        className='mt-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50'
                      >
                        {resolvingRevisionId === revision.id && <Loader2 className='h-3.5 w-3.5 animate-spin' />}
                        {resolvingRevisionId === revision.id
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

        <footer className='shrink-0 border-t border-border px-5 py-3 text-xs text-muted-foreground'>
          {t('publication.name.revisions.drawerFooter')}
        </footer>
      </aside>

      {pendingResolution && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4' role='presentation'>
          <div
            aria-hidden='true'
            className='absolute inset-0 bg-muted-foreground/60 backdrop-blur-sm'
            onClick={() => setPendingResolution(null)}
          />
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby='confirm-storyboard-revision-title'
            className='relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl'
          >
            <h3 id='confirm-storyboard-revision-title' className='text-base font-bold text-foreground'>
              {t('seriesDetail.revisions.confirmTitle')}
            </h3>
            <p className='mt-2 text-sm text-muted-foreground'>{t('seriesDetail.revisions.confirmDescription')}</p>
            <p className='mt-3 text-sm text-foreground'>{t('seriesDetail.revisions.confirmNotice')}</p>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setPendingResolution(null)}
                className='rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted'
              >
                {t('seriesDetail.revisions.drawer.close')}
              </button>
              <button
                type='button'
                disabled={resolvingRevisionId !== null}
                onClick={() => {
                  void resolveRevision(pendingResolution.id).then((resolved) => {
                    if (resolved) onRevisionResolved()
                    setPendingResolution(null)
                  })
                }}
                className='rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {t('seriesDetail.revisions.confirmCta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
