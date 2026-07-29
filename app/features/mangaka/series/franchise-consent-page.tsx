import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, GitFork, Loader2, XCircle } from 'lucide-react'
import { Link, useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/ui'
import { FranchiseConsentDialog } from './components/franchise-consent-dialog'

export type FranchiseConsentActionResult =
  | { ok: true; approve: boolean }
  | {
      ok: false
      error: 'invalidRequest' | 'permission' | 'notFound' | 'notPending' | 'generic'
    }

interface FranchiseConsentPageProps {
  targetSeriesId: string
}

/**
 * Notification-only decision surface for an original Mangaka.
 *
 * The pending child series is owned by another Mangaka, so its owner-scoped
 * detail endpoint cannot be used here. The notification reference id is the
 * only target information this page can truthfully display.
 */
export function FranchiseConsentPage({ targetSeriesId }: FranchiseConsentPageProps) {
  const { t } = useTranslation('mangaka')
  const fetcher = useFetcher<FranchiseConsentActionResult>()
  const [pendingDecision, setPendingDecision] = useState<boolean | null>(null)
  const submissionLockRef = useRef(false)

  const isSubmitting = fetcher.state !== 'idle'
  const completedDecision = fetcher.data?.ok ? fetcher.data.approve : null
  const errorKey = fetcher.data && !fetcher.data.ok ? fetcher.data.error : null

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && !fetcher.data.ok) {
      submissionLockRef.current = false
    }
  }, [fetcher.data, fetcher.state])

  function closeDialog() {
    if (!isSubmitting) setPendingDecision(null)
  }

  async function submitDecision() {
    if (pendingDecision === null || isSubmitting || completedDecision !== null || submissionLockRef.current) return

    submissionLockRef.current = true
    fetcher.submit(
      { approve: String(pendingDecision) },
      { method: 'post', action: `/dashboard/mangaka/series/franchise-consent/${encodeURIComponent(targetSeriesId)}` }
    )
  }

  if (completedDecision !== null) {
    return (
      <main className='mx-auto max-w-2xl space-y-6 pb-12' aria-labelledby='franchise-consent-success-title'>
        <section className='rounded-xl border border-border bg-card p-6 text-center shadow-sm sm:p-8'>
          {completedDecision ? (
            <CheckCircle2 className='mx-auto size-12 text-primary' aria-hidden='true' />
          ) : (
            <XCircle className='mx-auto size-12 text-destructive' aria-hidden='true' />
          )}
          <h1 id='franchise-consent-success-title' className='mt-4 text-2xl font-bold text-foreground'>
            {t(completedDecision ? 'franchiseConsent.success.approvedTitle' : 'franchiseConsent.success.rejectedTitle')}
          </h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            {t(
              completedDecision
                ? 'franchiseConsent.success.approvedDescription'
                : 'franchiseConsent.success.rejectedDescription'
            )}
          </p>
          <TargetIdentifier targetSeriesId={targetSeriesId} />
          <div className='mt-6 flex flex-col justify-center gap-2 sm:flex-row'>
            <Link
              to='/dashboard/mangaka/notifications'
              className='inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring'
            >
              {t('franchiseConsent.actions.backToNotifications')}
            </Link>
            <Link
              to='/dashboard/mangaka/series'
              className='inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
            >
              {t('franchiseConsent.actions.backToSeries')}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className='mx-auto max-w-2xl space-y-6 pb-12' aria-labelledby='franchise-consent-title'>
      <Link
        to='/dashboard/mangaka/notifications'
        className='inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring'
      >
        <ArrowLeft className='size-4' aria-hidden='true' />
        {t('franchiseConsent.actions.backToNotifications')}
      </Link>

      <section className='rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8'>
        <div className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
          <GitFork className='size-5' aria-hidden='true' />
        </div>
        <p className='mt-5 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          {t('franchiseConsent.eyebrow')}
        </p>
        <h1 id='franchise-consent-title' className='mt-2 text-2xl font-bold text-foreground'>
          {t('franchiseConsent.title')}
        </h1>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>{t('franchiseConsent.description')}</p>

        <TargetIdentifier targetSeriesId={targetSeriesId} />

        <p className='mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
          {t('franchiseConsent.limitedDetails')}
        </p>

        {errorKey && (
          <p
            role='alert'
            className='mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive'
          >
            {t(`franchiseConsent.errors.${errorKey}`)}
          </p>
        )}

        <div className='mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
          <Button
            variant='destructive'
            disabled={isSubmitting || !targetSeriesId}
            onClick={() => setPendingDecision(false)}
          >
            <XCircle className='size-4' aria-hidden='true' />
            {t('franchiseConsent.actions.reject')}
          </Button>
          <Button disabled={isSubmitting || !targetSeriesId} onClick={() => setPendingDecision(true)}>
            {isSubmitting ? (
              <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            ) : (
              <CheckCircle2 className='size-4' aria-hidden='true' />
            )}
            {t('franchiseConsent.actions.approve')}
          </Button>
        </div>
      </section>

      {pendingDecision !== null && (
        <FranchiseConsentDialog
          open
          seriesTitle={t('franchiseConsent.targetValue', { id: targetSeriesId })}
          approve={pendingDecision}
          isSubmitting={isSubmitting}
          error={errorKey ? t(`franchiseConsent.errors.${errorKey}`) : undefined}
          onClose={closeDialog}
          onConfirm={submitDecision}
        />
      )}
    </main>
  )
}

function TargetIdentifier({ targetSeriesId }: { targetSeriesId: string }) {
  const { t } = useTranslation('mangaka')

  return (
    <dl className='mt-5 rounded-lg border border-border bg-background p-4'>
      <dt className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
        {t('franchiseConsent.targetLabel')}
      </dt>
      <dd className='mt-1 break-all font-mono text-sm font-semibold text-foreground'>
        {targetSeriesId || t('franchiseConsent.targetMissing')}
      </dd>
    </dl>
  )
}
