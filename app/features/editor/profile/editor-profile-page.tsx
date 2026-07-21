import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Pencil, UserRoundCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StaffProfileResDtoOutput } from '~/api/model/users'
import type { EditorActionResult } from '../types'
import { EditorActionToast } from '../components/editor-action-toast'
import { Dialog } from '~/shared/ui/dialog'

const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'
export function EditorProfilePage({ profile }: { profile: StaffProfileResDtoOutput }) {
  const { t } = useTranslation('editor')
  const [editOpen, setEditOpen] = useState(false)
  return (
    <div className='mx-auto max-w-3xl space-y-6 pb-12'>
      <header>
        <p className='flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary'>
          <UserRoundCog className='size-4' />
          {t('profile.eyebrow')}
        </p>
        <h1 className='mt-2 text-3xl font-bold text-foreground'>{t('profile.title')}</h1>
        <p className='mt-2 text-sm text-muted-foreground'>{t('profile.subtitle')}</p>
      </header>
      <section className='rounded-xl border border-border bg-card p-6 shadow-sm'>
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
      </section>
      {editOpen && <EditorProfileDialog profile={profile} onClose={() => setEditOpen(false)} />}
    </div>
  )
}

function EditorProfileDialog({ profile, onClose }: { profile: StaffProfileResDtoOutput; onClose: () => void }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()

  return (
    <Dialog open onClose={onClose} titleId='edit-editor-profile' title={t('profile.edit')} size='lg'>
      <fetcher.Form method='post' className='grid gap-4'>
        <label className='text-sm font-bold text-foreground'>
          {t('profile.genres')}
          <input name='specialtyGenres' defaultValue={profile.specialtyGenres.join(', ')} className={`${input} mt-2`} />
        </label>
        <label className='text-sm font-bold text-foreground'>
          {t('profile.demographics')}
          <input name='demographics' defaultValue={profile.demographics.join(', ')} className={`${input} mt-2`} />
        </label>
        <label className='text-sm font-bold text-foreground'>
          {t('profile.experience')}
          <input
            name='yearsOfExperience'
            type='number'
            min={0}
            max={80}
            defaultValue={profile.yearsOfExperience ?? 0}
            className={`${input} mt-2`}
          />
        </label>
        <label className='text-sm font-bold text-foreground'>
          {t('profile.bio')}
          <textarea
            name='bio'
            defaultValue={profile.bio ?? ''}
            className='mt-2 min-h-32 w-full rounded-md border border-input bg-background p-3 text-sm text-foreground'
          />
        </label>
        <div className='flex justify-end gap-2 border-t border-border pt-4'>
          <button type='button' onClick={onClose} className='h-10 rounded-md border border-border px-4 text-sm font-bold'>
            {t('actions.cancel')}
          </button>
          <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
            {t('actions.saveProfile')}
          </button>
        </div>
        <EditorActionToast data={fetcher.data} scope='editor-profile' closeOnSuccess />
      </fetcher.Form>
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
