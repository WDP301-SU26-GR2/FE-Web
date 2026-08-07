import { useState } from 'react'
import { useFetcher } from 'react-router'
import { Pencil, UserRoundCog } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { StaffProfileResDtoOutput } from '~/api/model/users'
import type { EditorActionResult } from '../types'
import { EditorActionToast } from '../components/editor-action-toast'
import { Dialog } from '~/shared/ui/dialog'

const input = 'h-10 min-w-0 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground'
const dialogButton = 'inline-flex h-10 w-full items-center justify-center rounded-md px-4 text-xs font-bold sm:w-auto'
const profileDialogFieldClass = 'grid min-w-0 grid-rows-[2.5rem_auto] gap-2 text-xs font-bold text-foreground'
const profileDialogFieldLabelClass = 'flex min-h-10 items-end leading-5'
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
        <h1 className='mt-2 text-2xl font-bold text-foreground'>{t('profile.title')}</h1>
        <p className='mt-2 text-xs text-muted-foreground'>{t('profile.subtitle')}</p>
      </header>
      <section className='rounded-xl border border-border bg-card p-6 shadow-sm'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <ProfileValue
            label={t('profile.genres')}
            value={
              profile.specialtyGenres
                .map((value) => t(`common:businessData.values.${value}`, { defaultValue: value }))
                .join(', ') || '—'
            }
          />
          <ProfileValue
            label={t('profile.demographics')}
            value={
              profile.demographics
                .map((value) => t(`common:businessData.values.${value}`, { defaultValue: value }))
                .join(', ') || '—'
            }
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
      </section>
      {editOpen && <EditorProfileDialog profile={profile} onClose={() => setEditOpen(false)} />}
    </div>
  )
}

function EditorProfileDialog({ profile, onClose }: { profile: StaffProfileResDtoOutput; onClose: () => void }) {
  const { t } = useTranslation('editor')
  const fetcher = useFetcher<EditorActionResult>()

  return (
    <Dialog compact open onClose={onClose} titleId='edit-editor-profile' title={t('profile.edit')} size='lg'>
      <fetcher.Form method='post' className='grid gap-4'>
        <label className={profileDialogFieldClass}>
          <span className={profileDialogFieldLabelClass}>{t('profile.genres')}</span>
          <input name='specialtyGenres' defaultValue={profile.specialtyGenres.join(', ')} className={input} />
        </label>
        <label className={profileDialogFieldClass}>
          <span className={profileDialogFieldLabelClass}>{t('profile.demographics')}</span>
          <input name='demographics' defaultValue={profile.demographics.join(', ')} className={input} />
        </label>
        <label className={profileDialogFieldClass}>
          <span className={profileDialogFieldLabelClass}>{t('profile.experience')}</span>
          <input
            name='yearsOfExperience'
            type='number'
            min={0}
            max={80}
            defaultValue={profile.yearsOfExperience ?? 0}
            className={input}
          />
        </label>
        <label className={profileDialogFieldClass}>
          <span className={profileDialogFieldLabelClass}>{t('profile.bio')}</span>
          <textarea
            name='bio'
            defaultValue={profile.bio ?? ''}
            className='min-h-32 min-w-0 w-full rounded-md border border-input bg-background p-3 text-xs text-foreground'
          />
        </label>
        <div className='flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onClose}
            className={`${dialogButton} border border-border`}
          >
            {t('actions.cancel')}
          </button>
          <button className={`${dialogButton} bg-primary text-primary-foreground`}>
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
      <p className='mt-1 whitespace-pre-wrap text-xs text-foreground'>{value}</p>
    </div>
  )
}
