import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'

/**
 * ToastProvider — wraps Sonner's `<Toaster />` so any component in the tree
 * can fire success / error / info notifications via the `toast()` API.
 *
 * SSR caveat: Sonner manipulates the DOM on mount, which causes a
 * hydration mismatch on first paint under React Router 7's SSR. We delay
 * rendering `<Toaster />` until after the first client-side effect, so the
 * server emits no toast markup and the client renders it from scratch.
 * (See https://github.com/emilkowalski/sonner/issues/695 for the issue.)
 *
 * Mount ONCE at the app root via `AppProviders` — do not nest providers
 * inside route trees.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  // SSR hydration gate — Sonner manipulates the DOM on mount and would cause
  // a hydration mismatch under SSR. See https://github.com/emilkowalski/sonner/issues/695
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMounted(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  return (
    <>
      {children}
      {mounted ? (
        <Toaster
          richColors
          position='top-right'
          closeButton
          toastOptions={{
            duration: 4000,
            // Map Sonner's default class to our Tailwind token so toast
            // respects the dark/light theme tokens we already ship.
            classNames: {
              toast:
                'group toast bg-card text-card-foreground border border-border shadow-lg',
              description: 'text-muted-foreground',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground'
            }
          }}
        />
      ) : null}
    </>
  )
}