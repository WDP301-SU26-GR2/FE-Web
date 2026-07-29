import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { fetchAccountInfo, readProfileError, type AccountInfo } from './api/profile-api'
import { AccountEditSection } from './components/account-edit-section'
import { AccountInfoSection } from './components/account-info-section'

type State = { status: 'loading' } | { status: 'ready'; data: AccountInfo } | { status: 'error'; message: string }

/** Account-only profile for authenticated roles without a role-specific profile. */
export function AccountProfilePage() {
  const { t } = useTranslation('profile')
  const [state, setState] = useState<State>({ status: 'loading' })
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetchAccountInfo()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: readProfileError(error, t('errors.loadGeneric')) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  if (state.status === 'loading') {
    return (
      <div className='flex min-h-64 items-center justify-center'>
        <Loader2 className='size-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className='rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive'>
        {t('loadError', { message: state.message })}
      </div>
    )
  }

  return (
    <div className='mx-auto w-full max-w-4xl'>
      {editing ? (
        <AccountEditSection
          data={state.data}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            if (updated) setState({ status: 'ready', data: updated })
            setEditing(false)
          }}
        />
      ) : (
        <AccountInfoSection data={state.data} onEdit={() => setEditing(true)} />
      )}
    </div>
  )
}
