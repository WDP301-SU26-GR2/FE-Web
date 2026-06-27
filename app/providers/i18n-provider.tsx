import { useEffect } from 'react'
import { I18nextProvider } from 'react-i18next'

import { STORAGE_KEYS } from '~/shared/config/site'
import i18n, { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from '~/shared/lib/i18n'
import { readStorage, writeStorage } from '~/shared/lib/storage'

function isLanguage(value: string | null | undefined): value is Language {
  return SUPPORTED_LANGUAGES.includes(value as Language)
}

function detectInitialLanguage(): Language {
  const stored = readStorage(STORAGE_KEYS.language)
  if (isLanguage(stored)) return stored

  if (typeof navigator !== 'undefined') {
    const candidates = [...navigator.languages, navigator.language]
      .filter(Boolean)
      .map((value) => value.toLowerCase().split('-')[0])

    const matched = candidates.find((value): value is Language => SUPPORTED_LANGUAGES.includes(value as Language))

    if (matched) return matched
  }

  return FALLBACK_LANGUAGE
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const initialLanguage = detectInitialLanguage()

    if (i18n.language !== initialLanguage) {
      void i18n.changeLanguage(initialLanguage)
    }

    const syncLanguage = (language: string) => {
      if (!isLanguage(language)) return
      document.documentElement.lang = language
      writeStorage(STORAGE_KEYS.language, language)
    }

    syncLanguage(i18n.resolvedLanguage ?? i18n.language)
    i18n.on('languageChanged', syncLanguage)

    return () => {
      i18n.off('languageChanged', syncLanguage)
    }
  }, [])

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
