import { useMemo, useState } from 'react'
import { Form, Link } from 'react-router'
import {
  BarChart3,
  Check,
  CheckCheck,
  Circle,
  FileInput,
  Info,
  ListChecks,
  Search,
  Settings2,
  ShieldCheck,
  Vote
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PublicSeriesListResDtoOutputItemsItem } from '~/api/model/public'
import type {
  RankingRecordListResDtoOutputItemsItem,
  ReaderVoteListItemDtoOutput,
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
  eligibleSeriesCandidates,
  surveys,
  selectedSurvey,
  selectedSurveyId,
  votes,
  surveyData,
  rankings,
  hasError,
  backPath = '/dashboard/editor/operations',
  configPath,
  adminMode = false
}: {
  series: PublicSeriesListResDtoOutputItemsItem[]
  eligibleSeriesCandidates: PublicSeriesListResDtoOutputItemsItem[]
  surveys: SurveyPeriodResDtoOutput[]
  selectedSurvey: SurveyPeriodResDtoOutput | null
  selectedSurveyId: string
  votes: ReaderVoteListItemDtoOutput[]
  surveyData: SurveyDataResDtoOutput[]
  rankings: RankingRecordListResDtoOutputItemsItem[]
  hasError: boolean
  backPath?: string
  configPath?: string
  adminMode?: boolean
}) {
  const { t, i18n } = useTranslation('editor')
  const { t: tAdmin } = useTranslation('admin')
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
      {adminMode && (
        <section className='overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 shadow-sm'>
          <div className='grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
            <div className='flex items-start gap-4'>
              <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
                <ShieldCheck className='size-5' />
              </div>
              <div>
                <p className='text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary'>
                  {tAdmin('surveyWorkspace.eyebrow')}
                </p>
                <h2 className='mt-1 text-base font-bold text-foreground'>{tAdmin('surveyWorkspace.title')}</h2>
                <p className='mt-1 max-w-3xl text-xs leading-6 text-muted-foreground'>
                  {tAdmin('surveyWorkspace.description')}
                </p>
              </div>
            </div>
            <div className='grid gap-2 sm:grid-cols-3 lg:w-[30rem]'>
              {(['scope', 'authority', 'finalization'] as const).map((item, index) => (
                <div key={item} className='rounded-xl border border-border bg-card p-3'>
                  <p className='text-[10px] font-extrabold uppercase tracking-wider text-primary'>
                    {tAdmin('surveyWorkspace.step', { step: index + 1 })}
                  </p>
                  <p className='mt-1 text-xs font-bold text-foreground'>{tAdmin(`surveyWorkspace.${item}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className='rounded-xl border border-border bg-card p-4 shadow-sm'>
        <div className='mb-4 flex items-start gap-3 border-b border-border pb-4'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <ListChecks className='size-4' />
          </div>
          <div>
            <h2 className='text-sm font-bold text-foreground'>{t('operations.surveySelectorTitle')}</h2>
            <p className='mt-1 text-xs leading-5 text-muted-foreground'>{t('operations.surveySelectorDescription')}</p>
          </div>
        </div>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
          <Form
            method='get'
            replace
            preventScrollReset
            className='grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]'
          >
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
            <button className='mt-auto h-10 shrink-0 rounded-md border border-border px-4 text-xs font-bold text-foreground hover:border-primary hover:text-primary'>
              {t('operations.loadSurvey')}
            </button>
          </Form>

          <div className='flex flex-wrap gap-2'>
            {configPath && (
              <Link
                to={configPath}
                className='inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-xs font-bold text-foreground hover:border-primary hover:text-primary'
              >
                <Settings2 className='size-4' />
                {t('operations.votingConfiguration')}
              </Link>
            )}
            {adminMode && (
              <OperationDialogPanel
                icon={BarChart3}
                title={t('operations.createSurveySection')}
                compact
                size='xl'
                className='max-w-3xl'
              >
                <CreateSurveyForm fetcher={fetcher} series={eligibleSeriesCandidates} surveys={surveys} />
                <OperationFeedback data={fetcher.data} />
              </OperationDialogPanel>
            )}
          </div>
        </div>
      </section>

      {selectedSurvey && <SurveyWorkflow status={selectedSurvey.status} />}

      <div className={`grid gap-5 ${adminMode ? 'xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start' : ''}`}>
        <div className='min-w-0'>
          {selectedSurvey ? (
            <OperationPanel icon={BarChart3} title={t('operations.surveyDetail')}>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <SurveyMetric label={t('operations.issue')} value={`#${selectedSurvey.issueNumber ?? '—'}`} />
                <SurveyMetric label={t('operations.magazine')} value={selectedSurvey.magazine ?? '—'} />
                <SurveyMetric
                  label={t('operations.publicationType')}
                  value={
                    selectedSurvey.publicationType
                      ? t(`operations.publicationTypes.${selectedSurvey.publicationType}`)
                      : '—'
                  }
                />
                <SurveyMetric
                  label={t('operations.eligibleSeries')}
                  value={String(selectedSurvey.eligibleSeriesIds.length)}
                />
                <SurveyMetric
                  label={t('operations.status')}
                  value={t(`operations.surveyStatuses.${selectedSurvey.status}`)}
                />
                <SurveyMetric
                  label={t('operations.startDate')}
                  value={formatDate(selectedSurvey.startDate, i18n.language)}
                />
                <SurveyMetric
                  label={t('operations.endDate')}
                  value={formatDate(selectedSurvey.endDate, i18n.language)}
                />
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
        </div>

        {adminMode && (
          <aside className='space-y-3 xl:sticky xl:top-4 xl:self-start'>
            <OperationDialogPanel icon={ListChecks} title={t('operations.surveyStatusSection')} compact>
              <fetcher.Form method='post' className='grid gap-3'>
                <input type='hidden' name='surveyId' value={selectedSurveyId} />
                {selectedSurvey?.status === 'DRAFT' && (
                  <>
                    <p className='text-xs text-muted-foreground'>{t('operations.openSurveyConfirmation')}</p>
                    <input type='hidden' name='status' value='OPEN' />
                    <OperationAction intent='surveyStatus' label={t('actions.openSurvey')} />
                  </>
                )}
                {selectedSurvey?.status === 'OPEN' && (
                  <>
                    <p className='text-xs text-muted-foreground'>{t('operations.closeSurveyConfirmation')}</p>
                    <input type='hidden' name='status' value='CLOSED' />
                    <OperationAction intent='surveyStatus' label={t('actions.closeSurvey')} />
                  </>
                )}
                {selectedSurvey?.status === 'CLOSED' && (
                  <>
                    <p className='text-xs text-muted-foreground'>
                      {t('operations.finalizeSurveyConfirmation', { online: votes.length, offline: offlineVotes })}
                    </p>
                    <OperationAction intent='finalizeRanking' label={t('actions.finalizeRanking')} />
                  </>
                )}
                {selectedSurvey?.status === 'REFLECTED' && (
                  <p className='rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground'>
                    {t('operations.surveyReflectedNotice')}
                  </p>
                )}
                {!selectedSurvey && <p className='text-xs text-muted-foreground'>{t('operations.surveyEmpty')}</p>}
              </fetcher.Form>
              <OperationFeedback data={fetcher.data} />
            </OperationDialogPanel>

            {selectedSurvey?.status === 'CLOSED' && (
              <OperationDialogPanel icon={FileInput} title={t('operations.offlineVoteEntries')} compact>
                <fetcher.Form method='post' className='grid gap-3'>
                  <input type='hidden' name='surveyId' value={selectedSurveyId} />
                  {rows.map((row, index) => (
                    <div key={row} className='grid gap-2 sm:grid-cols-[1fr_8rem_auto]'>
                      <SurveySeriesSelect
                        eligibleSeriesIds={selectedSurvey.eligibleSeriesIds}
                        seriesTitles={seriesTitles}
                      />
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
                        className='h-10 rounded-md border border-border px-3 text-xs disabled:opacity-50'
                      >
                        {t('actions.remove')}
                      </button>
                    </div>
                  ))}
                  <button
                    type='button'
                    onClick={() => setRows((current) => [...current, Math.max(...current) + 1])}
                    className='h-9 rounded-md border border-dashed border-border text-xs font-bold'
                  >
                    {t('actions.addVoteRow')}
                  </button>
                  <OperationAction intent='importVotes' label={t('actions.importVotes')} />
                </fetcher.Form>
                <OperationFeedback data={fetcher.data} />
              </OperationDialogPanel>
            )}
          </aside>
        )}
      </div>
    </OperationsLayout>
  )
}

type SurveyPublicationType = 'WEEKLY' | 'MONTHLY' | 'IRREGULAR'
type SurveySeriesFilter = 'ALL' | 'INHERITED' | 'NEW' | 'SELECTED'

function CreateSurveyForm({
  fetcher,
  series,
  surveys
}: {
  fetcher: ReturnType<typeof useOperationFetcher>
  series: PublicSeriesListResDtoOutputItemsItem[]
  surveys: SurveyPeriodResDtoOutput[]
}) {
  const { t } = useTranslation('editor')
  const [magazine, setMagazine] = useState('')
  const [publicationType, setPublicationType] = useState<SurveyPublicationType | ''>('')
  const [issueNumber, setIssueNumber] = useState('')
  const [seriesQuery, setSeriesQuery] = useState('')
  const [seriesFilter, setSeriesFilter] = useState<SurveySeriesFilter>('ALL')
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() })

  const magazines = useMemo(
    () =>
      [...new Set(series.map((item) => item.magazine?.trim()).filter((value): value is string => Boolean(value)))].sort(
        (left, right) => left.localeCompare(right)
      ),
    [series]
  )
  const availablePublicationTypes = useMemo(
    () =>
      (['WEEKLY', 'MONTHLY', 'IRREGULAR'] as const).filter((value) =>
        series.some((item) => item.magazine === magazine && item.publicationType === value)
      ),
    [magazine, series]
  )
  const scopedSeries = useMemo(
    () =>
      series
        .filter(
          (item) =>
            item.status === 'SERIALIZED' && item.magazine === magazine && item.publicationType === publicationType
        )
        .sort((left, right) => left.title.localeCompare(right.title)),
    [magazine, publicationType, series]
  )
  const scopeSurveys = useMemo(
    () => surveys.filter((survey) => survey.magazine === magazine && survey.publicationType === publicationType),
    [magazine, publicationType, surveys]
  )
  const suggestedIssueNumber = nextIssueNumber(scopeSurveys)
  const issue = Number(issueNumber)
  const previousSurvey = useMemo(
    () =>
      scopeSurveys
        .filter((survey) => !Number.isInteger(issue) || issue <= 0 || (survey.issueNumber ?? 0) < issue)
        .sort(
          (left, right) =>
            (right.issueNumber ?? 0) - (left.issueNumber ?? 0) ||
            new Date(right.startDate).getTime() - new Date(left.startDate).getTime()
        )[0],
    [issue, scopeSurveys]
  )
  const inheritedIds = useMemo(() => {
    const previousIds = new Set(previousSurvey?.eligibleSeriesIds ?? [])
    return scopedSeries.filter((item) => previousIds.has(item.id)).map((item) => item.id)
  }, [previousSurvey?.eligibleSeriesIds, scopedSeries])
  const inheritedKey = inheritedIds.join('|')
  const selectionKey = `${magazine}|${publicationType}|${previousSurvey?.id ?? ''}|${inheritedKey}`
  const selectedIds = selection.key === selectionKey ? selection.ids : new Set(inheritedIds)

  const previousIds = new Set(previousSurvey?.eligibleSeriesIds ?? [])
  const scopedIds = new Set(scopedSeries.map((item) => item.id))
  const removedCount = [...previousIds].filter((id) => !scopedIds.has(id)).length
  const newCount = scopedSeries.filter((item) => !previousIds.has(item.id)).length
  const duplicateScope = scopeSurveys.some((survey) => survey.issueNumber === issue)
  const nonSequentialIssue =
    magazine &&
    publicationType &&
    Number.isInteger(issue) &&
    issue > 0 &&
    scopeSurveys.length > 0 &&
    issue !== suggestedIssueNumber
  const filteredSeries = scopedSeries.filter((item) => {
    if (seriesQuery && !item.title.toLocaleLowerCase().includes(seriesQuery.toLocaleLowerCase())) return false
    if (seriesFilter === 'INHERITED' && !previousIds.has(item.id)) return false
    if (seriesFilter === 'NEW' && previousIds.has(item.id)) return false
    if (seriesFilter === 'SELECTED' && !selectedIds.has(item.id)) return false
    return true
  })
  const visibleIds = filteredSeries.map((item) => item.id)
  const canSubmit =
    magazine && publicationType && Number.isInteger(issue) && issue > 0 && selectedIds.size > 0 && !duplicateScope

  return (
    <div className='min-w-0 overflow-x-hidden'>
      <div className='mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3'>
        <Info className='mt-0.5 size-4 shrink-0 text-primary' />
        <p className='text-xs leading-5 text-muted-foreground'>{t('operations.createSurveyHelp')}</p>
      </div>
      <fetcher.Form method='post' className='grid min-w-0 gap-4 sm:grid-cols-2'>
        <div className='sm:col-span-2'>
          <p className='text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary'>
            {t('operations.createSurveyScopeStep')}
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>{t('operations.createSurveyScopeHelp')}</p>
        </div>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          {t('operations.magazine')}
          <select
            name='magazine'
            value={magazine}
            onChange={(event) => {
              setMagazine(event.target.value)
              setPublicationType('')
              setIssueNumber('')
            }}
            required
            className={operationInput}
          >
            <option value=''>{t('operations.selectMagazine')}</option>
            {magazines.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          {t('operations.publicationType')}
          <select
            name='publicationType'
            value={publicationType}
            onChange={(event) => {
              const value = event.target.value as SurveyPublicationType | ''
              const nextIssue = value ? nextIssueNumberForScope(surveys, magazine, value) : 1
              setPublicationType(value)
              setIssueNumber(value ? String(nextIssue) : '')
            }}
            required
            disabled={!magazine}
            className={operationInput}
          >
            <option value=''>{t('operations.selectPublicationType')}</option>
            {availablePublicationTypes.map((value) => (
              <option key={value} value={value}>
                {t(`operations.publicationTypes.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          <span className='flex items-center justify-between gap-2'>
            {t('operations.issue')}
            {magazine && publicationType && (
              <span className='font-normal text-muted-foreground'>
                {t('operations.suggestedIssue', { issue: suggestedIssueNumber })}
              </span>
            )}
          </span>
          <input
            name='issueNumber'
            type='number'
            min={1}
            value={issueNumber}
            onChange={(event) => setIssueNumber(event.target.value)}
            required
            className={operationInput}
          />
          <span className='font-normal leading-5 text-muted-foreground'>{t('operations.issueHelp')}</span>
        </label>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          {t('operations.reflectedIssue')}
          <input
            name='reflectedIssueNumber'
            type='number'
            value={issueNumber}
            readOnly
            tabIndex={-1}
            className={`${operationInput} cursor-not-allowed bg-muted text-muted-foreground`}
          />
          <span className='font-normal leading-5 text-muted-foreground'>{t('operations.reflectedIssueHelp')}</span>
        </label>

        {nonSequentialIssue && !duplicateScope && (
          <p className='rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground sm:col-span-2'>
            {t('operations.nonSequentialIssueWarning', { issue: suggestedIssueNumber })}
          </p>
        )}
        {magazine && publicationType && (
          <div className='grid gap-2 rounded-xl border border-border bg-muted/30 p-3 text-xs sm:col-span-2 sm:grid-cols-4'>
            <ScopeMetric
              label={t('operations.previousSurvey')}
              value={previousSurvey?.issueNumber ? `#${previousSurvey.issueNumber}` : t('operations.noPreviousSurvey')}
            />
            <ScopeMetric label={t('operations.inheritedSeries')} value={String(inheritedIds.length)} />
            <ScopeMetric label={t('operations.newSeries')} value={String(newCount)} />
            <ScopeMetric label={t('operations.removedSeries')} value={String(removedCount)} />
          </div>
        )}

        {duplicateScope && (
          <p className='rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive sm:col-span-2'>
            {t('operations.duplicateSurveyScope')}
          </p>
        )}

        <div className='border-t border-border pt-1 sm:col-span-2'>
          <p className='mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary'>
            {t('operations.createSurveySeriesStep')}
          </p>
        </div>
        <fieldset className='grid min-w-0 gap-3 rounded-xl border border-border p-3 sm:col-span-2'>
          <legend className='px-1 text-xs font-bold text-foreground'>{t('operations.eligibleSeries')}</legend>
          <div className='flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between'>
            <p className='leading-5'>{t('operations.eligibleSeriesHelp')}</p>
            <strong className='shrink-0 text-foreground'>
              {t('operations.selectedSeriesCount', { count: selectedIds.size })}
            </strong>
          </div>
          <div className='grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1fr)_auto]'>
            <label className='relative min-w-0'>
              <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <input
                type='search'
                value={seriesQuery}
                onChange={(event) => setSeriesQuery(event.target.value)}
                placeholder={t('operations.searchEligibleSeries')}
                className={`${operationInput} pl-9`}
              />
            </label>
            <div className='flex min-w-0 flex-wrap gap-1.5'>
              {(['ALL', 'INHERITED', 'NEW', 'SELECTED'] as const).map((value) => (
                <button
                  key={value}
                  type='button'
                  aria-pressed={seriesFilter === value}
                  onClick={() => setSeriesFilter(value)}
                  className={`rounded-full border px-3 py-2 text-[10px] font-bold ${
                    seriesFilter === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {t(`operations.seriesFilters.${value}`)}
                </button>
              ))}
            </div>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2'>
            <span className='text-[10px] text-muted-foreground'>
              {t('operations.filteredSeriesCount', { count: filteredSeries.length })}
            </span>
            <div className='flex flex-wrap gap-2'>
              <button
                type='button'
                disabled={visibleIds.length === 0}
                onClick={() => setSelection({ key: selectionKey, ids: new Set([...selectedIds, ...visibleIds]) })}
                className='inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-foreground hover:border-primary/40 disabled:opacity-50'
              >
                <CheckCheck className='size-3.5' />
                {t('operations.selectAllVisible')}
              </button>
              <button
                type='button'
                disabled={visibleIds.length === 0}
                onClick={() => {
                  const visible = new Set(visibleIds)
                  setSelection({
                    key: selectionKey,
                    ids: new Set([...selectedIds].filter((id) => !visible.has(id)))
                  })
                }}
                className='rounded-md border border-border bg-background px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50'
              >
                {t('operations.clearVisibleSelection')}
              </button>
            </div>
          </div>
          <div className='grid max-h-64 gap-2 overflow-y-auto pr-1'>
            {filteredSeries.map((item) => {
              const inherited = previousIds.has(item.id)
              return (
                <label
                  key={item.id}
                  className='flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:border-primary/40'
                >
                  <input
                    type='checkbox'
                    name='eligibleSeriesId'
                    value={item.id}
                    checked={selectedIds.has(item.id)}
                    onChange={(event) =>
                      setSelection(() => {
                        const next = new Set(selectedIds)
                        if (event.target.checked) next.add(item.id)
                        else next.delete(item.id)
                        return { key: selectionKey, ids: next }
                      })
                    }
                  />
                  <span className='min-w-0 flex-1 truncate font-semibold'>{item.title}</span>
                  <span className='rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary'>
                    {t(inherited ? 'operations.inheritedBadge' : 'operations.newBadge')}
                  </span>
                </label>
              )
            })}
            {magazine && publicationType && filteredSeries.length === 0 && (
              <p className='py-6 text-center text-xs text-muted-foreground'>
                {t(scopedSeries.length === 0 ? 'operations.noEligibleSeriesForScope' : 'operations.noFilteredSeries')}
              </p>
            )}
            {(!magazine || !publicationType) && (
              <p className='py-6 text-center text-xs text-muted-foreground'>{t('operations.selectScopeFirst')}</p>
            )}
          </div>
        </fieldset>
        <div className='border-t border-border pt-1 sm:col-span-2'>
          <p className='mt-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary'>
            {t('operations.createSurveyTimeStep')}
          </p>
        </div>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          {t('operations.startDate')}
          <input name='startDate' type='datetime-local' required className={operationInput} />
        </label>
        <label className='grid min-w-0 gap-1 text-xs font-bold text-foreground'>
          {t('operations.endDate')}
          <input name='endDate' type='datetime-local' required className={operationInput} />
        </label>
        <div className='sm:col-span-2'>
          <button
            name='intent'
            value='createSurvey'
            disabled={!canSubmit}
            className='inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {t('actions.createSurvey')}
          </button>
        </div>
      </fetcher.Form>
    </div>
  )
}

function ScopeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-[10px] font-bold uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='mt-1 font-bold text-foreground'>{value}</p>
    </div>
  )
}

function nextIssueNumber(surveys: SurveyPeriodResDtoOutput[]) {
  return Math.max(0, ...surveys.map((survey) => survey.issueNumber ?? 0)) + 1
}

function nextIssueNumberForScope(
  surveys: SurveyPeriodResDtoOutput[],
  magazine: string,
  publicationType: SurveyPublicationType
) {
  return nextIssueNumber(
    surveys.filter((survey) => survey.magazine === magazine && survey.publicationType === publicationType)
  )
}

function OnlineVotes({
  votes,
  seriesTitles,
  locale,
  flaggedVotes
}: {
  votes: ReaderVoteListItemDtoOutput[]
  seriesTitles: Record<string, string>
  locale: string
  flaggedVotes: number
}) {
  const { t } = useTranslation('editor')
  return (
    <div className='mt-5 overflow-x-auto'>
      <table className='w-full min-w-[700px] text-left text-xs'>
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

function SurveySeriesSelect({
  eligibleSeriesIds,
  seriesTitles
}: {
  eligibleSeriesIds: string[]
  seriesTitles: Record<string, string>
}) {
  const { t } = useTranslation('editor')
  return (
    <select name='voteSeriesId' required className={operationInput}>
      <option value=''>{t('operations.selectSeries')}</option>
      {eligibleSeriesIds.map((seriesId) => (
        <option key={seriesId} value={seriesId}>
          {seriesTitles[seriesId] ?? t('operations.unknownSeries')}
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
                className='flex justify-between rounded-md bg-muted p-3 text-xs'
              >
                <span>
                  {entry.seriesId
                    ? (seriesTitles[entry.seriesId] ?? t('operations.unknownSeries'))
                    : t('common.notAvailable')}
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
          className='grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-lg border border-border p-3 text-xs'
        >
          <strong>#{item.rankPosition ?? '—'}</strong>
          <div>
            <p className='font-bold'>{seriesTitles[item.seriesId] ?? t('operations.unknownSeries')}</p>
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
        <EmptySurveyData text={reflected ? t('operations.emptyRanking') : t('operations.emptyProvisionalRanking')} />
      )}
    </div>
  )
}

function buildProvisionalRankings(
  votes: ReaderVoteListItemDtoOutput[],
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
                <span className='block truncate text-xs font-bold'>{t(`operations.surveyStatuses.${step}`)}</span>
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
  const scope = [survey.magazine, survey.publicationType].filter(Boolean).join(' · ')
  const start = formatShortDate(survey.startDate, locale)
  const end = formatShortDate(survey.endDate, locale)
  const range = start && end ? `${start} → ${end}` : start || end
  return [scope, issue, statusLabel, range].filter(Boolean).join(' · ')
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
      <span className='min-w-0 flex-1 text-xs font-bold'>{label}</span>
      <strong>{value}</strong>
    </button>
  )
}

function EmptySurveyData({ text }: { text: string }) {
  return (
    <p className='rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground'>
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
