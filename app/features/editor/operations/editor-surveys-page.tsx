import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SeriesListResDtoOutputItemsItem } from '~/api/model/series'
import type { SurveyPeriodResDtoOutput } from '~/api/model/survey'
import {
  OperationAction,
  OperationFeedback,
  OperationPanel,
  OperationsLayout,
  SeriesSelect,
  operationInput,
  useOperationFetcher
} from './components/operations-shared'

export function EditorSurveysPage({
  series,
  surveys,
  hasError
}: {
  series: SeriesListResDtoOutputItemsItem[]
  surveys: SurveyPeriodResDtoOutput[]
  hasError: boolean
}) {
  const { t } = useTranslation('editor')
  const fetcher = useOperationFetcher()
  const [rows, setRows] = useState([0])
  return (
    <OperationsLayout
      titleKey='operations.surveys'
      descriptionKey='operations.descriptions.surveys'
      hasError={hasError}
    >
      <OperationPanel icon={BarChart3} title={t('operations.createSurveySection')}>
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
      </OperationPanel>
      <OperationPanel icon={BarChart3} title={t('operations.surveyStatusSection')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SurveySelect items={surveys} />
          <select name='status' className={operationInput}>
            <option>OPEN</option>
            <option>CLOSED</option>
            <option>REFLECTED</option>
          </select>
          <div className='grid grid-cols-2 gap-2'>
            <OperationAction intent='surveyStatus' label={t('actions.updateStatus')} />
            <OperationAction intent='finalizeRanking' label={t('actions.finalizeRanking')} />
          </div>
        </fetcher.Form>
      </OperationPanel>
      <OperationPanel icon={BarChart3} title={t('operations.offlineVoteEntries')}>
        <fetcher.Form method='post' className='grid gap-3'>
          <SurveySelect items={surveys} />
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
      </OperationPanel>
    </OperationsLayout>
  )
}

function SurveySelect({ items }: { items: SurveyPeriodResDtoOutput[] }) {
  return (
    <select name='surveyId' required className={operationInput}>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          #{item.issueNumber} · {item.status}
        </option>
      ))}
    </select>
  )
}
