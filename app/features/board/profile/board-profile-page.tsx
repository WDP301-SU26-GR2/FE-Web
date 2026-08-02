import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  StaffProfileBodyDtoDemographicsItem,
  StaffProfileBodyDtoSpecialtyGenresItem,
  type StaffProfileResDtoOutput
} from '~/api/model/users'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel } from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'

export function BoardProfilePage({ profile }: { profile: StaffProfileResDtoOutput }) {
  const { t } = useTranslation('board')
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className='mx-auto max-w-3xl space-y-6 pb-12'>
      <BoardHeader title={t('profile.title')} description={t('profile.description')} backHref='/dashboard/board' />
      <BoardPanel title={t('profile.form')}>
        <div className='grid gap-4 sm:grid-cols-2'>
          <ProfileValue
            label={t('profile.genres')}
            value={profile.specialtyGenres.map((value) => t(`profile.genreValues.${value}`)).join(', ') || '—'}
          />
          <ProfileValue
            label={t('profile.demographics')}
            value={profile.demographics.map((value) => t(`profile.demographicValues.${value}`)).join(', ') || '—'}
          />
          <ProfileValue label={t('profile.experience')} value={String(profile.yearsOfExperience ?? 0)} />
          <ProfileValue label={t('profile.bio')} value={profile.bio || '—'} />
        </div>
        <button
          type='button'
          onClick={() => setEditOpen(true)}
          className='mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'
        >
          <Pencil className='size-4' />
          {t('profile.edit')}
        </button>
      </BoardPanel>
      {editOpen && <BoardProfileDialog profile={profile} onClose={() => setEditOpen(false)} />}
    </div>
  )
}

function BoardProfileDialog({ profile, onClose }: { profile: StaffProfileResDtoOutput; onClose: () => void }) {
  const { t } = useTranslation('board')
  const fetcher = useFetcher<BoardActionResult>()

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) onClose()
  }, [fetcher.data, fetcher.state, onClose])

  return (
    <Dialog compact open onClose={onClose} titleId='edit-board-profile' title={t('profile.edit')} size='lg'>
      <fetcher.Form method='post' className='grid gap-4'>
        <fieldset className='grid gap-2 text-xs'>
          <legend className='font-bold'>{t('profile.genres')}</legend>
          <div className='grid gap-2 sm:grid-cols-2'>
            {Object.values(StaffProfileBodyDtoSpecialtyGenresItem).map((value) => (
              <label key={value} className='flex items-center gap-2 rounded-md border border-border p-2'>
                <input
                  type='checkbox'
                  name='specialtyGenres'
                  value={value}
                  defaultChecked={profile.specialtyGenres.includes(value)}
                />
                <span>{t(`profile.genreValues.${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className='grid gap-2 text-xs'>
          <legend className='font-bold'>{t('profile.demographics')}</legend>
          <div className='grid gap-2 sm:grid-cols-2'>
            {Object.values(StaffProfileBodyDtoDemographicsItem).map((value) => (
              <label key={value} className='flex items-center gap-2 rounded-md border border-border p-2'>
                <input
                  type='checkbox'
                  name='demographics'
                  value={value}
                  defaultChecked={profile.demographics.includes(value)}
                />
                <span>{t(`profile.demographicValues.${value}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className='grid gap-2 text-xs font-bold'>
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
        <label className='grid gap-2 text-xs font-bold'>
          {t('profile.bio')}
          <textarea
            className={`${boardInput} min-h-32 py-2`}
            name='bio'
            maxLength={2000}
            defaultValue={profile.bio ?? ''}
          />
        </label>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 rounded-md border border-border px-4 text-xs font-bold'
          >
            {t('profile.cancel')}
          </button>
          <button className='h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground'>
            {t('profile.save')}
          </button>
        </div>
      </fetcher.Form>
      <BoardFeedback data={fetcher.data} />
    </Dialog>
  )
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg bg-muted/50 p-3'>
      <p className='text-xs font-bold text-muted-foreground'>{label}</p>
      <p className='mt-1 whitespace-pre-wrap text-xs text-foreground'>{value}</p>
    </div>
  )
}
