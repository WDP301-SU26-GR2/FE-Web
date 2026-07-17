import { Loader2, Send, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { useChapterProgress } from '../hooks/use-chapter-progress'
import { useManuscriptActions } from '../hooks/use-manuscript-actions'
import { usePublicationContext } from '../publication-shell-context'

export function ManuscriptActionPanel() {
  const { t } = useTranslation('mangaka')
  const { chapter, pages, refreshAll } = usePublicationContext()
  const { progress, refresh: refreshProgress } = useChapterProgress(chapter?.id)
  const { run, activeAction } = useManuscriptActions()

  if (!chapter?.manuscriptStatus) return null

  const status = chapter.manuscriptStatus
  const allPagesCompleted = pages.length > 0 && pages.every((page) => page.status === 'COMPLETED')
  const allPagesCompositeReady =
    pages.length > 0 && pages.every((page) => page.status === 'COMPOSITE_READY' || page.status === 'COMPLETED')

  const action =
    status === 'IN_PRODUCTION' && allPagesCompositeReady
      ? 'markCompositeReady'
      : status === 'COMPOSITE_REVIEW' && allPagesCompleted
        ? 'submit'
        : status === 'EDITOR_REVISION'
          ? 'resubmit'
          : null

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

          {progress && (
            <div className='mt-2 flex items-center gap-3'>
              <div className='h-1.5 min-w-28 flex-1 overflow-hidden rounded-full bg-muted'>
                <div
                  className='h-full rounded-full bg-primary transition-[width]'
                  style={{ width: `${Math.min(100, Math.max(0, progress.progressPct))}%` }}
                />
              </div>
              <span className='shrink-0 text-xs font-semibold text-foreground'>
                {t('publication.manuscript.progress', {
                  completed: progress.pagesCompleted,
                  total: progress.totalPages,
                  percent: progress.progressPct
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
            {activeAction ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : action === 'markCompositeReady' ? (
              <ShieldCheck className='h-3.5 w-3.5' />
            ) : (
              <Send className='h-3.5 w-3.5' />
            )}
            {t(`publication.manuscript.actions.${action}.button`)}
          </button>
        )}
      </div>

      {status === 'COMPOSITE_REVIEW' && !allPagesCompleted && (
        <p className='mt-2 text-xs text-warning'>{t('publication.manuscript.completePagesHint')}</p>
      )}
    </section>
  )
}
