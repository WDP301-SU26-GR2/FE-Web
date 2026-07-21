import { useTranslation } from 'react-i18next'

import { LanguageSwitcher, ThemeToggle } from '~/shared/components'
import { BrandLogo } from '~/shared/components/brand-logo'

export function WelcomeHeader() {
  const { t } = useTranslation('common')
  return (
    <header className='absolute top-0 z-20 flex w-full items-center justify-between px-6 py-4'>
      <div className='flex items-center gap-3'>
        <BrandLogo className='h-10 w-10 rounded-lg shadow-sm' />
        <span className='text-xl font-bold tracking-tight text-foreground drop-shadow-sm'>{t('appName')}</span>
      </div>
      <div className='flex items-center gap-3'>
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  )
}
