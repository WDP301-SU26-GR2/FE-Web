import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import {
  fetchMyProfile,
  readProfileError,
  type MyProfileData,
  type ProfileMode
} from './api/profile-api'

import { ProfileView } from './components/profile-view'
import { ProfileEditForm } from './components/profile-edit-form'

type LoaderOutcome =
  | { kind: 'ready'; data: MyProfileData }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }

type LoaderResult =
  | { status: 'loading' }
  | { status: 'ready'; outcome: LoaderOutcome }

const EMPTY_MANGAKA: MyProfileData = {
  mode: 'mangaka',
  data: {
    userId: '',
    penName: null,
    genres: [],
    experienceLevel: null,
    bio: null,
    portfolioFiles: [],
    reputationScore: 0,
    ratingAvg: 0,
    ratingCount: 0,
    isRecommended: false,
    displayName: null,
    avatar: null,
    hasProfile: false
  }
}

const EMPTY_ASSISTANT: MyProfileData = {
  mode: 'assistant',
  data: {
    userId: '',
    specializations: [],
    experienceLevel: null,
    portfolioFiles: [],
    availabilityStatus: null,
    availabilityFrom: null,
    availabilityTo: null,
    reputationScore: 0,
    ratingAvg: 0,
    ratingCount: 0,
    isRecommended: false,
    displayName: null,
    avatar: null,
    hasProfile: false
  }
}

/**
 * `/dashboard/mangaka/profile` and `/dashboard/assistant/profile` both render
 * this page. The route supplies the role; everything else (load, view,
 * edit) is identical.
 * The page drives its own data via `useState` + `useEffect` rather than a
 * route loader — this keeps the page embeddable from any layout and avoids
 * coupling to RR7's loader contract. If you later want SSR data here, swap
 * this for `useLoaderData()`.
 */
export function MyProfilePage({ mode }: { mode: ProfileMode }) {
  const { t } = useTranslation('profile')
  const [result, setResult] = useState<LoaderResult>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult({ status: 'loading' })
    void (async () => {
      try {
        const data = await fetchMyProfile(mode)
        if (cancelled) return
        if (!data) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setResult({ status: 'ready', outcome: { kind: 'empty' } })
        } else {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setResult({ status: 'ready', outcome: { kind: 'ready', data } })
        }
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        // 404 = profile row hasn't been created yet (BE-A "lazy profile").
        if (status === 404) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setResult({ status: 'ready', outcome: { kind: 'empty' } })
          return
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResult({
          status: 'ready',
          outcome: {
            kind: 'error',
            message: readProfileError(err, t('errors.loadGeneric'))
          }
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, reloadKey, t])

  if (result.status === 'loading') {
    return (
      <div className='flex h-full items-center justify-center p-12'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (result.outcome.kind === 'error') {
    return (
      <div className='rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive'>
        {t('loadError', { message: result.outcome.message })}
      </div>
    )
  }

  const data =
    result.outcome.kind === 'ready'
      ? result.outcome.data
      : mode === 'mangaka'
        ? EMPTY_MANGAKA
        : EMPTY_ASSISTANT

  return (
    <div className='mx-auto w-full max-w-5xl'>
      {isEditing ? (
        <ProfileEditForm
          mode={mode}
          data={data.data}
          onCancel={() => setIsEditing(false)}
          onSaved={() => {
            setReloadKey((k) => k + 1)
            setIsEditing(false)
          }}
        />
      ) : (
        <ProfileView mode={mode} data={data.data} onEdit={() => setIsEditing(true)} />
      )}
    </div>
  )
}