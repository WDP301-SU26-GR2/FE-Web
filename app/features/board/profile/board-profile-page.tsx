import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'
import { Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StaffProfileResDtoOutput } from '~/api/model/users'
import { boardInput, BoardFeedback, BoardHeader, BoardPanel } from '../components/board-ui'
import type { BoardActionResult } from '../types'
import { Dialog } from '~/shared/ui/dialog'

export function BoardProfilePage({ profile }: { profile: StaffProfileResDtoOutput }) {
  const { t } = useTranslation('board')
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className='mx-auto max-w-3xl space-y-6 pb-12'>
      <BoardHeader title={t('profile.title')} description={t('profile.description')} />
      <BoardPanel title={t('profile.form')}>
        <div className='grid gap-4 sm:grid-cols-2'>
          <ProfileValue label={t('profile.genres')} value={profile.specialtyGenres.join(', ') || '—'} />
          <ProfileValue label={t('profile.demographics')} value={profile.demographics.join(', ') || '—'} />
          <ProfileValue label={t('profile.experience')} value={String(profile.yearsOfExperience ?? 0)} />
          <ProfileValue label={t('profile.bio')} value={profile.bio || '—'} />
        </div>
        <button
          type='button'
          onClick={() => setEditOpen(true)}
          className='mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'
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
    <Dialog open onClose={onClose} titleId='edit-board-profile' title={t('profile.edit')} size='lg'>
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
          <div className='flex justify-end gap-2 border-t border-border pt-4'>
            <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>
              {t('profile.cancel')}
            </button>
            <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
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
      <p className='mt-1 whitespace-pre-wrap text-sm text-foreground'>{value}</p>
    </div>
  )
}
