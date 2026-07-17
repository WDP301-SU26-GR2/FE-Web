import { useTranslation } from 'react-i18next'
import { ImageOff, Loader2 } from 'lucide-react'

import { cn } from '~/shared/lib/cn'

/**
 * Centered spinner with `publication.loading` text. Used by every async layout
 * while the primary record (chapter / series / etc.) is being fetched.
 */
export function LoadingScreen() {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex min-h-screen items-center justify-center bg-background text-muted-foreground'>
      <div className='flex flex-col items-center gap-3'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <p className='text-sm'>{t('publication.loading')}</p>
      </div>
    </div>
  )
}

/**
 * Centered "not found" placeholder. The button navigates to `backHref` — must be
 * a route within the SPA (use `<Link>` via the `as` prop if it ever needs to be
 * a non-anchor; currently we use raw `<a>` because routes are real URLs too).
 */
export function NotFoundView({
  backHref,
  description
}: {
  backHref: string
  /** i18n key under `mangaka.publication.*` namespace. */
  description?: string
}) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-6 text-foreground'>
      <div className='flex max-w-md flex-col items-center gap-3 text-center'>
        <ImageOff className='h-12 w-12 text-muted-foreground/40' />
        <h2 className='text-lg font-semibold'>{t('publication.notFound.title')}</h2>
        <p className='text-sm text-muted-foreground'>
          {t(description ?? 'publication.notFound.description')}
        </p>
        <a
          href={backHref}
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
          )}
        >
          {t('publication.notFound.back')}
        </a>
      </div>
    </div>
  )
}

export function ErrorScreen({
  backHref,
  message,
  onRetry
}: {
  backHref: string
  message: string
  onRetry: () => void
}) {
  const { t } = useTranslation('mangaka')
  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-6 text-foreground'>
      <div className='mx-auto flex max-w-md flex-col items-center gap-3 text-center'>
        <div
          role='alert'
          className='w-full rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive'
        >
          {message}
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onRetry}
            className='cursor-pointer rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium hover:bg-muted'
          >
            {t('publication.error.retry')}
          </button>
          <a
            href={backHref}
            className={cn(
              'rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90'
            )}
          >
            {t('publication.notFound.back')}
          </a>
        </div>
      </div>
    </div>
  )
}
