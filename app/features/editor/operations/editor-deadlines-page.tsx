import { useState } from 'react'
import { AlertTriangle, CalendarRange, Clock3, Loader2, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DeadlineRequestResDtoOutput } from '~/api/model/deadline-requests'
import type { ChapterListResDtoOutputItemsItem } from '~/api/model/chapters'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import { SemanticStatusBadge } from '~/shared/components/status-badge'
import { Dialog } from '~/shared/ui/dialog'
import {
  OperationFeedback,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

type DeadlineAction =
  | 'createDeadline'
  | 'counterDeadline'
  | 'agreeDeadline'
  | 'rejectDeadline'
  | 'withdrawDeadline'
  | 'finalizeDeadline'

const CLOSED_STATUSES = new Set(['APPROVED', 'REJECTED'])
const NEGOTIABLE_STATUSES = new Set(['PROPOSED', 'COUNTER_PROPOSED'])

export function EditorDeadlinesPage({
  items,
  series,
  chapters,
  focusSeriesId,
  focusChapterId,
  focusRequestId,
  hasError
}: {
  items: DeadlineRequestResDtoOutput[]
  series: SeriesListResDtoOutputItemsItem[]
  chapters: ChapterListResDtoOutputItemsItem[]
  focusSeriesId: string
  focusChapterId: string
  focusRequestId: string
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [selectedRequestId, setSelectedRequestId] = useState(focusRequestId || items[0]?.id || '')
  const [action, setAction] = useState<DeadlineAction | null>(null)
  const selectedRequest = items.find((item) => item.id === selectedRequestId) ?? null
  const selectedChapter = chapters.find((item) => item.id === focusChapterId)
  const hasOpenRequest = items.some((item) => !CLOSED_STATUSES.has(item.status))
  const chapterCanRequest = Boolean(selectedChapter?.schedule && selectedChapter.status !== 'PUBLISHED')
  const canCreate = Boolean(focusChapterId && chapterCanRequest && !hasOpenRequest)
  const negotiable = Boolean(selectedRequest && NEGOTIABLE_STATUSES.has(selectedRequest.status))
  const editorHasTurn = selectedRequest?.lastProposedBy !== 'EDITOR'
  const canRespond = negotiable && editorHasTurn
  const canWithdraw = negotiable && selectedRequest?.requestedBy === 'EDITOR'
  const canFinalize = selectedRequest?.status === 'AGREED_BY_PARTIES'

  return (
    <OperationsLayout
      titleKey='operations.deadlines'
      descriptionKey='operations.descriptions.deadlines'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_1fr_auto]'>
          <select name='seriesId' defaultValue={focusSeriesId} className={operationInput}>
            <option value=''>{t('operations.selectSeries')}</option>
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
          <select name='chapterId' defaultValue={focusChapterId} className={operationInput} disabled={!focusSeriesId}>
            <option value=''>{t('operations.selectChapter')}</option>
            {chapters.map((item) => (
              <option key={item.id} value={item.id}>
                {t('operations.chapterOption', { number: item.chapterNumber, title: item.title || '' })}
              </option>
            ))}
          </select>
          <button className='rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>

        {focusChapterId && (
          <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3'>
            <div className='text-xs'>
              <p className='font-bold text-foreground'>
                {t('operations.deadlineCurrent')}:{' '}
                {formatDate(selectedChapter?.schedule?.currentDeadline, t('operations.notAvailable'))}
              </p>
              <p className='mt-1 text-muted-foreground'>
                {!chapterCanRequest
                  ? t('operations.deadlineChapterUnavailable')
                  : hasOpenRequest
                    ? t('operations.deadlineOpenExists')
                    : t('operations.deadlineCreateReady')}
              </p>
            </div>
            <button
              type='button'
              onClick={() => setAction('createDeadline')}
              disabled={!canCreate}
              className='h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50'
            >
              {t('actions.createRequest')}
            </button>
          </div>
        )}
      </section>

      <section className='grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)]'>
        <div className='rounded-xl border border-border bg-card shadow-sm'>
          <div className='border-b border-border px-5 py-4'>
            <h2 className='text-sm font-bold text-foreground'>{t('operations.deadlineList')}</h2>
          </div>
          {items.length ? (
            <div className='divide-y divide-border'>
              {items.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setSelectedRequestId(item.id)}
                  aria-current={item.id === selectedRequestId ? 'true' : undefined}
                  className='flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50 aria-[current=true]:bg-primary/5'
                >
                  <span className='min-w-0'>
                    <span className='block text-xs font-bold text-foreground'>
                      {formatDate(item.currentDeadline, '—')} → {formatDate(item.requestedDeadline, '—')}
                    </span>
                    <span className='mt-1 block truncate text-xs text-muted-foreground'>
                      {t('operations.deadlineRequestedBy', {
                        role: t(`operations.deadlineParties.${item.requestedBy ?? 'UNKNOWN'}`)
                      })}
                    </span>
                  </span>
                  <SemanticStatusBadge value={item.status} label={t(`operations.deadlineStatuses.${item.status}`)} />
                </button>
              ))}
            </div>
          ) : (
            <p className='px-5 py-8 text-center text-xs text-muted-foreground'>
              {focusChapterId ? t('operations.deadlineEmpty') : t('operations.deadlineSelectChapter')}
            </p>
          )}
        </div>

        <div className='rounded-xl border border-border bg-card p-5 shadow-sm'>
          <h2 className='text-sm font-bold text-foreground'>{t('operations.deadlineDetail')}</h2>
          {selectedRequest ? (
            <div className='mt-4 space-y-4'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <SemanticStatusBadge
                  value={selectedRequest.status}
                  label={t(`operations.deadlineStatuses.${selectedRequest.status}`)}
                />
                <span className='text-xs text-muted-foreground'>
                  {formatDate(selectedRequest.createdAt, t('operations.notAvailable'))}
                </span>
              </div>

              <dl className='grid gap-3 sm:grid-cols-2'>
                <DeadlineDetail
                  icon={Clock3}
                  label={t('operations.deadlineCurrent')}
                  value={formatDate(selectedRequest.currentDeadline, t('operations.notAvailable'))}
                />
                <DeadlineDetail
                  icon={CalendarRange}
                  label={t('operations.deadlineProposed')}
                  value={formatDate(selectedRequest.requestedDeadline, t('operations.notAvailable'))}
                />
                <DeadlineDetail
                  icon={UserRound}
                  label={t('operations.deadlineRequestedByLabel')}
                  value={t(`operations.deadlineParties.${selectedRequest.requestedBy ?? 'UNKNOWN'}`)}
                />
                <DeadlineDetail
                  icon={UserRound}
                  label={t('operations.deadlineLastProposedBy')}
                  value={t(`operations.deadlineParties.${selectedRequest.lastProposedBy ?? 'UNKNOWN'}`)}
                />
              </dl>

              <div className='rounded-lg border border-border bg-muted/30 p-3 text-xs'>
                <p className='font-bold text-foreground'>{t('operations.reason')}</p>
                <p className='mt-1 whitespace-pre-wrap text-muted-foreground'>
                  {selectedRequest.reason || t('operations.notAvailable')}
                </p>
              </div>

              <div
                className={`rounded-lg border p-3 text-xs ${
                  selectedRequest.affectsSlot
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <p className='flex items-center gap-2 font-bold'>
                  <AlertTriangle className='size-4' aria-hidden='true' />
                  {selectedRequest.affectsSlot
                    ? t('operations.deadlineAffectsSlot')
                    : t('operations.deadlineNoSlotImpact')}
                </p>
              </div>

              {negotiable && !canRespond && !canWithdraw && (
                <p className='rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground'>
                  {t('operations.deadlineWaitingMangaka')}
                </p>
              )}
              {selectedRequest.status === 'BOARD_REVIEW' || selectedRequest.status === 'ESCALATED' ? (
                <p className='rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground'>
                  {t('operations.deadlineWaitingBoard')}
                </p>
              ) : null}

              <div className='flex flex-wrap gap-2'>
                {canRespond && (
                  <>
                    <DeadlineActionButton label={t('actions.counter')} onClick={() => setAction('counterDeadline')} />
                    <DeadlineActionButton label={t('actions.agree')} onClick={() => setAction('agreeDeadline')} />
                    <DeadlineActionButton
                      label={t('actions.escalateDeadline')}
                      onClick={() => setAction('rejectDeadline')}
                      destructive
                    />
                  </>
                )}
                {canWithdraw && (
                  <DeadlineActionButton label={t('actions.withdraw')} onClick={() => setAction('withdrawDeadline')} />
                )}
                {canFinalize && (
                  <DeadlineActionButton label={t('actions.finalize')} onClick={() => setAction('finalizeDeadline')} />
                )}
              </div>
            </div>
          ) : (
            <p className='mt-4 text-xs text-muted-foreground'>{t('operations.deadlineSelectRequest')}</p>
          )}
        </div>
      </section>

      {action && (
        <DeadlineActionDialog
          action={action}
          chapterId={focusChapterId}
          request={selectedRequest}
          isSubmitting={fetcher.state !== 'idle'}
          onClose={() => setAction(null)}
        >
          <fetcher.Form method='post' className='grid gap-4'>
            <input type='hidden' name='intent' value={action} />
            <input type='hidden' name='chapterId' value={focusChapterId} />
            <input type='hidden' name='requestId' value={selectedRequest?.id ?? ''} />
            {(action === 'createDeadline' || action === 'counterDeadline') && (
              <label className='grid gap-1.5 text-xs font-bold'>
                {t('operations.deadlineProposed')}
                <input
                  name='deadline'
                  type='datetime-local'
                  min={localDateTimeMinimum()}
                  className={operationInput}
                  required
                />
              </label>
            )}
            {(action === 'createDeadline' || action === 'counterDeadline' || action === 'rejectDeadline') && (
              <label className='grid gap-1.5 text-xs font-bold'>
                {t('operations.reason')}
                <textarea
                  name='reason'
                  rows={4}
                  maxLength={1000}
                  className='w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground'
                  required
                />
              </label>
            )}
            <button
              type='submit'
              disabled={fetcher.state !== 'idle'}
              className='inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-50'
            >
              {fetcher.state !== 'idle' && <Loader2 className='size-4 animate-spin' aria-hidden='true' />}
              {t(`actions.${action}`)}
            </button>
            <OperationFeedback data={fetcher.data} />
          </fetcher.Form>
        </DeadlineActionDialog>
      )}
    </OperationsLayout>
  )
}

function DeadlineActionDialog({
  action,
  request,
  isSubmitting,
  onClose,
  children
}: {
  action: DeadlineAction
  chapterId: string
  request: DeadlineRequestResDtoOutput | null
  isSubmitting: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation('editor')
  const isFinalize = action === 'finalizeDeadline'
  const isEscalate = action === 'rejectDeadline'
  return (
    <Dialog
      compact
      open
      onClose={onClose}
      titleId='editor-deadline-action-title'
      title={t(`operations.deadlineDialogs.${action}.title`)}
      description={t(`operations.deadlineDialogs.${action}.description`)}
      size='sm'
    >
      {(isFinalize || isEscalate) && (
        <p className='mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300'>
          {isFinalize
            ? request?.affectsSlot
              ? t('operations.deadlineFinalizeBoardWarning')
              : t('operations.deadlineFinalizeDirectWarning')
            : t('operations.deadlineEscalateWarning')}
        </p>
      )}
      <fieldset disabled={isSubmitting}>{children}</fieldset>
    </Dialog>
  )
}

function DeadlineActionButton({
  label,
  onClick,
  destructive = false
}: {
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`h-9 rounded-md border px-3 text-xs font-bold ${
        destructive
          ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
          : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
      }`}
    >
      {label}
    </button>
  )
}

function DeadlineDetail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className='rounded-lg border border-border p-3'>
      <dt className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
        <Icon className='size-3.5' aria-hidden='true' />
        {label}
      </dt>
      <dd className='mt-1 text-xs font-bold text-foreground'>{value}</dd>
    </div>
  )
}

function formatDate(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString()
}

function localDateTimeMinimum() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
