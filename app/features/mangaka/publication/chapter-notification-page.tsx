import { ArrowLeft, CheckCircle2, Loader2, RefreshCw, Undo2 } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { SignedImage } from '~/shared/components/signed-image'
import { useChapter } from './hooks/use-chapter'
import { useChapterPages } from './hooks/use-chapter-pages'
import { useCoOwnerApprovalActions } from './hooks/use-co-owner-approval'
import { CoOwnerRejectDialog } from './components/co-owner-reject-dialog'

export function ChapterNotificationPage({
  chapterId,
  allowCoOwnerDecision
}: {
  chapterId: string
  allowCoOwnerDecision: boolean
}) {
  const { t } = useTranslation('mangaka')
  const { chapter, isLoading, error, notFound, refresh } = useChapter(chapterId)
  const { pages, isLoading: isPagesLoading, error: pagesError, refresh: refreshPages } = useChapterPages(chapterId)
  const { run, activeAction } = useCoOwnerApprovalActions()
  const [rejectOpen, setRejectOpen] = useState(false)

  const decide = async (action: 'approve' | 'reject', reason?: string) => {
    const updated = await run(action, chapterId, reason)
    if (!updated) return
    setRejectOpen(false)
    refresh()
  }

  return (
    <main className='mx-auto max-w-3xl space-y-6 pb-12'>
      <Link
        to='/dashboard/mangaka/notifications'
        className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        {t('publication.manuscript.coOwner.notification.back')}
      </Link>

      <section className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          {t('publication.manuscript.coOwner.notification.eyebrow')}
        </p>
        <h1 className='mt-2 text-2xl font-bold text-card-foreground'>
          {t('publication.manuscript.coOwner.notification.title')}
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          {t('publication.manuscript.coOwner.notification.description')}
        </p>

        {isLoading && (
          <div className='mt-6 flex items-center gap-2 text-sm text-muted-foreground' role='status'>
            <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            {t('publication.manuscript.coOwner.notification.loading')}
          </div>
        )}

        {!isLoading && (error || notFound) && (
          <div
            className='mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'
            role='alert'
          >
            <p>{notFound ? t('publication.manuscript.coOwner.notification.notFound') : error}</p>
            {!notFound && (
              <Button type='button' variant='outline' size='sm' className='mt-3' onClick={refresh}>
                <RefreshCw className='size-4' aria-hidden='true' />
                {t('publication.manuscript.coOwner.notification.retry')}
              </Button>
            )}
          </div>
        )}

        {!isLoading && chapter && (
          <div className='mt-6 space-y-4'>
            <dl className='grid gap-3 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2'>
              <div>
                <dt className='text-xs font-semibold text-muted-foreground'>
                  {t('publication.manuscript.coOwner.notification.chapter')}
                </dt>
                <dd className='mt-1 font-semibold text-foreground'>
                  {t('publication.manuscript.coOwner.notification.chapterValue', { number: chapter.chapterNumber })}
                </dd>
              </div>
              <div>
                <dt className='text-xs font-semibold text-muted-foreground'>
                  {t('publication.manuscript.coOwner.notification.status')}
                </dt>
                <dd className='mt-1 font-semibold text-foreground'>
                  {t(`publication.manuscript.status.${chapter.manuscriptStatus}`)}
                </dd>
              </div>
            </dl>

            <section aria-labelledby='chapter-notification-pages-title' className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <h2 id='chapter-notification-pages-title' className='font-semibold text-foreground'>
                  {t('publication.manuscript.coOwner.notification.pagesTitle')}
                </h2>
                {pagesError && (
                  <Button type='button' variant='outline' size='sm' onClick={refreshPages}>
                    <RefreshCw className='size-4' aria-hidden='true' />
                    {t('publication.manuscript.coOwner.notification.retry')}
                  </Button>
                )}
              </div>
              {isPagesLoading ? (
                <p className='text-sm text-muted-foreground' role='status'>
                  {t('publication.manuscript.coOwner.notification.pagesLoading')}
                </p>
              ) : pagesError ? (
                <p className='text-sm text-destructive' role='alert'>
                  {pagesError}
                </p>
              ) : pages.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  {t('publication.manuscript.coOwner.notification.pagesEmpty')}
                </p>
              ) : (
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                  {pages.map((page) => (
                    <figure key={page.id} className='space-y-1'>
                      <SignedImage
                        r2Key={page.displayFile}
                        alt={t('publication.manuscript.coOwner.notification.pageAlt', { number: page.pageNumber })}
                        aspectClassName='aspect-[3/4]'
                      />
                      <figcaption className='text-center text-xs text-muted-foreground'>
                        {t('publication.manuscript.coOwner.notification.pageLabel', { number: page.pageNumber })}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>

            {allowCoOwnerDecision && chapter.manuscriptStatus === 'AWAITING_CO_OWNER_APPROVAL' ? (
              <div className='space-y-3'>
                <p className='text-sm text-muted-foreground'>{t('publication.manuscript.coOwner.decisionHint')}</p>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' disabled={activeAction !== null} onClick={() => void decide('approve')}>
                    {activeAction === 'approve' ? (
                      <Loader2 className='size-4 animate-spin' aria-hidden='true' />
                    ) : (
                      <CheckCircle2 className='size-4' aria-hidden='true' />
                    )}
                    {t('publication.manuscript.coOwner.actions.approve.button')}
                  </Button>
                  <Button
                    type='button'
                    variant='destructive'
                    disabled={activeAction !== null}
                    onClick={() => setRejectOpen(true)}
                  >
                    <Undo2 className='size-4' aria-hidden='true' />
                    {t('publication.manuscript.coOwner.actions.reject.button')}
                  </Button>
                </div>
              </div>
            ) : allowCoOwnerDecision ? (
              <p className='rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground'>
                {t('publication.manuscript.coOwner.notification.resolved')}
              </p>
            ) : null}
          </div>
        )}
      </section>

      {allowCoOwnerDecision && rejectOpen && (
        <CoOwnerRejectDialog
          open
          isSubmitting={activeAction === 'reject'}
          onClose={() => {
            if (!activeAction) setRejectOpen(false)
          }}
          onConfirm={(reason) => void decide('reject', reason)}
        />
      )}
    </main>
  )
}
