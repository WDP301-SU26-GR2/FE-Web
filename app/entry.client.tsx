import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

import { env } from '~/shared/config/env'

/**
 * Khởi động MSW browser worker TRƯỚC khi hydrate React.
 * Chỉ chạy khi VITE_ENABLE_MOCK=true (dev only).
 * Dynamic import để MSW code bị tree-shake hoàn toàn trong production build.
 */
async function prepare() {
  if (env.ENABLE_MOCK) {
    try {
      const { worker } = await import('~/mocks/browser')
      await worker.start({
        onUnhandledRequest: 'bypass', // request không có handler → pass through bình thường
        serviceWorker: { url: '/mockServiceWorker.js' }
      })
      console.info('[MSW] Mock server started')
    } catch (error) {
      console.error('[MSW] Failed to start mock server. Continue hydrating app.', error)
    }
  }
}

function hydrateApp() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    )
  })
}

if (env.ENABLE_MOCK) {
  // Không để MSW chặn hydrate vô hạn (một số môi trường có thể làm worker.start treo).
  Promise.race([
    prepare(),
    new Promise<void>((resolve) => setTimeout(resolve, 1500))
  ]).finally(hydrateApp)
} else {
  hydrateApp()
}
