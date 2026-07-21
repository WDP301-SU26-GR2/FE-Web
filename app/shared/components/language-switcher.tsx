import { useTranslation } from 'react-i18next'

import { cn } from '~/shared/lib/cn'
import { SUPPORTED_LANGUAGES, type Language } from '~/shared/lib/i18n'

const LABEL: Record<Language, string> = {
  en: 'EN',
  vi: 'VI'
}

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = (i18n.resolvedLanguage ?? 'vi') as Language

  return (
    <div
      hidden
      role='group'
      aria-label={t('language')}
      className='inline-flex items-center rounded-full border border-border bg-card p-0.5 text-sm dark:border-white/20 dark:bg-white/10'
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = lng === current
        return (
          <button
            key={lng}
            type='button'
            onClick={() => i18n.changeLanguage(lng)}
            aria-pressed={active}
            className={cn(
              'h-8 min-w-9 rounded-full px-3 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-ring dark:focus:ring-white/50',
              active
                ? 'bg-primary text-primary-foreground dark:bg-white/20 dark:text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5'
            )}
          >
            {LABEL[lng]}
          </button>
        )
      })}
    </div>
  )
}
