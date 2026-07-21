import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import {
  fetchMyProfile,
  readProfileError,
  type MyProfileData,
  type ProfileMode,
  type AccountInfo
} from './api/profile-api'
import { fetchAccountInfo } from './api/profile-api'

import { ProfileView } from './components/profile-view'
import { ProfileEditForm } from './components/profile-edit-form'
import { AccountInfoSection } from './components/account-info-section'
import { AccountEditSection } from './components/account-edit-section'

type ProfileResult =
  | { kind: 'ready'; data: MyProfileData }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }

type ProfileLoadResult =
  | { status: 'loading' }
  | { status: 'ready'; outcome: ProfileResult }

type AccountResult =
  | { kind: 'ready'; data: AccountInfo }
  | { kind: 'error'; message: string }

type AccountLoadResult =
  | { status: 'loading' }
  | { status: 'ready'; outcome: AccountResult }

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

type EditMode = 'none' | 'account' | 'profile'

/**
 * `/dashboard/mangaka/profile` and `/dashboard/assistant/profile` both render
 * this page. The route supplies the role; everything else (load, view,
 * edit) is identical.
 *
 * Displays two sections:
 * - Account info (PATCH /me): name, displayName, avatar, phoneNumber, email, role, status
 * - Role-specific profile (PUT /me/{role}-profile): penName, genres, bio, etc.
 *
 * Each section has its own edit button and can be edited independently.
 */
export function MyProfilePage({ mode }: { mode: ProfileMode }) {
  const { t } = useTranslation('profile')
  const [profileResult, setProfileResult] = useState<ProfileLoadResult>({ status: 'loading' })
  const [accountResult, setAccountResult] = useState<AccountLoadResult>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [editMode, setEditMode] = useState<EditMode>('none')

  // Load role-specific profile
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileResult({ status: 'loading' })
    void (async () => {
      try {
        const data = await fetchMyProfile(mode)
        if (cancelled) return
        if (!data) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setProfileResult({ status: 'ready', outcome: { kind: 'empty' } })
        } else {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setProfileResult({ status: 'ready', outcome: { kind: 'ready', data } })
        }
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        // 404 = profile row hasn't been created yet (BE "lazy profile").
        if (status === 404) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setProfileResult({ status: 'ready', outcome: { kind: 'empty' } })
          return
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfileResult({
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

  // Load account info
  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountResult({ status: 'loading' })
    void (async () => {
      try {
        const data = await fetchAccountInfo()
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccountResult({ status: 'ready', outcome: { kind: 'ready', data } })
      } catch (err) {
        if (cancelled) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccountResult({
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
  }, [reloadKey, t])

  const isLoading = profileResult.status === 'loading' || accountResult.status === 'loading'

  if (isLoading) {
    return (
      <div className='flex h-full items-center justify-center p-12'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  // Handle profile errors
  if (profileResult.status === 'ready' && profileResult.outcome.kind === 'error') {
    return (
      <div className='rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive'>
        {t('loadError', { message: profileResult.outcome.message })}
      </div>
    )
  }

  // Handle account errors
  if (accountResult.status === 'ready' && accountResult.outcome.kind === 'error') {
    return (
      <div className='rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive'>
        {t('loadError', { message: accountResult.outcome.message })}
      </div>
    )
  }

  const profileData =
    profileResult.status === 'ready' && profileResult.outcome.kind === 'ready'
      ? profileResult.outcome.data
      : mode === 'mangaka'
        ? EMPTY_MANGAKA
        : EMPTY_ASSISTANT

  const accountData =
    accountResult.status === 'ready' && accountResult.outcome.kind === 'ready'
      ? accountResult.outcome.data
      : null

  function handleProfileSaved() {
    setReloadKey((k) => k + 1)
    setEditMode('none')
  }

  function handleAccountSaved() {
    setReloadKey((k) => k + 1)
    setEditMode('none')
  }

  return (
    <div className='mx-auto w-full max-w-5xl space-y-6'>
      {/* Account Info Section */}
      {accountData ? (
        editMode === 'account' ? (
          <AccountEditSection
            data={accountData}
            onCancel={() => setEditMode('none')}
            onSaved={handleAccountSaved}
          />
        ) : (
          <AccountInfoSection data={accountData} onEdit={() => setEditMode('account')} />
        )
      ) : (
        <div className='rounded-lg border border-border bg-card p-6'>
          <div className='flex h-20 items-center justify-center text-muted-foreground'>
            <Loader2 className='h-5 w-5 animate-spin' />
          </div>
        </div>
      )}

      {/* Role-specific Profile Section */}
      {editMode === 'profile' ? (
        <ProfileEditForm
          mode={mode}
          data={profileData.data}
          onCancel={() => setEditMode('none')}
          onSaved={handleProfileSaved}
        />
      ) : (
        <ProfileView
          mode={mode}
          data={profileData.data}
          onEdit={() => setEditMode('profile')}
        />
      )}
    </div>
  )
}