import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

/**
 * MSW browser worker — intercept fetch/XHR requests ở tầng Service Worker.
 * Khởi động trong app/entry.client.tsx chỉ khi VITE_ENABLE_MOCK=true.
 */
export const worker = setupWorker(...handlers)
