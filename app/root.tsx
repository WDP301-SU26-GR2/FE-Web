import { useEffect } from 'react'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'

import { AppProviders, themeInitScript } from '~/providers/app-providers'
import { SITE } from '~/shared/config/site'
import { resolveDocumentTitle } from '~/shared/config/document-titles'

import type { Route } from './+types/root'
import './styles/app.css'

export function meta() {
  return [{ title: SITE.name }, { name: 'description', content: SITE.description }]
}

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: SITE.logoUrl },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous'
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
  }
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={SITE.defaultLocale} suppressHydrationWarning>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
        {/* Áp class `dark` trước hydrate để tránh nhấp nháy màu sai */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <AppProviders>
      <DocumentTitle />
      <Outlet />
    </AppProviders>
  )
}

function DocumentTitle() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = resolveDocumentTitle(pathname)
  }, [pathname])

  return null
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { t } = useTranslation('common')
  let message = t('errorBoundary.title')
  let details = t('errorBoundary.messageGeneric')
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : t('errorBoundary.title')
    details = error.status === 404 ? t('errorBoundary.message404') : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
    stack = error.stack
  } else if (error && typeof error === 'object' && 'message' in error) {
    details = String((error as { message: unknown }).message)
  }

  return (
    <main className='container mx-auto p-4 pt-16'>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className='w-full overflow-x-auto p-4'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
