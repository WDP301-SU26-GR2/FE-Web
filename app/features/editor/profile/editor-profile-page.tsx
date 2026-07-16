import { useFetcher } from 'react-router'
import { UserRoundCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StaffProfileResDtoOutput } from '~/api/model/users'
import type { EditorActionResult } from '../types'

const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground'
export function EditorProfilePage({ profile }: { profile: StaffProfileResDtoOutput }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()
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
      <fetcher.Form method='post' className='grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm'>
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
        <button className='h-10 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground'>
          {t('actions.saveProfile')}
        </button>
        {fetcher.data && (
          <p className={fetcher.data.ok ? 'text-sm text-primary' : 'text-sm text-destructive'}>
            {fetcher.data.ok ? t('messages.operationCompleted') : t('errors.actionFailed')}
          </p>
        )}
      </fetcher.Form>
    </div>
  )
}
