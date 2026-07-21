import { Loader2, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { useChapterProgress } from '../hooks/use-chapter-progress'
import { useManuscriptActions } from '../hooks/use-manuscript-actions'
import { usePublicationContext } from '../publication-shell-context'

/**
 * Manuscript action panel for the Pages view.
 *
 * Per FE-API-Guide-v3 §5:
 *   - Manuscript state machine:
 *     DRAFT → IN_PRODUCTION → EDITOR_REVIEW ⇄ EDITOR_REVISION → READY_FOR_PRINT → PUBLISHED
 *   - Submit manuscript gate (step 6):
 *     Must have ≥1 page AND every non-CANCELLED Task is APPROVED.
 *     BE returns 409 `Error.NoPagesToSubmit` or `Error.TasksNotAllApproved`.
 *     `ChapterProgress.pagesReady/pagesPending` is BE's canonical count for this.
 *   - After submit, pages bulk DRAFT → COMPLETED and manuscript → EDITOR_REVIEW.
 *
 * Terminal states display a read-only banner so Mangaka knows where they stand.
 */
export function ManuscriptActionPanel() {
  const { t } = useTranslation('mangaka')
  const { chapter, pages, refreshAll } = usePublicationContext()
  const { progress, refresh: refreshProgress } = useChapterProgress(chapter?.id)
  const { run, activeAction } = useManuscriptActions()

  if (!chapter?.manuscriptStatus) return null

  const status = chapter.manuscriptStatus
  const totalPages = pages.length

  // Terminal states — display info banner, no action button.
  const isReadyForPrint = status === 'READY_FOR_PRINT'
  const isAwaitingCoOwner = status === 'AWAITING_CO_OWNER_APPROVAL'
  const isPublished = status === 'PUBLISHED'
  const isTerminal = isReadyForPrint || isAwaitingCoOwner || isPublished

  // Submit is allowed when manuscript is IN_PRODUCTION, has ≥1 page,
  // AND BE confirms all tasks are done (pagesReady === totalPages).
  const canSubmit =
    status === 'IN_PRODUCTION' &&
    totalPages > 0 &&
    progress !== null &&
    progress.pagesReady === totalPages

  const canResubmit = status === 'EDITOR_REVISION'

  const action: 'submit' | 'resubmit' | null = canSubmit ? 'submit' : canResubmit ? 'resubmit' : null

  const onAction = async () => {
    if (!action) return
    const updated = await run(action, chapter.id)
    if (updated) {
      refreshAll()
      refreshProgress()
    }
  }

  return (
    <section className='border-t border-border bg-muted/20 px-5 py-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>
              {t('publication.manuscript.label')}
            </span>
            <span className='rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[10px] font-bold text-info'>
              {t(`publication.manuscript.status.${status}`)}
            </span>
            {progress?.onHold && (
              <span className='rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning'>
                {t('publication.manuscript.onHold')}
              </span>
            )}
          </div>

          {isTerminal && (
            <p className='mt-2 text-xs'>
              {isPublished
                ? t('publication.manuscript.publishedHint')
                : isAwaitingCoOwner
                  ? t('publication.manuscript.coOwnerPending')
                  : t('publication.manuscript.readyForPrintHint')}
            </p>
          )}

          {progress && !isTerminal && (
            <div className='mt-2 flex items-center gap-3'>
              <div className='h-1.5 min-w-28 flex-1 overflow-hidden rounded-full bg-muted'>
                <div
                  className='h-full rounded-full bg-primary transition-[width]'
                  style={{
                    width: `${Math.min(100, Math.max(0, progress.progressPct * 100))}%`
                  }}
                />
              </div>
              <span className='shrink-0 text-xs font-semibold text-foreground'>
                {t('publication.manuscript.progress', {
                  ready: progress.pagesReady,
                  pending: progress.pagesPending,
                  total: progress.totalPages,
                  percent: Math.round(progress.progressPct * 100)
                })}
              </span>
            </div>
          )}
        </div>

        {action && !progress?.onHold && (
          <button
            type='button'
            disabled={activeAction !== null}
            onClick={() => void onAction()}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {activeAction ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
            {t(`publication.manuscript.actions.${action}.button`)}
          </button>
        )}
      </div>

      {status === 'IN_PRODUCTION' && totalPages === 0 && (
        <p className='mt-2 text-xs text-warning'>{t('publication.manuscript.noPagesHint')}</p>
      )}

      {status === 'IN_PRODUCTION' && totalPages > 0 && progress && progress.pagesPending > 0 && (
        <p className='mt-2 text-xs text-warning'>{t('publication.manuscript.tasksPendingHint')}</p>
      )}
    </section>
  )
}
