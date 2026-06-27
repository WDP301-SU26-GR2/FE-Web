import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { STORAGE_KEYS } from '~/shared/config/site'
import { readStorage, writeStorage } from '~/shared/lib/storage'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark'
}

function resolveInitialTheme(defaultTheme: Theme): Theme {
  const storedTheme = readStorage(STORAGE_KEYS.theme)
  if (isTheme(storedTheme)) return storedTheme

  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return defaultTheme
}

function applyThemeClass(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function ThemeProvider({
  children,
  defaultTheme = 'light'
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const initialTheme = resolveInitialTheme(defaultTheme)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(initialTheme)
    setHydrated(true)
  }, [defaultTheme])

  useEffect(() => {
    if (!hydrated) return

    applyThemeClass(theme)
    writeStorage(STORAGE_KEYS.theme, theme)
  }, [hydrated, theme])

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme
    }),
    [setTheme, theme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return context
}

export const themeInitScript = `
(function () {
  try {
    var key = "${STORAGE_KEYS.theme}";
    var stored = localStorage.getItem(key);
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var theme = stored === "light" || stored === "dark" ? stored : (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (_) {}
})();
`
