type GoogleCredentialResponse = {
  credential?: string
}

type GooglePromptNotification = {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
}

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (configuration: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
      prompt: (listener?: (notification: GooglePromptNotification) => void) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityApi
  }
}

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services'
const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

function loadGoogleIdentityServices(): Promise<GoogleIdentityApi> {
  if (window.google) return Promise.resolve(window.google)

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null
    const script = existingScript ?? document.createElement('script')

    const onLoad = () => {
      if (window.google) {
        resolve(window.google)
      } else {
        reject(new Error('Google Identity Services did not load'))
      }
    }
    const onError = () => reject(new Error('Unable to load Google Identity Services'))

    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })

    if (!existingScript) {
      script.id = GOOGLE_IDENTITY_SCRIPT_ID
      script.src = GOOGLE_IDENTITY_SCRIPT_URL
      script.async = true
      script.defer = true
      document.head.append(script)
    }
  })
}

type StartGoogleSignInOptions = {
  clientId: string
  onCredential: (idToken: string) => void
  onError: () => void
}

/** Opens Google's account chooser and passes its ID token to the caller. */
export async function startGoogleSignIn({ clientId, onCredential, onError }: StartGoogleSignInOptions): Promise<void> {
  try {
    const google = await loadGoogleIdentityServices()
    google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (credential) {
          onCredential(credential)
        } else {
          onError()
        }
      }
    })
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) onError()
    })
  } catch {
    onError()
  }
}
