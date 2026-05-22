import { I18nProvider } from "./i18n-provider";
import { ThemeProvider } from "./theme-provider";

/**
 * Compose tất cả provider cấp ứng dụng. Dùng đúng 1 lần ở root.tsx.
 * Khi thêm provider mới (vd: QueryClientProvider, AuthProvider, ToastProvider)
 * gắn ở đây — KHÔNG gắn rải rác ở route con.
 *
 * Thứ tự lồng provider quan trọng: provider phụ thuộc vào cái nào thì
 * đặt cái đó ra ngoài. Hiện tại Theme và i18n độc lập nhau.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  );
}

export { themeInitScript } from "./theme-provider";
