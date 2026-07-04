import { useTranslation } from 'react-i18next'

import { LanguageSwitcher, ThemeToggle } from '~/shared/components'

export function WelcomeHeader() {
  const { t } = useTranslation('common')
  return (
    <header className='absolute top-0 z-20 flex w-full items-center justify-between px-6 py-4'>
      <span className='text-xl font-bold tracking-tight text-foreground dark:text-white drop-shadow-sm'>{t('appName')}</span>
      <div className='flex items-center gap-3'>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
