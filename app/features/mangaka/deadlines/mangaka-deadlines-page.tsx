import { useState, type FormEvent } from 'react'
import { CalendarClock, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { DeadlineRequestListResDtoOutputItemsItem } from '~/api/model/deadline-requests'
import { Button, Dialog } from '~/shared/ui'
import { useMangakaDeadlines, type DeadlineDraft } from './use-mangaka-deadlines'

function isNegotiable(status: DeadlineRequestListResDtoOutputItemsItem['status']): boolean {
  return status === 'PROPOSED' || status === 'COUNTER_PROPOSED'
}

function isOpenDeadlineRequest(status: DeadlineRequestListResDtoOutputItemsItem['status']): boolean {
  return (
    status === 'PROPOSED' ||
    status === 'COUNTER_PROPOSED' ||
    status === 'AGREED_BY_PARTIES' ||
    status === 'ESCALATED' ||
    status === 'BOARD_REVIEW'
  )
}

function displayDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export function MangakaDeadlinesPage() {
  const { t } = useTranslation('mangaka')
  const [searchParams] = useSearchParams()
  const deadlines = useMangakaDeadlines({
    initialSeriesId: searchParams.get('seriesId'),
    initialChapterId: searchParams.get('chapterId'),
    initialRequestId: searchParams.get('requestId')
  })
  const [dialog, setDialog] = useState<'create' | 'counter' | 'reject' | 'withdraw' | null>(null)

  const chapterCanRequest = Boolean(
    deadlines.selectedChapter?.schedule?.currentDeadline &&
    deadlines.selectedChapter.status !== 'PUBLISHED' &&
    deadlines.selectedChapter.manuscriptStatus !== 'PUBLISHED'
  )
  const hasOpenRequest = deadlines.requests.some((request) => isOpenDeadlineRequest(request.status))
  const selectedRequest = deadlines.selectedRequest
  const openSelectedRequest = Boolean(selectedRequest && isNegotiable(selectedRequest.status))
  const mangakaHasTurn = selectedRequest?.lastProposedBy !== 'MANGAKA'
  const canRespond = Boolean(openSelectedRequest && mangakaHasTurn)
  const canWithdraw = Boolean(openSelectedRequest && selectedRequest?.requestedBy === 'MANGAKA')

  const submitDraft = async (event: FormEvent<HTMLFormElement>, kind: 'create' | 'counter' | 'reject') => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const deadline = String(form.get('requestedDeadline') ?? '')
    const reason = String(form.get('reason') ?? '').trim()
    if (!reason || (kind !== 'reject' && !deadline)) return
    if (kind === 'reject') {
      if (await deadlines.rejectRequest(reason)) setDialog(null)
      return
    }
    const deadlineInput = event.currentTarget.elements.namedItem('requestedDeadline') as HTMLInputElement | null
    const deadlineTime = new Date(deadline).getTime()
    if (!Number.isFinite(deadlineTime) || deadlineTime <= Date.now()) {
      deadlineInput?.setCustomValidity(t('deadlines.form.futureError'))
      deadlineInput?.reportValidity()
      return
    }
    deadlineInput?.setCustomValidity('')
    const draft: DeadlineDraft = { requestedDeadline: new Date(deadline).toISOString(), reason }
    const success = kind === 'create' ? await deadlines.createRequest(draft) : await deadlines.counterRequest(draft)
    if (success) setDialog(null)
  }

  return (
    <div className='mx-auto max-w-6xl space-y-6 pb-12'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 text-primary'>
            <CalendarClock className='h-5 w-5' aria-hidden='true' />
            <span className='text-sm font-semibold'>{t('deadlines.eyebrow')}</span>
          </div>
          <h1 className='mt-1 text-2xl font-bold tracking-tight'>{t('deadlines.title')}</h1>
          <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>{t('deadlines.subtitle')}</p>
        </div>
        <Button
          variant='outline'
          onClick={deadlines.refresh}
          disabled={deadlines.isLoading || deadlines.isChapterLoading}
        >
          <RefreshCw className='h-4 w-4' aria-hidden='true' />
          {t('deadlines.actions.refresh')}
        </Button>
      </header>

      <section className='grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:grid-cols-2'>
        <label className='grid gap-1.5 text-sm font-medium'>
          {t('deadlines.selector.series')}
          <select
            value={deadlines.selectedSeriesId}
            onChange={(event) => deadlines.setSelectedSeriesId(event.target.value)}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
          >
            <option value=''>{t('deadlines.selector.seriesPlaceholder')}</option>
            {deadlines.series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className='grid gap-1.5 text-sm font-medium'>
          {t('deadlines.selector.chapter')}
          <select
            value={deadlines.selectedChapterId}
            onChange={(event) => deadlines.setSelectedChapterId(event.target.value)}
            disabled={!deadlines.chapters.length && !deadlines.selectedChapterId}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
          >
            <option value=''>{t('deadlines.selector.chapterPlaceholder')}</option>
            {deadlines.chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {t('deadlines.chapterOption', { number: item.chapterNumber, title: item.title ?? '' })}
              </option>
            ))}
          </select>
        </label>
      </section>

      {deadlines.error && (
        <div
          role='alert'
          className='rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
        >
          {deadlines.error}
        </div>
      )}

      {deadlines.selectedChapterId && (
        <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <h2 className='font-semibold'>{t('deadlines.request.title')}</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                {deadlines.isChapterLoading
                  ? t('deadlines.loading.chapter')
                  : t('deadlines.request.currentDeadline', {
                      date: displayDate(deadlines.selectedChapter?.schedule?.currentDeadline)
                    })}
              </p>
            </div>
            <Button
              onClick={() => setDialog('create')}
              disabled={!chapterCanRequest || hasOpenRequest || deadlines.activeMutation !== null}
              title={
                !chapterCanRequest
                  ? t('deadlines.request.noSchedule')
                  : hasOpenRequest
                    ? t('deadlines.request.openExists')
                    : undefined
              }
            >
              {t('deadlines.actions.create')}
            </Button>
          </div>
          {!chapterCanRequest && !deadlines.isChapterLoading && (
            <p className='mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground'>
              {t('deadlines.request.noSchedule')}
            </p>
          )}
          {hasOpenRequest && (
            <p className='mt-3 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground'>
              {t('deadlines.request.openExists')}
            </p>
          )}
        </section>
      )}

      <section className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.8fr)]'>
        <div className='rounded-xl border border-border bg-card shadow-sm'>
          <div className='border-b border-border px-5 py-4'>
            <h2 className='font-semibold'>{t('deadlines.list.title')}</h2>
          </div>
          {deadlines.isChapterLoading ? (
            <div className='flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' /> {t('deadlines.loading.requests')}
            </div>
          ) : deadlines.requests.length ? (
            <ul className='divide-y divide-border'>
              {deadlines.requests.map((request) => (
                <li key={request.id}>
                  <button
                    type='button'
                    onClick={() => deadlines.setSelectedRequestId(request.id)}
                    className='flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
                    aria-current={request.id === deadlines.selectedRequestId ? 'true' : undefined}
                  >
                    <span>
                      <span className='block text-sm font-semibold'>{t(`deadlines.status.${request.status}`)}</span>
                      <span className='mt-1 block text-xs text-muted-foreground'>
                        {displayDate(request.currentDeadline)} → {displayDate(request.requestedDeadline)}
                      </span>
                    </span>
                    <ChevronRight className='h-4 w-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className='px-5 py-8 text-sm text-muted-foreground'>{t('deadlines.list.empty')}</p>
          )}
        </div>

        <aside className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='font-semibold'>{t('deadlines.detail.title')}</h2>
          {deadlines.isRequestLoading ? (
            <p className='mt-4 flex items-center gap-2 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' /> {t('deadlines.loading.detail')}
            </p>
          ) : selectedRequest ? (
            <div className='mt-4 space-y-4'>
              <dl className='grid gap-3 text-sm'>
                <Detail label={t('deadlines.detail.status')} value={t(`deadlines.status.${selectedRequest.status}`)} />
                <Detail label={t('deadlines.detail.current')} value={displayDate(selectedRequest.currentDeadline)} />
                <Detail label={t('deadlines.detail.proposed')} value={displayDate(selectedRequest.requestedDeadline)} />
                <Detail label={t('deadlines.detail.reason')} value={selectedRequest.reason || '—'} />
              </dl>
              {openSelectedRequest && !canRespond && !canWithdraw && (
                <p className='rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground'>
                  {t('deadlines.detail.waitingTurn')}
                </p>
              )}
              <div className='flex flex-wrap gap-2'>
                {canRespond && (
                  <>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => setDialog('counter')}
                      disabled={deadlines.activeMutation !== null}
                    >
                      {t('deadlines.actions.counter')}
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => void deadlines.agreeRequest()}
                      disabled={deadlines.activeMutation !== null}
                    >
                      {t('deadlines.actions.agree')}
                    </Button>
                    <Button
                      size='sm'
                      variant='destructive'
                      onClick={() => setDialog('reject')}
                      disabled={deadlines.activeMutation !== null}
                    >
                      {t('deadlines.actions.reject')}
                    </Button>
                  </>
                )}
                {canWithdraw && (
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setDialog('withdraw')}
                    disabled={deadlines.activeMutation !== null}
                  >
                    {t('deadlines.actions.withdraw')}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className='mt-4 text-sm text-muted-foreground'>{t('deadlines.detail.empty')}</p>
          )}
        </aside>
      </section>

      <DeadlineDialog
        kind={dialog}
        activeMutation={deadlines.activeMutation}
        onClose={() => setDialog(null)}
        onSubmit={submitDraft}
        onWithdraw={async () => {
          if (await deadlines.withdrawRequest()) setDialog(null)
        }}
      />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
      <dd className='mt-0.5 break-words text-foreground'>{value}</dd>
    </div>
  )
}

interface DeadlineDialogProps {
  kind: 'create' | 'counter' | 'reject' | 'withdraw' | null
  activeMutation: string | null
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>, kind: 'create' | 'counter' | 'reject') => Promise<void>
  onWithdraw: () => Promise<void>
}

function DeadlineDialog({ kind, activeMutation, onClose, onSubmit, onWithdraw }: DeadlineDialogProps) {
  const { t } = useTranslation('mangaka')
  if (!kind) return null
  const isWithdraw = kind === 'withdraw'
  const isReject = kind === 'reject'
  const title = t(`deadlines.dialog.${kind}.title`)
  const isSubmitting = activeMutation === kind
  return (
    <Dialog
      open
      onClose={onClose}
      titleId='mangaka-deadline-dialog-title'
      descriptionId='mangaka-deadline-dialog-description'
      title={title}
      description={t(`deadlines.dialog.${kind}.description`)}
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            {t('deadlines.actions.cancel')}
          </Button>
          {isWithdraw ? (
            <Button variant='destructive' onClick={() => void onWithdraw()} disabled={isSubmitting}>
              {isSubmitting ? t('deadlines.actions.submitting') : t('deadlines.actions.withdraw')}
            </Button>
          ) : (
            <Button
              form='mangaka-deadline-form'
              type='submit'
              variant={isReject ? 'destructive' : 'primary'}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('deadlines.actions.submitting') : t(`deadlines.actions.${kind}`)}
            </Button>
          )}
        </div>
      }
    >
      {isWithdraw ? (
        <p className='text-sm text-foreground'>{t('deadlines.dialog.withdraw.confirmation')}</p>
      ) : (
        <form id='mangaka-deadline-form' className='grid gap-4' onSubmit={(event) => void onSubmit(event, kind)}>
          {!isReject && (
            <label className='grid gap-1.5 text-sm font-medium'>
              {t('deadlines.form.requestedDeadline')}
              <input
                name='requestedDeadline'
                type='datetime-local'
                required
                className='h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'
              />
            </label>
          )}
          <label className='grid gap-1.5 text-sm font-medium'>
            {t('deadlines.form.reason')}
            <textarea
              name='reason'
              required
              maxLength={1000}
              rows={4}
              className='rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
            />
          </label>
        </form>
      )}
    </Dialog>
  )
}
