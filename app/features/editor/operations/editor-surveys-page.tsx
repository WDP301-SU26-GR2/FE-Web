import { useMemo, useState } from 'react'
import { Form, Link } from 'react-router'
import { BarChart3, Check, Circle, FileInput, ListChecks, Settings2, Vote } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import type {
  RankingRecordListResDtoOutputItemsItem,
  ReaderVoteResDtoOutput,
  SurveyDataResDtoOutput,
  SurveyPeriodResDtoOutput
} from '~/api/model/survey'
import {
  OperationAction,
  OperationDialogPanel,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

type SurveyDataTab = 'online' | 'offline' | 'ranking'
type SurveyRankingDisplayItem = {
  seriesId: string
  rankPosition: number | null
  voteCount: number
  isReliable: boolean
  riskLevel: string | null
}

export function EditorSurveysPage({
  series,
  surveys,
  selectedSurvey,
  selectedSurveyId,
  votes,
  surveyData,
  rankings,
  hasError,
  backPath = '/dashboard/editor/operations',
  configPath
}: {
  series: PublicSeriesListResDtoOutputItemsItem[]
  surveys: SurveyPeriodResDtoOutput[]
  selectedSurvey: SurveyPeriodResDtoOutput | null
  selectedSurveyId: string
  votes: ReaderVoteResDtoOutput[]
  surveyData: SurveyDataResDtoOutput[]
  rankings: RankingRecordListResDtoOutputItemsItem[]
  hasError: boolean
  backPath?: string
  configPath?: string
}) {
  const { t, i18n } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [rows, setRows] = useState([0])
  const [activeData, setActiveData] = useState<SurveyDataTab>('online')
  const seriesTitles = Object.fromEntries(series.map((item) => [item.id, item.title]))
  const offlineVotes = surveyData.reduce(
    (total, batch) => total + batch.entries.reduce((sum, entry) => sum + entry.voteCount, 0),
    0
  )
  const flaggedVotes = votes.filter((vote) => vote.isFlagged).length
  const displayRankings = useMemo(
    () =>
      selectedSurvey?.status === 'REFLECTED'
        ? normalizeOfficialRankings(rankings)
        : buildProvisionalRankings(votes, surveyData, flaggedVotes),
    [flaggedVotes, rankings, selectedSurvey?.status, surveyData, votes]
  )

  return (
    <OperationsLayout
      titleKey='operations.surveys'
      descriptionKey='operations.descriptions.surveys'
      hasError={hasError}
      backPath={backPath}
    >
      <section className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
          <Form method='get' className='grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'>
            <label className='grid gap-1 text-xs font-bold text-foreground'>
              {t('operations.selectSurvey')}
              <select name='surveyId' defaultValue={selectedSurveyId} className={operationInput}>
                <option value=''>{t('operations.selectSurvey')}</option>
                {surveys.map((item) => (
                  <option key={item.id} value={item.id}>
                    {surveyOptionLabel(item, i18n.language, t(`operations.surveyStatuses.${item.status}`))}
                  </option>
                ))}
              </select>
            </label>
            <button className='mt-auto h-10 shrink-0 rounded-md border border-border px-4 text-sm font-bold text-foreground hover:border-primary hover:text-primary'>
              {t('operations.loadSurvey')}
            </button>
          </Form>

          <div className='flex flex-wrap gap-2'>
            {configPath && (
              <Link
                to={configPath}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-bold text-foreground hover:border-primary hover:text-primary'
              >
                <Settings2 className='size-4' />
                {t('operations.votingConfiguration')}
              </Link>
            )}
            <OperationDialogPanel icon={BarChart3} title={t('operations.createSurveySection')} compact>
              <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
                <input
                  name='issueNumber'
                  type='number'
                  min={0}
                  className={operationInput}
                  placeholder={t('operations.issue')}
                />
                <input
                  name='reflectedIssueNumber'
                  type='number'
                  min={0}
                  className={operationInput}
                  placeholder={t('operations.reflectedIssue')}
                />
                <label className='grid gap-1 text-xs font-bold text-foreground'>
                  {t('operations.startDate')}
                  <input name='startDate' type='datetime-local' required className={operationInput} />
                </label>
                <label className='grid gap-1 text-xs font-bold text-foreground'>
                  {t('operations.endDate')}
                  <input name='endDate' type='datetime-local' required className={operationInput} />
                </label>
                <div className='sm:col-span-2'>
                  <OperationAction intent='createSurvey' label={t('actions.createSurvey')} />
                </div>
              </fetcher.Form>
              <OperationFeedback data={fetcher.data} />
            </OperationDialogPanel>
          </div>
        </div>
      </section>

      {selectedSurvey && <SurveyWorkflow status={selectedSurvey.status} />}

      <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]'>
        {selectedSurvey ? (
          <OperationPanel icon={BarChart3} title={t('operations.surveyDetail')}>
            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
              <SurveyMetric label={t('operations.issue')} value={`#${selectedSurvey.issueNumber ?? '—'}`} />
              <SurveyMetric
                label={t('operations.status')}
                value={t(`operations.surveyStatuses.${selectedSurvey.status}`)}
              />
              <SurveyMetric
                label={t('operations.startDate')}
                value={formatDate(selectedSurvey.startDate, i18n.language)}
              />
              <SurveyMetric label={t('operations.endDate')} value={formatDate(selectedSurvey.endDate, i18n.language)} />
              <SurveyMetric
                label={t('operations.reflectedIssue')}
                value={`#${selectedSurvey.reflectedIssueNumber ?? '—'}`}
              />
            </div>

            <div className='mt-5 grid gap-3 sm:grid-cols-3'>
              <DataTab
                active={activeData === 'online'}
                onClick={() => setActiveData('online')}
                icon={Vote}
                label={t('operations.onlineVotes')}
                value={votes.length}
              />
              <DataTab
                active={activeData === 'offline'}
                onClick={() => setActiveData('offline')}
                icon={FileInput}
                label={t('operations.offlineVotes')}
                value={offlineVotes}
              />
              <DataTab
                active={activeData === 'ranking'}
                onClick={() => setActiveData('ranking')}
                icon={BarChart3}
                label={t('operations.rankingResult')}
                value={displayRankings.length}
              />
            </div>

            {activeData === 'online' && (
              <OnlineVotes
                votes={votes}
                seriesTitles={seriesTitles}
                locale={i18n.language}
                flaggedVotes={flaggedVotes}
              />
            )}
            {activeData === 'offline' && (
              <OfflineVotes surveyData={surveyData} seriesTitles={seriesTitles} locale={i18n.language} />
            )}
            {activeData === 'ranking' && (
              <RankingResults
                rankings={displayRankings}
                seriesTitles={seriesTitles}
                reflected={selectedSurvey.status === 'REFLECTED'}
              />
            )}
          </OperationPanel>
        ) : (
          <EmptySurveyData text={t('operations.surveyEmpty')} />
        )}

        <aside className='space-y-3 xl:sticky xl:top-5'>
          <OperationDialogPanel icon={ListChecks} title={t('operations.surveyStatusSection')} compact>
            <fetcher.Form method='post' className='grid gap-3'>
              <input type='hidden' name='surveyId' value={selectedSurveyId} />
              {selectedSurvey?.status === 'DRAFT' && (
                <>
                  <p className='text-sm text-muted-foreground'>{t('operations.openSurveyConfirmation')}</p>
                  <input type='hidden' name='status' value='OPEN' />
                  <OperationAction intent='surveyStatus' label={t('actions.openSurvey')} />
                </>
              )}
              {selectedSurvey?.status === 'OPEN' && (
                <>
                  <p className='text-sm text-muted-foreground'>{t('operations.closeSurveyConfirmation')}</p>
                  <input type='hidden' name='status' value='CLOSED' />
                  <OperationAction intent='surveyStatus' label={t('actions.closeSurvey')} />
                </>
              )}
              {selectedSurvey?.status === 'CLOSED' && (
                <>
                  <p className='text-sm text-muted-foreground'>
                    {t('operations.finalizeSurveyConfirmation', { online: votes.length, offline: offlineVotes })}
                  </p>
                  <OperationAction intent='finalizeRanking' label={t('actions.finalizeRanking')} />
                </>
              )}
              {selectedSurvey?.status === 'REFLECTED' && (
                <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
                  {t('operations.surveyReflectedNotice')}
                </p>
              )}
              {!selectedSurvey && <p className='text-sm text-muted-foreground'>{t('operations.surveyEmpty')}</p>}
            </fetcher.Form>
            <OperationFeedback data={fetcher.data} />
          </OperationDialogPanel>

          {selectedSurvey?.status === 'CLOSED' && (
            <OperationDialogPanel icon={FileInput} title={t('operations.offlineVoteEntries')} compact>
              <fetcher.Form method='post' className='grid gap-3'>
                <input type='hidden' name='surveyId' value={selectedSurveyId} />
                {rows.map((row, index) => (
                  <div key={row} className='grid gap-2 sm:grid-cols-[1fr_8rem_auto]'>
                    <SurveySeriesSelect series={series} />
                    <input
                      name='voteCount'
                      type='number'
                      min={0}
                      required
                      className={operationInput}
                      placeholder={t('operations.voteCount')}
                    />
                    <button
                      type='button'
                      disabled={rows.length === 1}
                      onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                      className='h-10 rounded-md border border-border px-3 text-sm disabled:opacity-50'
                    >
                      {t('actions.remove')}
                    </button>
                  </div>
                ))}
                <button
                  type='button'
                  onClick={() => setRows((current) => [...current, Math.max(...current) + 1])}
                  className='h-9 rounded-md border border-dashed border-border text-sm font-bold'
                >
                  {t('actions.addVoteRow')}
                </button>
                <OperationAction intent='importVotes' label={t('actions.importVotes')} />
              </fetcher.Form>
              <OperationFeedback data={fetcher.data} />
            </OperationDialogPanel>
          )}
        </aside>
      </div>
    </OperationsLayout>
  )
}

function OnlineVotes({
  votes,
  seriesTitles,
  locale,
  flaggedVotes
}: {
  votes: ReaderVoteResDtoOutput[]
  seriesTitles: Record<string, string>
  locale: string
  flaggedVotes: number
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='mt-5 overflow-x-auto'>
      <table className='w-full min-w-[700px] text-left text-sm'>
        <thead className='border-b border-border text-xs uppercase text-muted-foreground'>
          <tr>
            <th className='p-3'>{t('operations.votedAt')}</th>
            <th className='p-3'>{t('operations.selectedSeries')}</th>
            <th className='p-3'>{t('operations.voteWeight')}</th>
            <th className='p-3'>{t('operations.voteCheck')}</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-border'>
          {votes.map((vote) => (
            <tr key={vote.id}>
              <td className='p-3'>{formatDate(vote.votedAt, locale)}</td>
              <td className='p-3'>{vote.seriesIds.map((id) => seriesTitles[id] ?? id).join(', ')}</td>
              <td className='p-3'>{vote.voteWeight}</td>
              <td className='p-3'>{vote.isFlagged ? t('operations.flaggedVote') : t('operations.validVote')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!votes.length && <EmptySurveyData text={t('operations.emptyOnlineVotes')} />}
      {flaggedVotes > 0 && (
        <p className='mt-3 text-xs font-bold text-amber-700'>
          {t('operations.flaggedVoteCount', { count: flaggedVotes })}
        </p>
      )}
    </div>
  )
}

function SurveySeriesSelect({ series }: { series: PublicSeriesListResDtoOutputItemsItem[] }) {
  const { t } = useTranslation('editor')
  const votableSeries = series.filter((item) => item.status === 'SERIALIZED')
  return (
    <select name='voteSeriesId' required className={operationInput}>
      <option value=''>{t('operations.selectSeries')}</option>
      {votableSeries.map((item) => (
        <option key={item.id} value={item.id}>
          {item.title}
        </option>
      ))}
    </select>
  )
}

function OfflineVotes({
  surveyData,
  seriesTitles,
  locale
}: {
  surveyData: SurveyDataResDtoOutput[]
  seriesTitles: Record<string, string>
  locale: string
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='mt-5 space-y-3'>
      {surveyData.map((batch) => (
        <article key={batch.id} className='rounded-lg border border-border p-4'>
          <p className='text-xs font-bold text-muted-foreground'>
            {t('operations.importedAt', { date: formatDate(batch.importedAt, locale) })}
          </p>
          <div className='mt-3 grid gap-2 sm:grid-cols-2'>
            {batch.entries.map((entry, index) => (
              <div
                key={`${entry.seriesId ?? 'unknown'}-${index}`}
                className='flex justify-between rounded-md bg-muted p-3 text-sm'
              >
                <span>
                  {entry.seriesId ? (seriesTitles[entry.seriesId] ?? entry.seriesId) : t('common.notAvailable')}
                </span>
                <strong>{entry.voteCount}</strong>
              </div>
            ))}
          </div>
        </article>
      ))}
      {!surveyData.length && <EmptySurveyData text={t('operations.emptyOfflineVotes')} />}
    </div>
  )
}

function RankingResults({
  rankings,
  seriesTitles,
  reflected
}: {
  rankings: SurveyRankingDisplayItem[]
  seriesTitles: Record<string, string>
  reflected: boolean
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='mt-5 space-y-2'>
      {rankings.map((item) => (
        <article
          key={item.seriesId}
          className='grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-lg border border-border p-3 text-sm'
        >
          <strong>#{item.rankPosition ?? '—'}</strong>
          <div>
            <p className='font-bold'>{seriesTitles[item.seriesId] ?? item.seriesId}</p>
            <p className='text-xs text-muted-foreground'>
              {item.isReliable ? t('operations.reliable') : t('operations.unreliable')}
            </p>
          </div>
          <div className='text-right'>
            <strong>{item.voteCount}</strong>
            <p className='text-xs text-muted-foreground'>
              {reflected
                ? t(`operations.riskLevels.${item.riskLevel ?? 'NONE'}`)
                : item.isReliable
                  ? t('operations.reliable')
                  : t('operations.unreliable')}
            </p>
          </div>
        </article>
      ))}
      {!reflected && rankings.length > 0 && (
        <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-800 dark:text-amber-200'>
          {t('operations.provisionalRankingNotice')}
        </p>
      )}
      {!rankings.length && (
        <EmptySurveyData
          text={reflected ? t('operations.emptyRanking') : t('operations.emptyProvisionalRanking')}
        />
      )}
    </div>
  )
}

function buildProvisionalRankings(
  votes: ReaderVoteResDtoOutput[],
  surveyData: SurveyDataResDtoOutput[],
  flaggedVotes: number
): SurveyRankingDisplayItem[] {
  const totals = new Map<string, number>()
  for (const vote of votes) {
    for (const seriesId of vote.seriesIds) {
      totals.set(seriesId, (totals.get(seriesId) ?? 0) + (vote.voteWeight ?? 1))
    }
  }
  for (const batch of surveyData) {
    for (const entry of batch.entries) {
      if (!entry.seriesId) continue
      totals.set(entry.seriesId, (totals.get(entry.seriesId) ?? 0) + entry.voteCount)
    }
  }
  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([seriesId, voteCount], index) => ({
      seriesId,
      rankPosition: index + 1,
      voteCount,
      isReliable: flaggedVotes === 0,
      riskLevel: 'NONE'
    }))
}

function normalizeOfficialRankings(rankings: RankingRecordListResDtoOutputItemsItem[]): SurveyRankingDisplayItem[] {
  return rankings.map((item) => ({
    seriesId: item.seriesId,
    rankPosition: item.rankPosition ?? null,
    voteCount: item.voteCount,
    isReliable: item.isReliable,
    riskLevel: item.riskLevel ?? null
  }))
}

function SurveyWorkflow({ status }: { status: SurveyPeriodResDtoOutput['status'] }) {
  const { t } = useTranslation('editor')
  const steps: SurveyPeriodResDtoOutput['status'][] = ['DRAFT', 'OPEN', 'CLOSED', 'REFLECTED']
  const currentIndex = steps.indexOf(status)

  return (
    <section className='rounded-xl border border-border bg-card p-4 shadow-sm'>
      <div className='mb-4'>
        <h2 className='font-bold text-foreground'>{t('operations.surveyWorkflow')}</h2>
        <p className='mt-1 text-xs text-muted-foreground'>{t('operations.surveyWorkflowDescription')}</p>
      </div>
      <ol className='grid gap-2 md:grid-cols-4'>
        {steps.map((step, index) => {
          const complete = index < currentIndex
          const current = index === currentIndex
          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                current
                  ? 'border-primary bg-primary/10 text-primary'
                  : complete
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : 'border-border text-muted-foreground'
              }`}
            >
              <span className='grid size-7 shrink-0 place-items-center rounded-full border border-current'>
                {complete ? (
                  <Check className='size-4' />
                ) : (
                  <Circle className={`size-3 ${current ? 'fill-current' : ''}`} />
                )}
              </span>
              <span className='min-w-0'>
                <span className='block text-[10px] font-bold uppercase tracking-wide'>
                  {t('operations.surveyWorkflowStep', { step: index + 1 })}
                </span>
                <span className='block truncate text-sm font-bold'>{t(`operations.surveyStatuses.${step}`)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function surveyOptionLabel(survey: SurveyPeriodResDtoOutput, locale: string, statusLabel: string) {
  const issue = `#${survey.issueNumber ?? '—'}`
  const start = formatShortDate(survey.startDate, locale)
  const end = formatShortDate(survey.endDate, locale)
  const range = start && end ? `${start} → ${end}` : start || end
  return range ? `${issue} · ${statusLabel} · ${range}` : `${issue} · ${statusLabel}`
}

function formatShortDate(value: string | null | undefined, locale: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function SurveyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg bg-muted p-3'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}

function DataTab({
  active,
  onClick,
  icon: Icon,
  label,
  value
}: {
  active: boolean
  onClick: () => void
  icon: typeof Vote
  label: string
  value: number
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left ${
        active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
      }`}
    >
      <Icon className='size-5' />
      <span className='min-w-0 flex-1 text-sm font-bold'>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

function EmptySurveyData({ text }: { text: string }) {
  return (
    <p className='rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground'>
      {text}
    </p>
  )
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
