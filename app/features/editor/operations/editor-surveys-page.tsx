import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { SurveyPeriodResDtoOutput } from '~/api/model/survey'
import {
  OperationAction,
  OperationFeedback,
  OperationDialogPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorSurveysPage({
  series,
  surveys,
  hasError,
  focusSurveyId = '',
  backPath = '/dashboard/editor/operations'
}: {
  series: SeriesListResDtoOutputItemsItem[]
  surveys: SurveyPeriodResDtoOutput[]
  hasError: boolean
  focusSurveyId?: string
  backPath?: string
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [rows, setRows] = useState([0])
  const [selectedSurveyId, setSelectedSurveyId] = useState(
    surveys.some((survey) => survey.id === focusSurveyId) ? focusSurveyId : (surveys[0]?.id ?? '')
  )
  const selectedSurvey = surveys.find((survey) => survey.id === selectedSurveyId)

  return (
    <OperationsLayout
      titleKey='operations.surveys'
      descriptionKey='operations.descriptions.surveys'
      hasError={hasError}
      backPath={backPath}
    >
      <OperationDialogPanel icon={BarChart3} title={t('operations.createSurveySection')}>
        <fetcher.Form method='post' className='grid gap-3 sm:grid-cols-2'>
          <input
            name='issueNumber'
            type='number'
            min={1}
            required
            className={operationInput}
            placeholder={t('operations.issue')}
          />
          <input
            name='reflectedIssueNumber'
            type='number'
            min={1}
            className={operationInput}
            placeholder={t('operations.reflectedIssue')}
          />
          <input name='startDate' type='datetime-local' required className={operationInput} />
          <input name='endDate' type='datetime-local' required className={operationInput} />
          <div className='sm:col-span-2'>
            <OperationAction intent='createSurvey' label={t('actions.createSurvey')} />
          </div>
        </fetcher.Form>
      </OperationDialogPanel>

      <OperationDialogPanel icon={BarChart3} title={t('operations.surveyStatusSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SurveySelect items={surveys} value={selectedSurveyId} onChange={setSelectedSurveyId} />
          {selectedSurvey?.status === 'DRAFT' && (
            <>
              <input type='hidden' name='status' value='OPEN' />
              <OperationAction intent='surveyStatus' label={t('actions.openSurvey')} />
            </>
          )}
          {selectedSurvey?.status === 'OPEN' && (
            <>
              <input type='hidden' name='status' value='CLOSED' />
              <OperationAction intent='surveyStatus' label={t('actions.closeSurvey')} />
            </>
          )}
          {selectedSurvey?.status === 'CLOSED' && (
            <OperationAction intent='finalizeRanking' label={t('actions.finalizeRanking')} />
          )}
          {selectedSurvey?.status === 'REFLECTED' && (
            <p className='rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
              {t('operations.surveyReflectedNotice')}
            </p>
          )}
          {!selectedSurvey && <p className='text-sm text-muted-foreground'>{t('operations.surveyEmpty')}</p>}
        </fetcher.Form>
      </OperationDialogPanel>

      {selectedSurvey?.status === 'CLOSED' && (
        <OperationDialogPanel icon={BarChart3} title={t('operations.offlineVoteEntries')}>
          <fetcher.Form method='post' className='grid gap-3'>
            <input type='hidden' name='surveyId' value={selectedSurveyId} />
            {rows.map((row, index) => (
              <div key={row} className='grid grid-cols-[1fr_8rem_auto] gap-2'>
                <SeriesSelect series={series} name='voteSeriesId' />
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
                  className='rounded-md border border-border px-3 text-sm'
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
    </OperationsLayout>
  )
}

function SurveySelect({
  items,
  value,
  onChange
}: {
  items: SurveyPeriodResDtoOutput[]
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation('editor')
  return (
    <select
      name='surveyId'
      required
      className={operationInput}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value='' disabled>
        {t('operations.selectSurvey')}
      </option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          #{item.issueNumber} · {t(`operations.surveyStatuses.${item.status}`, { defaultValue: item.status })}
        </option>
      ))}
    </select>
  )
}
