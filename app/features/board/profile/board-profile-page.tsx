import { useFetcher } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { StaffProfileResDtoOutput } from '~/api/model/users'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel } from '../components/board-ui'
import type { BoardActionResult } from '../types'

export function BoardProfilePage({ profile }: { profile: StaffProfileResDtoOutput }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()
  return (
    <div className='mx-auto max-w-3xl space-y-6 pb-12'>
      <BoardHeader title={t('profile.title')} description={t('profile.description')} />
      <BoardPanel title={t('profile.form')}>
        <fetcher.Form method='post' className='grid gap-4'>
          <label className='grid gap-2 text-sm font-bold'>
            {t('profile.genres')}
            <input className={boardInput} name='specialtyGenres' defaultValue={profile.specialtyGenres.join(', ')} />
          </label>
          <label className='grid gap-2 text-sm font-bold'>
            {t('profile.demographics')}
            <input className={boardInput} name='demographics' defaultValue={profile.demographics.join(', ')} />
          </label>
          <label className='grid gap-2 text-sm font-bold'>
            {t('profile.experience')}
            <input
              className={boardInput}
              name='yearsOfExperience'
              type='number'
              min={0}
              max={80}
              defaultValue={profile.yearsOfExperience ?? 0}
            />
          </label>
          <label className='grid gap-2 text-sm font-bold'>
            {t('profile.bio')}
            <textarea className={`${boardInput} min-h-32 py-2`} name='bio' defaultValue={profile.bio ?? ''} />
          </label>
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('profile.save')}
          </button>
        </fetcher.Form>
        <BoardFeedback data={fetcher.data} />
      </BoardPanel>
    </div>
  )
}
