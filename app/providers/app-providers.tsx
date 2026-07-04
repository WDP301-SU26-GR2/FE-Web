import { AuthProvider } from '~/features/auth/context/auth-context'
import { DevInspector } from './dev-inspector'
import { I18nProvider } from './i18n-provider'
import { ThemeProvider } from './theme-provider'
import { ToastProvider } from './toast-provider'

/**
 * Compose tất cả provider cấp ứng dụng. Dùng đúng 1 lần ở root.tsx.
 * Khi thêm provider mới (vd: QueryClientProvider)
 * gắn ở đây — KHÔNG gắn rải rác ở route con.
 *
 * Thứ tự lồng provider quan trọng: provider phụ thuộc vào cái nào thì
 * đặt cái đó ra ngoài.
 *   - ThemeProvider  → outermost, sets <html> class early via init script
 *   - ToastProvider  → outside I18nProvider so toast messages can be
 *                      translated when fired
 *   - I18nProvider   → wraps children so useTranslation() works app-wide
 *   - AuthProvider   → outermost meaningful provider; needs Theme (no),
 *                      Toast (to surface login errors) and I18n (so
 *                      session UI can translate "Logout" etc.)
 *   - DevInspector   → no-op in production; mounts the click-to-source
 *                      overlay only when NODE_ENV !== 'production'
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <I18nProvider>
          <AuthProvider>
            {children}
            <DevInspector />
          </AuthProvider>
        </I18nProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}

export { themeInitScript } from './theme-provider'
