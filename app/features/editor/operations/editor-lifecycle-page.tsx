import { useState } from 'react'
import { History, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

import type { BoardDecisionListItemDtoOutput } from '~/api/model/board'
import type { DefenseDashboardResDtoOutput } from '~/api/model/tankobon'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { SeriesResDtoOutput } from '~/api/model/series'
import { BoardStatus } from '../board/components/board-shared'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorLifecyclePage({
  series,
  focusSeries,
  defense,
  focusSeriesId,
  sourceDecisionId,
  sourceDecision,
  decisionHistory,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  focusSeries: SeriesResDtoOutput | null
  defense: DefenseDashboardResDtoOutput | null
  focusSeriesId: string
  sourceDecisionId: string
  sourceDecision: BoardDecisionListItemDtoOutput | null
  decisionHistory: BoardDecisionListItemDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [requestedAction, setRequestedAction] = useState<LifecycleAction | ''>('')
  const selectedSeries = series.find((item) => item.id === focusSeriesId)
  const selectedSeriesId = selectedSeries?.id ?? ''
  const availableActions = getAvailableLifecycleActions(selectedSeries?.status)
  const selectedAction =
    availableActions.length === 0
      ? ''
      : availableActions.includes(requestedAction as LifecycleAction)
        ? (requestedAction as LifecycleAction)
        : getPreferredLifecycleAction(sourceDecision?.decisionType, availableActions)
  const latest = defense?.rankingTrend.at(-1)
  const orderedHistory = [...decisionHistory].sort(
    (left, right) =>
      new Date(right.decidedAt ?? right.createdAt ?? 0).getTime() -
      new Date(left.decidedAt ?? left.createdAt ?? 0).getTime()
  )
  const lifecycleDecisionTypes = new Set([
    'SERIALIZATION',
    'CONTINUE',
    'CANCEL',
    'HIATUS',
    'ENDING_ALLOWANCE',
    'CANCELLATION',
    'FORMAT_CHANGE',
    'COMPLETION'
  ])
  const lifecycleHistory = orderedHistory.filter((decision) => lifecycleDecisionTypes.has(decision.decisionType ?? ''))

  return (
    <OperationsLayout
      titleKey='operations.lifecycle'
      descriptionKey='operations.descriptions.lifecycle'
      hasError={hasError}
    >
      <section className='rounded-xl border border-border bg-card p-5 shadow-sm'>
        <form method='get' className='grid gap-3 sm:grid-cols-[1fr_auto]'>
          <SeriesSelect series={series} defaultValue={focusSeriesId} required={false} />
          <button className='rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('actions.load')}
          </button>
        </form>
        {focusSeriesId && selectedSeries && (
          <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <Metric
              label={t('operations.lifecycleCurrentStatus')}
              value={t(`filters.seriesStatuses.${selectedSeries.status}`, { defaultValue: selectedSeries.status })}
            />
            {defense && (
              <>
                <Metric label={t('operations.publishedChapters')} value={defense.serialization.chaptersPublished} />
                <Metric label={t('operations.totalUnitsSold')} value={defense.tankobon.totalUnitsSold} />
                <Metric label={t('operations.latestRank')} value={latest?.rankPosition ?? '—'} />
                <Metric
                  label={t('operations.riskLevel')}
                  value={latest?.riskLevel ? t(`operations.riskLevels.${latest.riskLevel}`) : '—'}
                />
              </>
            )}
          </div>
        )}
      </section>
      <OperationDialogPanel icon={RefreshCcw} title={t('operations.lifecycle')} defaultOpen={Boolean(sourceDecisionId)}>
        {sourceDecisionId && (
          <div className='mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className='text-xs leading-5 text-muted-foreground'>{t('operations.lifecycleApprovedHint')}</p>
                {sourceDecision?.decisionType && (
                  <p className='mt-1 text-xs font-bold text-foreground'>
                    {t(`board.decisionTypeLabels.${sourceDecision.decisionType}`)}
                  </p>
                )}
              </div>
              <div className='flex flex-wrap gap-3'>
                <Link
                  to={`/dashboard/editor/board/decisions/${sourceDecisionId}`}
                  className='text-xs font-bold text-primary hover:underline'
                >
                  {t('operations.viewSourceDecision')}
                </Link>
              </div>
            </div>
          </div>
        )}
        <div className='grid gap-4'>
          {availableActions.length > 0 && selectedAction ? (
            <>
              <label className='grid gap-1.5 text-xs font-semibold'>
                {t('operations.selectLifecycleAction')}
                <select
                  className={operationInput}
                  value={selectedAction}
                  onChange={(event) => setRequestedAction(event.target.value as LifecycleAction)}
                >
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {getLifecycleActionLabel(action, t)}
                    </option>
                  ))}
                </select>
              </label>
              <fetcher.Form method='post' className='grid gap-3'>
                <input type='hidden' name='seriesId' value={selectedSeriesId} />
                {(selectedAction === 'hiatus' || selectedAction === 'proposeCompletion') && (
                  <input
                    name='reason'
                    required
                    maxLength={1000}
                    className={operationInput}
                    placeholder={t('operations.reason')}
                  />
                )}
                {selectedAction === 'hiatus' && (
                  <label className='grid gap-1.5 text-xs font-semibold'>
                    {t('operations.expectedReturnDate')}
                    <input name='expectedReturnDate' type='datetime-local' className={operationInput} />
                  </label>
                )}
                {selectedAction === 'proposeCompletion' && (
                  <input
                    name='proposedEndingChapters'
                    type='number'
                    min={1}
                    className={operationInput}
                    placeholder={t('operations.endingChapters')}
                  />
                )}
                <OperationAction
                  intent={selectedAction}
                  label={getLifecycleActionLabel(selectedAction, t)}
                  destructive={selectedAction === 'forceCancel'}
                />
              </fetcher.Form>
            </>
          ) : (
            <p className='text-xs text-muted-foreground'>{t('operations.noLifecycleActions')}</p>
          )}
        </div>
        <OperationFeedback data={fetcher.data} />
      </OperationDialogPanel>
      <OperationPanel icon={History} title={t('operations.lifecycleHistory')}>
        {focusSeriesId ? (
          <div className='space-y-3'>
            {focusSeries?.completionProposal && (
              <div className='rounded-lg border border-primary/20 bg-primary/5 p-3'>
                <p className='text-xs font-bold text-foreground'>{t('operations.completionProposalRecorded')}</p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  {formatHistoryDate(focusSeries.completionProposal.proposedAt)}
                </p>
                <p className='mt-2 whitespace-pre-wrap text-xs text-muted-foreground'>
                  {focusSeries.completionProposal.reason}
                </p>
              </div>
            )}
            {lifecycleHistory.map((decision) => (
              <Link
                key={decision.id}
                to={`/dashboard/editor/board/decisions/${decision.id}`}
                className='block rounded-lg border border-border p-3 transition-colors hover:border-primary'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs font-bold text-foreground'>
                      {decision.decisionType
                        ? t(`board.decisionTypeLabels.${decision.decisionType}`)
                        : t('board.decisionType')}
                    </p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {formatHistoryDate(decision.decidedAt ?? decision.createdAt)}
                    </p>
                  </div>
                  <BoardStatus value={decision.result ?? 'PENDING'} />
                </div>
              </Link>
            ))}
            {focusSeries && (
              <div className='rounded-lg border border-border p-3'>
                <p className='text-xs font-bold text-foreground'>{t('operations.seriesCreated')}</p>
                <p className='mt-1 text-xs text-muted-foreground'>{formatHistoryDate(focusSeries.createdAt)}</p>
              </div>
            )}
            {!lifecycleHistory.length && !focusSeries?.completionProposal && !focusSeries && (
              <p className='text-xs text-muted-foreground'>{t('operations.lifecycleHistoryEmpty')}</p>
            )}
          </div>
        ) : (
          <p className='text-xs text-muted-foreground'>{t('operations.lifecycleHistorySelectSeries')}</p>
        )}
      </OperationPanel>
    </OperationsLayout>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className='rounded-lg bg-muted p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}

type LifecycleAction = 'hiatus' | 'resumeSeries' | 'proposeCompletion' | 'finalizeEnding' | 'forceCancel'

function getAvailableLifecycleActions(status?: string): LifecycleAction[] {
  const actions: LifecycleAction[] = []

  if (status === 'SERIALIZED') actions.push('hiatus', 'proposeCompletion')
  if (status === 'HIATUS') actions.push('resumeSeries', 'proposeCompletion')
  if (status === 'COMPLETING') actions.push('finalizeEnding')
  if (status === 'CANCELLING') actions.push('finalizeEnding', 'forceCancel')

  return actions
}

function getPreferredLifecycleAction(
  decisionType: string | null | undefined,
  actions: LifecycleAction[]
): LifecycleAction {
  const preferredByDecision: Partial<Record<string, LifecycleAction>> = {
    CONTINUE: 'resumeSeries',
    HIATUS: 'hiatus',
    COMPLETION: 'finalizeEnding',
    CANCELLATION: 'finalizeEnding',
    CANCEL: 'forceCancel',
    ENDING_ALLOWANCE: 'finalizeEnding'
  }
  const preferred = decisionType ? preferredByDecision[decisionType] : undefined
  return preferred && actions.includes(preferred) ? preferred : actions[0]
}

function getLifecycleActionLabel(action: LifecycleAction, t: ReturnType<typeof useTranslation<'editor'>>['t']) {
  return t(`actions.${action}`)
}

function formatHistoryDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}
